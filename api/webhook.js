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
    console.log(`[${new Date().toISOString()}] EVA Follow-up Webhook triggered`);
    console.log('Method:', req.method);
    console.log('Body:', req.body);
    
    // Só aceita POST (leads do formulário)
    if (req.method !== 'POST') {
      return res.status(405).json({
        status: 'error',
        message: 'Método não permitido. Use POST para enviar leads.'
      });
    }

    // Extrair dados do lead
    const { name, email, phone, source, interest, utm_source, utm_campaign } = req.body;
    
    // Validações básicas
    if (!name || !email) {
      return res.status(400).json({
        status: 'error',
        message: 'Campos obrigatórios: name, email'
      });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
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

    console.log('🎯 NOVO LEAD PROCESSADO:', leadData);

    // TRIGGER EVA FOLLOW-UP
    const followupResult = await triggerEvaFollowup(leadData);
    
    // Salvar lead (básico - depois integrar com Airtable)
    await saveLeadData(leadData);

    return res.status(200).json({
      status: 'success',
      message: `Lead ${name} capturado com sucesso! Eva Follow-up será ativada em instantes.`,
      data: {
        lead_id: generateLeadId(),
        name: leadData.name,
        email: leadData.email,
        eva_followup: followupResult,
        next_actions: [
          'Eva ligará em 5 minutos',
          'WhatsApp backup em 30 minutos (se necessário)',
          'Lead salvo no CRM'
        ]
      },
      timestamp: leadData.brazil_time
    });

  } catch (error) {
    console.error('❌ Webhook Error:', error);
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
      delay_minutes: 5
    };

    // 1. AGENDAR CHAMADA EVA (5 minutos)
    setTimeout(async () => {
      console.log('📞 INICIANDO CHAMADA EVA para:', leadData.name);
      await initiateEvaCall(leadData);
    }, 5 * 60 * 1000); // 5 minutos
    
    results.voice_call_scheduled = true;

    // 2. AGENDAR BACKUP WHATSAPP (30 minutos)
    setTimeout(async () => {
      console.log('💬 BACKUP WHATSAPP para:', leadData.name);
      await sendWhatsAppFollowup(leadData);
    }, 30 * 60 * 1000); // 30 minutos
    
    results.whatsapp_backup_scheduled = true;

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
    console.log('📞 Iniciando chamada Eva Follow-up...');
    
    // AQUI VAI A INTEGRAÇÃO COM ELEVENLABS CONVERSATIONAL AI
    // Por enquanto, vamos simular a chamada
    
    const callData = {
      lead_name: leadData.name,
      lead_phone: leadData.phone,
      lead_interest: leadData.interest,
      call_type: 'eva_followup',
      scheduled_at: new Date().toISOString()
    };

    // TODO: Integrar com ElevenLabs Conversational AI
    // const callResult = await elevenLabsCall(callData);
    
    console.log('📞 Chamada Eva simulada:', callData);
    
    // Atualizar status do lead
    await updateLeadStatus(leadData.email, 'eva_called');
    
    return { status: 'call_initiated', data: callData };

  } catch (error) {
    console.error('❌ Eva Call Error:', error);
    throw error;
  }
}

// FUNÇÃO: WHATSAPP BACKUP
async function sendWhatsAppFollowup(leadData) {
  try {
    console.log('💬 Enviando WhatsApp backup...');
    
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
    console.log('Mensagem:', message);
    
    // Atualizar status do lead
    await updateLeadStatus(leadData.email, 'whatsapp_sent');
    
    return { status: 'whatsapp_sent', message_preview: message.substring(0, 100) };

  } catch (error) {
    console.error('❌ WhatsApp Error:', error);
    throw error;
  }
}

// FUNÇÃO: SALVAR LEAD (BÁSICO - JSON temporário)
async function saveLeadData(leadData) {
  try {
    console.log('💾 Salvando lead:', leadData.email);
    
    // Por enquanto, só log (depois integrar com Airtable)
    console.log('Lead salvo:', JSON.stringify(leadData, null, 2));
    
    return { status: 'saved', lead_id: generateLeadId() };
    
  } catch (error) {
    console.error('❌ Save Error:', error);
    throw error;
  }
}

// FUNÇÃO: ATUALIZAR STATUS LEAD
async function updateLeadStatus(email, status) {
  try {
    console.log(`📊 Atualizando status: ${email} → ${status}`);
    
    // TODO: Integrar com Airtable
    console.log('Status atualizado (simulado)');
    
    return { status: 'updated' };
    
  } catch (error) {
    console.error('❌ Update Status Error:', error);
    throw error;
  }
}

// FUNÇÃO: GERAR ID DO LEAD
function generateLeadId() {
  return `eva_lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
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
