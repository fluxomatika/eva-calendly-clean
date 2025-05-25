// api/main.js - Eva Clean API
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Calendly-Token');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('=== EVA API ===');
    console.log('Method:', req.method);
    console.log('Body:', req.body);
    console.log('Query:', req.query);

    // GET = query, POST = body
    const params = req.method === 'GET' ? req.query : req.body;
    const { action, timezone = 'America/Sao_Paulo' } = params || {};

    console.log('Action:', action);

    switch (action) {
      case 'get_current_date':
        return getCurrentDate(res, timezone);
        
      case 'set_timezone':
        return setTimezone(res, timezone);
        
      case 'book_calendly':
        return bookCalendly(req, res, params);
        
      default:
        return res.status(200).json({
          success: true,
          message: 'Eva Clean API funcionando!',
          actions: ['get_current_date', 'set_timezone', 'book_calendly'],
          timestamp: new Date().toISOString()
        });
    }

  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

function getCurrentDate(res, timezone) {
  console.log('=== GET CURRENT DATE ===');
  
  const now = new Date();
  const brazilTime = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(now);

  return res.status(200).json({
    success: true,
    message: 'Data atual obtida com sucesso',
    current_date: brazilTime,
    timezone: timezone,
    iso_date: now.toISOString(),
    timestamp: now.toISOString()
  });
}

function setTimezone(res, timezone) {
  console.log('=== SET TIMEZONE ===');
  console.log('Timezone:', timezone);

  return res.status(200).json({
    success: true,
    message: `Timezone configurado para ${timezone}`,
    timezone: timezone,
    timestamp: new Date().toISOString()
  });
}

async function bookCalendly(req, res, params) {
  console.log('=== BOOK CALENDLY ===');
  
  const { name, email, date, time } = params;
  const calendlyToken = req.headers['x-calendly-token'];

  console.log('Booking params:', { name, email, date, time });
  console.log('Has token:', !!calendlyToken);

  if (!calendlyToken) {
    return res.status(400).json({
      success: false,
      error: 'Token Calendly não fornecido',
      message: 'Header X-Calendly-Token é obrigatório'
    });
  }

  if (!name || !email || !date || !time) {
    return res.status(400).json({
      success: false,
      error: 'Dados incompletos',
      required: ['name', 'email', 'date', 'time'],
      received: { name, email, date, time }
    });
  }

  try {
    // Testar autenticação Calendly
    console.log('=== TESTANDO CALENDLY AUTH ===');
    
    const response = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${calendlyToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Calendly Auth Error: ${errorData.message || response.statusText}`);
    }

    const userData = await response.json();
    console.log('Calendly User:', userData.resource.name);

    // Por enquanto, só validar autenticação
    // Agendamento real implementaremos depois
    return res.status(200).json({
      success: true,
      message: 'Autenticação Calendly OK - Agendamento simulado',
      calendly_user: userData.resource.name,
      booking_data: { name, email, date, time },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro Calendly:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro na integração Calendly',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
