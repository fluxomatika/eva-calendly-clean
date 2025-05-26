// api/main.js - Eva Clean API com Calendly
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
        
      case 'get_available_slots':
        return handleGetSlots(req, res);
        
      case 'book_meeting':
        return handleBookMeeting(req, res);
        
      default:
        return res.status(200).json({
          status: 'success',
          message: 'Eva Clean API funcionando!',
          timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          actions: ['get_current_date', 'set_timezone', 'get_available_slots', 'book_meeting']
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

// TOOL 3: Get Available Slots
async function handleGetSlots(req, res) {
  try {
    const token = process.env.CALENDLY_TOKEN;
    if (!token) {
      throw new Error('Token Calendly não configurado');
    }

    // Get parameters
    const start = req.method === 'GET' ? req.query.start : req.body?.start;
    const end = req.method === 'GET' ? req.query.end : req.body?.end;
    
    if (!start || !end) {
      return res.status(400).json({
        status: 'error',
        action: 'get_available_slots',
        message: 'Parâmetros start e end são obrigatórios (YYYY-MM-DD)'
      });
    }

    // Calendly API call
    const eventTypeUri = 'https://calendly.com/fluxomatika/30min';
    const url = `https://api.calendly.com/scheduling/available_slots?event_type=${encodeURIComponent(eventTypeUri)}&start_time=${start}T00:00:00Z&end_time=${end}T23:59:59Z`;
    
    console.log('Calendly API URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('Calendly API Response:', data);

    if (!response.ok) {
      throw new Error(`Calendly API Error: ${response.status} - ${JSON.stringify(data)}`);
    }

    return res.status(200).json({
      status: 'success',
      action: 'get_available_slots',
      data: data,
      parameters: { start, end }
    });

  } catch (error) {
    console.error('Get Slots Error:', error);
    return res.status(500).json({
      status: 'error',
      action: 'get_available_slots',
      message: 'Erro ao buscar horários disponíveis',
      error: error.message
    });
  }
}

// TOOL 4: Book Meeting
async function handleBookMeeting(req, res) {
  try {
    const token = process.env.CALENDLY_TOKEN;
    if (!token) {
      throw new Error('Token Calendly não configurado');
    }

    // Get parameters (preferably from POST body)
    const { name, email, start } = req.method === 'GET' ? req.query : req.body;
    
    if (!name || !email || !start) {
      return res.status(400).json({
        status: 'error',
        action: 'book_meeting',
        message: 'Parâmetros obrigatórios: name, email, start (ISO format)'
      });
    }

    // Booking payload
    const bookingPayload = {
      event_type: 'https://calendly.com/fluxomatika/30min',
      invitee: {
        name: name,
        email: email,
        timezone: 'America/Sao_Paulo'
      },
      start_time: start
    };

    console.log('Booking Payload:', bookingPayload);

    const response = await fetch('https://api.calendly.com/scheduled_events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingPayload)
    });

    const data = await response.json();
    console.log('Calendly Booking Response:', data);

    if (!response.ok) {
      throw new Error(`Calendly Booking Error: ${response.status} - ${JSON.stringify(data)}`);
    }

    return res.status(200).json({
      status: 'success',
      action: 'book_meeting',
      message: 'Reunião agendada com sucesso!',
      data: data,
      booking_info: {
        name,
        email,
        start_time: start,
        timezone: 'America/Sao_Paulo'
      }
    });

  } catch (error) {
    console.error('Book Meeting Error:', error);
    return res.status(500).json({
      status: 'error',
      action: 'book_meeting',
      message: 'Erro ao agendar reunião',
      error: error.message
    });
  }
}
