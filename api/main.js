// api/main.js - Eva com Google Calendar Service Account
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
          message: 'Eva + Google Calendar (Service Account) funcionando!',
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

// Helper: Get Google Access Token using Service Account
async function getGoogleAccessToken() {
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    
    // Create JWT for Google OAuth
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
    
    // Base64 encode header and payload
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    // Create signature (simplified - for production use proper JWT library)
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    // For now, we'll use a simpler approach with fetch to Google's token endpoint
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

// Helper: Create JWT (simplified version)
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
  
  // Import crypto for signing
  const crypto = require('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${encodedHeader}.${encodedPayload}`);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// TOOL 3: Create Google Calendar Event with Service Account
async function handleCreateEvent(req, res) {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error('Google Service Account não configurado');
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

    // Get access token
    const accessToken = await getGoogleAccessToken();
    
    // Calculate end time if not provided (default: +1 hour)
    // Fix timezone: convert input to Brazil timezone properly
    const startDate = new Date(start_time);
    // If no timezone specified, assume Brazil timezone
    if (!start_time.includes('T') || (!start_time.includes('+') && !start_time.includes('Z'))) {
      // Add Brazil timezone offset
      startDate.setHours(startDate.getHours() + 3);
    }
    const endDate = end_time ? new Date(end_time) : new Date(startDate.getTime() + 60 * 60 * 1000);

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

    // Use specific calendar ID for fluxomatika calendar
    const calendarId = 'fluxomatika@gmail.com'; // Your main calendar email
    
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
      // Dados para automação de notificação
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
