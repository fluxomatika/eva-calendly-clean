// api/main.js - Eva Enhanced com verificação de disponibilidade
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
        
      case 'check_availability':
        return handleCheckAvailability(req, res);
        
      case 'suggest_alternative_times':
        return handleSuggestAlternatives(req, res);
        
      case 'create_calendar_event':
        return handleCreateEvent(req, res);
        
      default:
        return res.status(200).json({
          status: 'success',
          message: 'Eva Enhanced API funcionando!',
          timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          actions: ['get_current_date', 'check_availability', 'suggest_alternative_times', 'create_calendar_event']
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

// TOOL 2: Check Availability
async function handleCheckAvailability(req, res) {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error('Google Service Account não configurado');
    }

    // Get parameters
    const { start_time, duration } = req.method === 'GET' ? req.query : req.body;
    
    if (!start_time) {
      return res.status(400).json({
        status: 'error',
        action: 'check_availability',
        message: 'Parâmetro obrigatório: start_time (formato YYYY-MM-DDTHH:MM:00)'
      });
    }

    // Calculate end time (default 30 minutes if duration not provided)
    const startDate = new Date(start_time);
    const durationMinutes = duration ? parseInt(duration) : 30;
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    // Get access token
    const accessToken = await getGoogleAccessToken();
    
    // Use specific calendar ID for consistency
    const calendarId = 'fluxomatika@gmail.com';
    
    // Check for existing events using freebusy API
    const freeBusyResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/freeBusy',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: [{ id: calendarId }]
        })
      }
    );

    const freeBusyData = await freeBusyResponse.json();
    console.log('FreeBusy Response:', freeBusyData);

    if (!freeBusyResponse.ok) {
      throw new Error(`FreeBusy API Error: ${freeBusyResponse.status} - ${JSON.stringify(freeBusyData)}`);
    }

    // Check if time slot is busy
    const busyTimes = freeBusyData.calendars[calendarId]?.busy || [];
    const isAvailable = busyTimes.length === 0;

    return res.status(200).json({
      status: 'success',
      action: 'check_availability',
      data: {
        requested_time: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          duration_minutes: durationMinutes
        },
        available: isAvailable,
        conflicting_events: busyTimes.map(busy => ({
          start: busy.start,
          end: busy.end,
          start_br: new Date(busy.start).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          end_br: new Date(busy.end).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        })),
        message: isAvailable ? 
          'Horário disponível para agendamento' : 
          `Horário ocupado. ${busyTimes.length} conflito(s) encontrado(s)`
      }
    });

  } catch (error) {
    console.error('Check Availability Error:', error);
    return res.status(500).json({
      status: 'error',
      action: 'check_availability',
      message: 'Erro ao verificar disponibilidade',
      error: error.message
    });
  }
}

// TOOL 3: Suggest Alternative Times
async function handleSuggestAlternatives(req, res) {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error('Google Service Account não configurado');
    }

    // Get parameters
    const { start_time, duration, date } = req.method === 'GET' ? req.query : req.body;
    
    if (!start_time && !date) {
      return res.status(400).json({
        status: 'error',
        action: 'suggest_alternative_times',
        message: 'Parâmetro obrigatório: start_time ou date'
      });
    }

    const durationMinutes = duration ? parseInt(duration) : 30;
    const baseDate = start_time ? new Date(start_time) : new Date(date);
    
    // Get access token
    const accessToken = await getGoogleAccessToken();
    const calendarId = 'fluxomatika@gmail.com';

    // Check availability for multiple time slots on the same day
    const suggestions = [];
    const workingHours = [9, 10, 11, 14, 15, 16, 17]; // 9h-12h, 14h-18h
    
    for (const hour of workingHours) {
      const testDate = new Date(baseDate);
      testDate.setHours(hour, 0, 0, 0);
      const testEndDate = new Date(testDate.getTime() + durationMinutes * 60 * 1000);
      
      // Skip if it's in the past
      if (testDate < new Date()) continue;

      // Check availability for this time slot
      const freeBusyResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/freeBusy',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            timeMin: testDate.toISOString(),
            timeMax: testEndDate.toISOString(),
            items: [{ id: calendarId }]
          })
        }
      );

      const freeBusyData = await freeBusyResponse.json();
      const busyTimes = freeBusyData.calendars[calendarId]?.busy || [];
      
      if (busyTimes.length === 0) {
        suggestions.push({
          start_time: testDate.toISOString().slice(0, 19), // Remove timezone part
          end_time: testEndDate.toISOString().slice(0, 19),
          start_time_br: testDate.toLocaleString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit'
          }),
          date_br: testDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          available: true
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      action: 'suggest_alternative_times',
      data: {
        requested_date: baseDate.toISOString().split('T')[0],
        duration_minutes: durationMinutes,
        available_slots: suggestions,
        total_suggestions: suggestions.length,
        message: suggestions.length > 0 ? 
          `${suggestions.length} horário(s) disponível(is) encontrado(s)` :
          'Nenhum horário disponível encontrado para este dia'
      }
    });

  } catch (error) {
    console.error('Suggest Alternatives Error:', error);
    return res.status(500).json({
      status: 'error',
      action: 'suggest_alternative_times',
      message: 'Erro ao sugerir horários alternativos',
      error: error.message
    });
  }
}

// Helper: Get Google Access Token using Service Account
async function getGoogleAccessToken() {
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await createJWT(serviceAccount)
      })
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new Error(`Token Error: ${JSON.stringify(error)}`);
    }
    
    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
    
  } catch (error) {
    console.error('Access Token Error:', error);
    throw error;
  }
}

// Helper: Create JWT
async function createJWT(serviceAccount) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const crypto = require('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${encodedHeader}.${encodedPayload}`);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// TOOL 4: Create Google Calendar Event (existing function - unchanged)
async function handleCreateEvent(req, res) {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error('Google Service Account não configurado');
    }

    // Get parameters (preferably from GET query)
    const { summary, description, start_time, end_time, attendee_email, attendee_name } = 
      req.method === 'GET' ? req.query : req.body;
    
    if (!summary || !start_time || !attendee_email) {
      return res.status(400).json({
        status: 'error',
        action: 'create_calendar_event',
        message: 'Parâmetros obrigatórios: summary, start_time, attendee_email'
      });
    }

    // Get access token
    const accessToken = await getGoogleAccessToken();
    
    // Calculate end time if not provided (default: +30 minutes)  
    // Fix: Ensure start_time is interpreted as Brazil timezone
    let startDate = new Date(start_time);
    
    // If no timezone info in start_time, assume Brazil timezone
    if (!start_time.includes('T') || (!start_time.includes('+') && !start_time.includes('Z') && !start_time.includes('-', 10))) {
      // Parse as Brazil time by adding timezone info
      const brasilTime = start_time + (start_time.includes('T') ? '-03:00' : 'T00:00:00-03:00');
      startDate = new Date(brasilTime);
    }
    
    const endDate = end_time ? new Date(end_time) : new Date(startDate.getTime() + 30 * 60 * 1000);

    // Create event payload (without attendees to avoid Service Account restrictions)
    const eventPayload = {
      summary: `${summary} - ${attendee_name || attendee_email}`,
      description: `Reunião agendada via Eva - Assistente Virtual da Fluxomatika\n\nCliente: ${attendee_name || 'N/A'}\nEmail: ${attendee_email}\n\n${description || ''}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 }
        ]
      }
    };

    console.log('Creating Calendar Event:', eventPayload);

    // Use specific calendar ID
    const calendarId = 'fluxomatika@gmail.com';
    
    // Google Calendar API call with Service Account
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
      message: 'Evento criado com sucesso! Cliente será notificado separadamente.',
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
      },
      notification_data: {
        client_name: attendee_name || attendee_email.split('@')[0],
        client_email: attendee_email,
        meeting_date: startDate.toLocaleDateString('pt-BR'),
        meeting_time: startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        meeting_link: data.htmlLink,
        hangout_link: data.hangoutLink
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
