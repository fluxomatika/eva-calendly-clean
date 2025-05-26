// api/main.js - Eva com Google Calendar API
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
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
        
      case 'create_calendar_event':
        return handleCreateEvent(req, res);
        
      default:
        return res.status(200).json({
          status: 'success',
          message: 'Eva + Google Calendar API funcionando!',
          timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          actions: ['get_current_date', 'set_timezone', 'create_calendar_event']
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

// TOOL 3: Create Google Calendar Event
async function handleCreateEvent(req, res) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('Google API Key não configurada');
    }

    // Get parameters (preferably from POST body)
    const { summary, description, start_time, end_time, attendee_email, attendee_name } = 
      req.method === 'GET' ? req.query : req.body;
    
    if (!summary || !start_time || !attendee_email) {
      return res.status(400).json({
        status: 'error',
        action: 'create_calendar_event',
        message: 'Parâmetros obrigatórios: summary, start_time, attendee_email'
      });
    }

    // Calculate end time if not provided (default: +1 hour)
    const startDate = new Date(start_time);
    const endDate = end_time ? new Date(end_time) : new Date(startDate.getTime() + 60 * 60 * 1000);

    // Create event payload
    const eventPayload = {
      summary: summary,
      description: description || `Reunião agendada via Eva - Assistente Virtual`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      attendees: [
        {
          email: attendee_email,
          displayName: attendee_name || attendee_email.split('@')[0]
        }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 }
        ]
      },
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: false,
      sendUpdates: 'all'
    };

    console.log('Creating Calendar Event:', eventPayload);

    // Google Calendar API call
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      }
    );

    const data = await response.json();
    console.log('Google Calendar Response:', data);

    if (!response.ok) {
      throw new Error(`Google Calendar Error: ${response.status} - ${JSON.stringify(data)}`);
    }

    return res.status(200).json({
      status: 'success',
      action: 'create_calendar_event',
      message: 'Evento criado com sucesso no Google Calendar!',
      data: {
        event_id: data.id,
        event_link: data.htmlLink,
        hangout_link: data.hangoutLink,
        calendar_event: data
      },
      booking_info: {
        summary,
        attendee_email,
        attendee_name,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        timezone: 'America/Sao_Paulo'
      }
    });

  } catch (error) {
    console.error('Create Event Error:', error);
    return res.status(500).json({
      status: 'error',
      action: 'create_calendar_event',
      message: 'Erro ao criar evento no Google Calendar',
      error: error.message
    });
  }
}
