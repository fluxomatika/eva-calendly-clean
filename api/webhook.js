// api/webhook.js - EVA Follow-up Webhook System with Retell AI Integration

// Função para simular o salvamento de dados do lead (mantida para log/futuro CRM)
async function saveLeadData(leadData) {
  try {
    console.log("💾 Salvando lead:", leadData.email);
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    console.log("Lead data (simulated save):", JSON.stringify(leadData, null, 2));
    leadData.internal_id = leadId; // Adiciona um ID interno para referência
    return { status: "saved_simulated", lead_id: leadId };
  } catch (error) {
    console.error("❌ Save Error (Simulated):", error);
    throw error;
  }
}

// Função para simular a atualização de status do lead (mantida para log/futuro CRM)
async function updateLeadStatus(email, status, additionalData = {}) {
  try {
    console.log(`📊 [SIMULATED] Atualizando status: ${email} → ${status}`);
    const updateData = {
      email,
      status,
      updated_at: new Date().toISOString(),
      ...additionalData
    };
    console.log("Update data (simulated):", JSON.stringify(updateData, null, 2));
    // Aqui iria a lógica de atualização no Airtable/CRM
    return { status: "updated_simulated" };
  } catch (error) {
    console.error("❌ Update Status Error (Simulated):", error);
    throw error;
  }
}

// Função para iniciar a chamada via Retell AI API
async function initiateRetellCall(leadData) {
  console.log("📞 === INICIANDO CHAMADA VIA RETELL AI ===");
  try {
    // Verificar variáveis de ambiente essenciais do Retell
    if (!process.env.RETELL_API_KEY) {
      throw new Error("Variável de ambiente RETELL_API_KEY não configurada.");
    }
    if (!process.env.RETELL_AGENT_ID) {
      throw new Error("Variável de ambiente RETELL_AGENT_ID não configurada.");
    }
    if (!process.env.RETELL_FROM_NUMBER) {
      throw new Error("Variável de ambiente RETELL_FROM_NUMBER não configurada.");
    }
    console.log("✅ Credenciais Retell AI verificadas (presença).");

    // Validar e formatar telefone do lead
    let toPhoneNumber = leadData.phone;
    if (!toPhoneNumber) {
      toPhoneNumber = process.env.FALLBACK_PHONE_NUMBER; // Usa fallback se não houver telefone
      console.warn(`⚠️ Telefone do lead ausente. Usando fallback: ${toPhoneNumber}`);
      if (!toPhoneNumber) {
        throw new Error("Telefone do lead e telefone fallback estão ausentes.");
      }
    }
    // Garante formato E.164 (+55...)
    if (toPhoneNumber && !toPhoneNumber.startsWith("+")) {
        // Remove non-digits and add +55 if it looks like a Brazilian number
        const digits = toPhoneNumber.replace(/\D/g, '');
        if (digits.length >= 10 && digits.length <= 11) { // Basic check for Brazilian number length
             toPhoneNumber = `+55${digits}`;
        } else {
            // Attempt to add '+' if it's missing, assuming international format otherwise
            toPhoneNumber = `+${digits}`; 
        }
    }
    console.log(`📞 Telefone formatado para Retell: ${toPhoneNumber}`);

    // Montar payload para a API Retell
    const retellPayload = {
      agent_id: process.env.RETELL_AGENT_ID,
      from_number: process.env.RETELL_FROM_NUMBER,
      to_number: toPhoneNumber,
      retell_llm_dynamic_variables: {
        lead_name: leadData.name,
        lead_interest: leadData.interest || "serviços da Evolua" // Fallback para interesse
        // Adicionar outras variáveis dinâmicas conforme necessário pelo prompt do agente
      },
      metadata: {
        lead_email: leadData.email,
        lead_source: leadData.source,
        webhook_timestamp: leadData.received_at,
        internal_lead_id: leadData.internal_id
      }
      // Adicionar outros parâmetros opcionais da API Retell aqui, se necessário
    };

    console.log("📦 Payload para Retell API:", JSON.stringify(retellPayload, null, 2));

    // Chamar a API Retell AI
    console.log("🌐 Chamando Retell AI API (POST /v2/create-phone-call)...");
    const response = await fetch("https://api.retellai.com/v2/create-phone-call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RETELL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(retellPayload)
    });

    const responseBody = await response.json();
    console.log(`🚦 Status da resposta Retell AI: ${response.status}`);
    console.log("📄 Resposta Retell AI:", JSON.stringify(responseBody, null, 2));

    // Tratar resposta
    if (!response.ok) {
      // Erro na API Retell
      throw new Error(`Erro na API Retell AI: ${response.status} - ${JSON.stringify(responseBody)}`);
    }

    // Sucesso ao iniciar a chamada
    const callId = responseBody.call_id;
    console.log(`✅ Chamada Retell AI iniciada com sucesso! Call ID: ${callId}`);
    await updateLeadStatus(leadData.email, "retell_call_initiated", { retell_call_id: callId });

    console.log("📞 === CHAMADA RETELL AI INICIADA ===");
    return { status: "retell_call_initiated", call_id: callId };

  } catch (error) {
    console.error("❌ ERRO AO INICIAR CHAMADA RETELL AI:", error);
    await updateLeadStatus(leadData.email, "retell_call_failed", { error_message: error.message });
    // Considerar fallback (ex: WhatsApp simulado) ou apenas registrar o erro
    // await sendWhatsAppFollowup(leadData); // Descomentar se o fallback for desejado
    return { status: "retell_call_failed", error: error.message };
  }
}

// Função para simular o envio do WhatsApp de backup (mantida como possível fallback)
async function sendWhatsAppFollowup(leadData) {
  try {
    console.log(`💬 [SIMULATED] Enviando WhatsApp backup para: ${leadData.name} (${leadData.phone || 'sem telefone'})`);
    const message = `
Oi ${leadData.name}! 👋

Vi que você se interessou por ${leadData.interest ? leadData.interest.toLowerCase() : 'nossos serviços'} na Evolua.

Não consegui falar com você por telefone, mas que tal conversarmos sobre seu projeto?

Posso tentar ligar novamente ou prefere agendar um horário? 📞

*Eva - Consultora Evolua*
    `.trim();
    console.log("💬 Mensagem WhatsApp simulada:", message);
    await updateLeadStatus(leadData.email, "whatsapp_sent_simulated");
    return { status: "whatsapp_sent_simulated", message_preview: message.substring(0, 100) };
  } catch (error) {
    console.error("❌ WhatsApp Error (Simulated):", error);
    throw error;
  }
}

// Função principal para acionar o fluxo de follow-up (agora com Retell)
async function triggerEvaFollowup(leadData) {
  try {
    console.log(`⚡ TRIGGERING EVA FOLLOW-UP (Retell AI) for: ${leadData.name}`);

    // 1. Salvar lead (simulado)
    await saveLeadData(leadData);

    // 2. Iniciar chamada Retell AI imediatamente
    console.log("▶️ Iniciando chamada Retell AI...");
    const callResult = await initiateRetellCall(leadData);
    console.log("🏁 Resultado da iniciação da chamada Retell:", callResult);

    // 3. Agendar Backup WhatsApp (opcional, mantido por enquanto)
    console.log("⏳ Agendando WhatsApp backup em 30 minutos (fallback/informativo)...");
    setTimeout(async () => {
      console.log(`⏰ Tempo esgotado! Verificando necessidade de WhatsApp backup para: ${leadData.name}`);
      // Poderia haver lógica aqui para verificar se a chamada Retell foi bem sucedida antes de enviar
      // Por ora, apenas simula o envio agendado.
      await sendWhatsAppFollowup(leadData);
    }, 30 * 60 * 1000); // 30 minutos

    return { 
        retell_call_status: callResult.status, 
        retell_call_id: callResult.call_id, 
        error: callResult.error, 
        whatsapp_backup_scheduled: true 
    };

  } catch (error) {
    console.error("❌ Trigger Error (Retell Flow):", error);
    return { error: true, message: error.message, retell_call_status: 'trigger_failed', whatsapp_backup_scheduled: false };
  }
}

// Handler principal do webhook
module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Log da requisição
  console.log(`[${new Date().toISOString()}] Retell AI Webhook Received`);
  console.log('Method:', req.method);
  // console.log('Headers:', req.headers); // Omitir headers por verbosidade/segurança
  console.log('Body:', req.body);

  // Aceitar apenas método POST
  if (req.method !== 'POST') {
    console.log('❌ Método não permitido:', req.method);
    return res.status(405).json({ status: 'error', message: 'Método não permitido. Use POST.' });
  }

  try {
    // Extrair dados do lead
    const { name, email, phone, source, interest, utm_source, utm_campaign } = req.body;

    // Validações básicas
    if (!name || !email) {
      console.log('❌ Dados inválidos: Nome e Email são obrigatórios.');
      return res.status(400).json({ status: 'error', message: 'Campos obrigatórios não fornecidos: name, email' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Email inválido:', email);
      return res.status(400).json({ status: 'error', message: 'Formato de email inválido.' });
    }

    // Estruturar dados do lead
    const leadData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      source: source || 'webhook',
      interest: interest || 'Não especificado',
      utm_source: utm_source || null,
      utm_campaign: utm_campaign || null,
      received_at: new Date().toISOString(),
      received_br_time: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    };
    console.log('✅ Lead Válido Recebido:', leadData.email);

    // Acionar o fluxo de follow-up com Retell AI
    const followupResult = await triggerEvaFollowup(leadData);

    // Verificar se houve erro crítico no trigger
    if (followupResult.error && followupResult.retell_call_status === 'trigger_failed') {
        throw new Error(`Erro crítico ao acionar follow-up: ${followupResult.message}`);
    }

    // Retornar sucesso (mesmo que a chamada Retell falhe, o webhook processou)
    console.log('🚀 Webhook processado. Tentativa de chamada Retell AI realizada.');
    return res.status(200).json({
      status: 'success',
      message: `Lead ${leadData.name} recebido. Tentativa de chamada via Retell AI ${followupResult.retell_call_status === 'retell_call_initiated' ? 'iniciada' : 'falhou'}.`,
      lead_email: leadData.email,
      retell_call_id: followupResult.retell_call_id || null,
      retell_initiation_status: followupResult.retell_call_status,
      error_details: followupResult.error || null,
      whatsapp_backup_scheduled: followupResult.whatsapp_backup_scheduled,
      timestamp: leadData.received_br_time
    });

  } catch (error) {
    console.error('❌ Erro GERAL no processamento do Webhook:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno grave no servidor ao processar o webhook.',
      error: error.message
    });
  }
};
