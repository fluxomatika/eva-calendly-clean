// api/main.js - Eva Clean API com Tools
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Calendly-Token');
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get action from query (GET) or body (POST)
    const action = req.method === 'GET' ? req.query.action : req.body?.action;
    
    console.log(`[${new Date().toISOString()}] Action: ${action}, Method: ${req.method}`);
    
    // Handle different actions
    switch (action) {
      case 'get_current_date':
        return handleCurrentDate(req, res);
        
      case 'set_timezone':
        return handleTimezone(req, res);
        
      default:
        return res.status(200).json({
          status: 'success',
          message: 'Eva Clean API funcionando!',
          timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          actions: ['get_current_date', 'set_timezone']
        });
    }
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// TOOL 1: Get Current Date/Time
async function handleCurrentDate(req, res) {
  try {
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    
    const response = {
      status: 'success',
      action: 'get_current_date',
      data: {
        timestamp: now.toISOString(),
        brazil_time: brazilTime.toLocaleString('pt-BR'),
        date: brazilTime.toISOString().split('T')[0],
        time: brazilTime.toLocaleString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        }),
        timezone: 'America/Sao_Paulo',
        weekday: brazilTime.toLocaleDateString('pt-BR', { 
          weekday: 'long',
          timeZone: 'America/Sao_Paulo'
        })
      }
    };
    
    console.log('Current Date Response:', response);
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Current Date Error:', error);
    return res.status(500).json({
      status: 'error',
      action: 'get_current_date',
      message: 'Erro ao obter data atual',
      error: error.message
    });
  }
}

// TOOL 2: Set Timezone Fix
async function handleTimezone(req, res) {
  try {
    const timezone = req.method === 'GET' ? 
      req.query.timezone || 'America/Sao_Paulo' : 
      req.body?.timezone || 'America/Sao_Paulo';
    
    // Force Brazil timezone
    const fixedTimezone = 'America/Sao_Paulo';
    const now = new Date();
    
    const response = {
      status: 'success',
      action: 'set_timezone',
      data: {
        requested_timezone: timezone,
        fixed_timezone: fixedTimezone,
        current_time: now.toLocaleString('pt-BR', { timeZone: fixedTimezone }),
        message: 'Timezone definido para horário de Brasília',
        iso_time: now.toISOString()
      }
    };
    
    console.log('Timezone Fix Response:', response);
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Timezone Error:', error);
    return res.status(500).json({
      status: 'error',
      action: 'set_timezone',
      message: 'Erro ao configurar timezone',
      error: error.message
    });
  }
}
