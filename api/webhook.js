// api/webhook.js - EVA Follow-up Webhook System
// Baseado na arquitetura EVA atual (api/main.js)

module.exports = async (req, res) => {
  // CORS (mesmo padrão do EVA atual)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('=== WEBHOOK DEBUG COMPLETO ===');
    console.log(`[${new Date().toISOString()}] EVA Follow-up Webhook triggered`);
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    console.log('==============================');
    
    // Só aceita POST (leads do formulário)
    if (req.method !== 'POST') {
      console.log('❌ Método não permitido:', req.method);
      return res.status(405).json({
        status: 'error',
        message: 'Método não permitido. Use POST para enviar leads.'
      });
    }

    // Extrair dados do lead
    const { name, email, phone, source, interest, utm_source, utm_campaign } = req.body;
    
    console.log('📋 Dados extraídos:', { name, email, phone, source, interest });
    
    // Validações básicas
    if (!name || !email) {
      console.log('❌ Validação falhou: campos obrigatórios');
      return res.status(400).json({
        status: 'error',
        message: 'Campos obrigatórios: name, email'
      });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Email inválido:', email);
      return res.status(400).json({
        status: 'error',
        message: 'Email inválido'
      });
    }

    // Estruturar dados do lead
    const leadData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      source: source || 'website',
      interest: interest || 'Não especificado',
      utm_source: utm_source || null,
      utm_campaign: utm_campaign || null,
      created_at: new Date().toISOString(),
      brazil_time: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      status: 'new'
    };

    console.log('✅ Dados validados:', JSON.stringify(leadData, null, 2));
    console.log('🎯 NOVO LEAD PROCESSADO:', leadData);

    // TRIGGER EVA FOLLOW-UP
    console.log('⚡ Iniciando trigger Eva Follow-up...');
    const followupResult = await triggerEvaFollowup(leadData);
    console.log('✅ Trigger Eva Follow-up concluído:', followupResult);
    
    // Salvar lead (básico - depois integrar com Airtable)
    console.log('💾 Salvando dados do lead...');
    await saveLeadData(leadData);

    const responseData = {
      status: 'success',
      message: `Lead ${name} capturado com sucesso! Eva Follow-up será ativada em instantes.`,
      data: {
        lead_id: generateLeadId(),
        name: leadData.name,
        email: leadData.email,
        eva_followup: followupResult,
        next_actions: [
          'Eva ligará em 1 minuto',
          'WhatsApp backup em 30 minutos (se necessário)',
          'Lead salvo no CRM'
        ]
      },
      timestamp: leadData.brazil_time
    };

    console.log('📤 Enviando response:', JSON.stringify(responseData, null, 2));
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ WEBHOOK ERROR CRÍTICO:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// FUNÇÃO: TRIGGER EVA FOLLOW-UP
async function triggerEvaFollowup(leadData) {
  try {
    console.log('⚡ TRIGGERING EVA FOLLOW-UP for:', leadData.name);
    
    const results = {
      voice_call_scheduled: false,
      whatsapp_backup_scheduled: false,
      delay_minutes: 1
    };

    // 1. AGENDAR CHAMADA EVA (1 minuto)
    console.log('⏰ Agendando chamada Eva para 1 minuto...');
    setTimeout(async () => {
      console.log('📞 EXECUTANDO CHAMADA EVA para:', leadData.name);
      try {
        const callResult = await initiateEvaCall(leadData);
        console.log('✅ Resultado da chamada:', callResult);
      } catch (error) {
        console.error('❌ Erro na execução da chamada:', error);
      }
    }, 1 * 60 * 1000); // 1 minuto
    
    results.voice_call_scheduled = true;
    console.log('✅ Chamada agendada para 1 minuto');

    // 2. AGENDAR BACKUP WHATSAPP (30 minutos)
    console.log('⏰ Agendando WhatsApp backup para 30 minutos...');
    setTimeout(async () => {
      console.log('💬 EXECUTANDO BACKUP WHATSAPP para:', leadData.name);
      try {
        const whatsappResult = await sendWhatsAppFollowup(leadData);
        console.log('✅ Resultado WhatsApp:', whatsappResult);
      } catch (error) {
        console.error('❌ Erro no WhatsApp backup:', error);
      }
    }, 30 * 60 * 1000); // 30 minutos
    
    results.whatsapp_backup_scheduled = true;
    console.log('✅ WhatsApp backup agendado para 30 minutos');

    console.log('✅ Eva Follow-up agendada:', results);
    return results;

  } catch (error) {
    console.error('❌ Trigger Error:', error);
    throw error;
  }
}

// FUNÇÃO: INICIAR CHAMADA EVA
async function initiateEvaCall(leadData) {
  try {
    console.log('📞 === INICIANDO CHAMADA EVA FOLLOW-UP ===');
    console.log('📞 Lead:', leadData.name, leadData.phone);
    
    // Verificar se temos as credenciais
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY não configurado');
    }
    
    if (!process.env.EVA_FOLLOWUP_AGENT_ID) {
      throw new Error('EVA_FOLLOWUP_AGENT_ID não configurado');
    }

    console.log('✅ Credenciais verificadas');

    // Preparar dados da chamada
    // Validar e corrigir telefone
let phoneNumber = leadData.phone;

if (!phoneNumber) {
  phoneNumber = process.env.FALLBACK_PHONE_NUMBER;
  console.log('📞 Usando telefone fallback:', phoneNumber);
}

if (phoneNumber && !phoneNumber.startsWith('+')) {
  phoneNumber = '+55' + phoneNumber.replace(/\D/g, '');
}

console.log('📞 Telefone final para chamada:', phoneNumber);

// Preparar dados da chamada
const callPayload = {
  agent_id: process.env.EVA_FOLLOWUP_AGENT_ID,
  phone_number: phoneNumber,
  context_variables: {
    lead_name: leadData.name,
    lead_interest: leadData.interest,
    lead_source: leadData.source
  }
};

    console.log('📞 Payload da chamada:', JSON.stringify(callPayload, null, 2));

    // Chamada para ElevenLabs Outbound API
    console.log('🌐 Fazendo chamada para ElevenLabs API...');
    const response = await fetch('https://api.elevenlabs.io/v1/convai/conversations/outbound', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ELEVENLABS_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(callPayload)
    });

    console.log('📞 Status da resposta ElevenLabs:', response.status);
    const callResult = await response.json();
    console.log('📞 Resposta ElevenLabs completa:', JSON.stringify(callResult, null, 2));

    if (!response.ok) {
      throw new Error(`ElevenLabs API Error: ${response.status} - ${JSON.stringify(callResult)}`);
    }

    console.log('✅ Chamada Eva iniciada com sucesso!');
    console.log('✅ Conversation ID:', callResult.conversation_id);
    
    // Atualizar status do lead
    await updateLeadStatus(leadData.email, 'eva_calling', {
      conversation_id: callResult.conversation_id,
      call_initiated_at: new Date().toISOString()
    });
    
    console.log('📞 === CHAMADA EVA CONCLUÍDA ===');
    
    return { 
      status: 'call_initiated', 
      conversation_id: callResult.conversation_id,
      data: callResult 
    };

  } catch (error) {
    console.error('❌ ERRO CRÍTICO NA CHAMADA EVA:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Log detalhado do erro
    console.error('❌ Error details:', {
      message: error.message,
      lead: leadData.name,
      phone: leadData.phone,
      timestamp: new Date().toISOString()
    });
    
    // Tentar WhatsApp backup se chamada falhar
    console.log('🔄 Tentando WhatsApp backup...');
    try {
      await sendWhatsAppFollowup(leadData);
    } catch (whatsappError) {
      console.error('❌ WhatsApp backup também falhou:', whatsappError);
    }
    
    return { 
      status: 'call_failed', 
      error: error.message,
      backup_action: 'whatsapp_attempted'
    };
  }
}

// FUNÇÃO: WHATSAPP BACKUP
async function sendWhatsAppFollowup(leadData) {
  try {
    console.log('💬 === ENVIANDO WHATSAPP BACKUP ===');
    console.log('💬 Para:', leadData.phone);
    
    const message = `
Oi ${leadData.name}! 👋

Vi que você se interessou por ${leadData.interest.toLowerCase()} na Fluxomatika.

Nossa IA já ajudou +200 empresas a economizar 40h/semana com automação inteligente! 🤖

Que tal conversarmos sobre seu projeto?

Posso te ligar agora ou prefere agendar um horário? 📞

*Eva - Assistente Virtual da Fluxomatika*
    `.trim();

    // TODO: Integrar com WhatsApp Business API
    // const whatsappResult = await sendWhatsApp(leadData.phone, message);
    
    console.log('💬 WhatsApp simulado para:', leadData.phone);
    console.log('💬 Mensagem:', message);
    
    // Atualizar status do lead
    await updateLeadStatus(leadData.email, 'whatsapp_sent');
    
    console.log('💬 === WHATSAPP BACKUP CONCLUÍDO ===');
    
    return { status: 'whatsapp_sent', message_preview: message.substring(0, 100) };

  } catch (error) {
    console.error('❌ WhatsApp Error:', error);
    throw error;
  }
}

// FUNÇÃO: SALVAR LEAD (BÁSICO - JSON temporário)
async function saveLeadData(leadData) {
  try {
    console.log('💾 === SALVANDO LEAD ===');
    console.log('💾 Email:', leadData.email);
    
    // Por enquanto, só log (depois integrar com Airtable)
    console.log('💾 Lead completo:', JSON.stringify(leadData, null, 2));
    
    const leadId = generateLeadId();
    console.log('💾 Lead ID gerado:', leadId);
    console.log('💾 === LEAD SALVO ===');
    
    return { status: 'saved', lead_id: leadId };
    
  } catch (error) {
    console.error('❌ Save Error:', error);
    throw error;
  }
}

// FUNÇÃO: ATUALIZAR STATUS LEAD
async function updateLeadStatus(email, status, additionalData = {}) {
  try {
    console.log(`📊 === ATUALIZANDO STATUS ===`);
    console.log(`📊 Email: ${email}`);
    console.log(`📊 Status: ${status}`);
    console.log(`📊 Additional data:`, additionalData);
    
    const updateData = {
      email,
      status,
      updated_at: new Date().toISOString(),
      brazil_time: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      ...additionalData
    };
    
    console.log('📊 Update data completo:', JSON.stringify(updateData, null, 2));
    
    // TODO: Integrar com Airtable quando implementarmos CRM
    console.log('📊 Status atualizado (simulado)');
    console.log('📊 === STATUS ATUALIZADO ===');
    
    return { status: 'updated', data: updateData };
    
  } catch (error) {
    console.error('❌ Update Status Error:', error);
    throw error;
  }
}

// FUNÇÃO: GERAR ID DO LEAD
function generateLeadId() {
  const id = `eva_lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  console.log('🆔 Lead ID gerado:', id);
  return id;
}

// FUNÇÃO: GET CURRENT DATE (mesma do EVA atual)
function getCurrentBrazilTime() {
  const now = new Date();
  return {
    iso: now.toISOString(),
    brazil: now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    date: now.toISOString().split('T')[0],
    time: now.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    })
  };
}
