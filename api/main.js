// api/main.js - Eva OAuth2 com Google Meet
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

      case 'oauth_authorize':
        return handleOAuthAuthorize(req, res);

      case 'oauth_callback':
        return handleOAuthCallback(req, res);
        
      default:
        return res.status(200).json({
          status: 'success',
          message: 'Eva OAuth2 API funcionando!',
          timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          actions: ['get_current_date', 'check_availability', 'suggest_alternative_times', 'create_calendar_event'],
          oauth_status: process.env.GOOGLE_REFRESH_TOKEN ? 'authorized' : 'needs_authorization',
          authorize_url: process.env.GOOGLE_REFRESH_TOKEN ? null : 'https://eva-calendly-clean.vercel.app/api/main?action=oauth_authorize'
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

// OAUTH2 CONFIGURATION (usando environment variables por segurança)
const OAUTH_CONFIG = {
  client_id: process.env.GOOGLE_CLIENT_ID || '972355840416-1sfa3tpqrm5d6dneacnanj6mhe0ae0vf.apps.googleusercontent.com',
  client_secret: process.env.GOOGLE_CLIENT_SECRET || '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',
  redirect_uri: 'https://eva-calendly-clean.vercel.app/api/main?action=oauth_callback',
  scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
};

// OAUTH2: Step 1 - Authorization URL
async function handleOAuthAuthorize(req, res) {
  try {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${OAUTH_CONFIG.client_id}` +
      `&redirect_uri=${encodeURIComponent(OAUTH_CONFIG.redirect_uri)}` +
      `&scope=${encodeURIComponent(OAUTH_CONFIG.scope)}` +
      `&response_type=code` +
      `&access_type=offline` +
      `&prompt=consent`;

    console.log('OAuth Authorization URL:', authUrl);
    
    // Redirect to Google OAuth
    res.writeHead(302, { Location: authUrl });
    res.end();
    
  } catch (error) {
    console.error('OAuth Authorize Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro na autorização OAuth',
      error: error.message
    });
  }
}

// OAUTH2: Step 2 - Handle Callback & Get Refresh Token
async function handleOAuthCallback(req, res) {
  try {
    const { code, error } = req.query;
    
    if (error) {
      throw new Error(`OAuth Error: ${error}`);
    }
    
    if (!code) {
      throw new Error('No authorization code received');
    }

    console.log('OAuth callback received, exchanging code for tokens...');
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: OAUTH_CONFIG.client_id,
        client_secret: OAUTH_CONFIG.client_secret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: OAUTH_CONFIG.redirect_uri
      })
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(`Token Error: ${JSON.stringify(tokenData)}`);
    }

    console.log('OAuth tokens received successfully');
    
    // Return success page with instructions
    const successHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Eva OAuth - Autorização Concluída</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .code { background: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; word-break: break-all; }
        .warning { background: #fff3cd; color: #856404; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h2>🎉 Autorização OAuth Concluída!</h2>
      
      <div class="success">
        <strong>Sucesso!</strong> Eva agora tem acesso ao seu Google Calendar e pode criar Google Meet automaticamente.
      </div>
      
      <h3>📋 Próximo Passo:</h3>
      <p>Adicione esta variável de ambiente no Vercel:</p>
      
      <div class="code">
        <strong>Nome:</strong> GOOGLE_REFRESH_TOKEN<br>
        <strong>Valor:</strong> ${tokenData.refresh_token}
      </div>
      
      <div class="warning">
        <strong>Importante:</strong> 
        <ul>
          <li>Copie o refresh_token acima</li>
          <li>Adicione como variável de ambiente no Vercel</li>
          <li>Faça redeploy da aplicação</li>
          <li>Eva estará pronta para criar Google Meet!</li>
        </ul>
      </div>
      
      <p><a href="https://vercel.com/dashboard">Ir para Vercel Dashboard</a></p>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(successHtml);
    
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    
    const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>Eva OAuth - Erro</title></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
      <h2>❌ Erro na Autorização OAuth</h2>
      <p><strong>Erro:</strong> ${error.message}</p>
      <p><a href="/api/main?action=oauth_authorize">Tentar Novamente</a></p>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send(errorHtml);
  }
}

// Get OAuth2 Access Token using Refresh Token
async function getOAuth2AccessToken() {
  try {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      throw new Error('GOOGLE_REFRESH_TOKEN não configurado. Execute oauth_authorize primeiro.');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: OAUTH_CONFIG.client_id,
        client_secret: OAUTH_CONFIG.client_secret,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(`OAuth2 Token Error: ${JSON.stringify(tokenData)}`);
    }

    return tokenData.access_token;
    
  } catch (error) {
    console.error('OAuth2 Access Token Error:', error);
    throw error;
  }
}

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

// TOOL 2: Check Availability (APENAS VERIFICAÇÃO - NÃO CRIA EVENTO)
async function handleCheckAvailability(req, res) {
  try {
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
    let startDate = new Date(start_time);
    
    // Apply timezone correction
    if (!start_time.includes('+') && !start_time.includes('Z') && !start_time.includes('-', 10)) {
      const brasilTime = start_time + '-03:00';
      startDate = new Date(brasilTime);
    }
    
    const durationMinutes = duration ? parseInt(duration) : 30;
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    // Get access token
    const accessToken = await getOAuth2AccessToken();
    
    // Use primary calendar
    const calendarId = 'primary';
    
    console.log('=== CHECK AVAILABILITY ONLY ===');
    console.log('Checking availability (NOT creating event):', startDate.toISOString(), 'to', endDate.toISOString());
    
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

    console.log('Availability result:', isAvailable ? 'AVAILABLE' : 'BUSY');
    console.log('================================');

    return res.status(200).json({
      status: 'success',
      action: 'check_availability',
      data: {
        requested_time: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          duration_minutes: durationMinutes,
          start_br: startDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          end_br: endDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
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
    const accessToken = await getOAuth2AccessToken();
    const calendarId = 'primary';

    // Check availability for multiple time slots on the same day
    const suggestions = [];
    const workingHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
    
    console.log(`Checking availability for date: ${baseDate.toISOString().split('T')[0]}`);
    
    for (const hour of workingHours) {
      // USE SAME LOGIC AS create_calendar_event
      const testStartTime = `${baseDate.toISOString().split('T')[0]}T${hour.toString().padStart(2, '0')}:00:00`;
      
      // Apply same timezone fix as create_calendar_event
      let testDate = new Date(testStartTime);
      
      // Same timezone correction logic
      if (!testStartTime.includes('+') && !testStartTime.includes('Z') && !testStartTime.includes('-', 10)) {
        const brasilTime = testStartTime + '-03:00';
        testDate = new Date(brasilTime);
      }
      
      const testEndDate = new Date(testDate.getTime() + durationMinutes * 60 * 1000);
      
      // Skip if it's in the past
      const now = new Date();
      if (testDate < now) {
        console.log(`Skipping ${hour}h - in the past`);
        continue;
      }

      console.log(`Testing ${hour}h: ${testDate.toISOString()} to ${testEndDate.toISOString()}`);

      // Use IDENTICAL FreeBusy call as create_calendar_event
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
      
      console.log(`${hour}h - Busy times found:`, busyTimes.length);
      
      // Only suggest if NO conflicts (same as create_calendar_event)
      if (busyTimes.length === 0) {
        suggestions.push({
          start_time: testStartTime,
          end_time: `${baseDate.toISOString().split('T')[0]}T${hour.toString().padStart(2, '0')}:30:00`,
          start_time_br: `${hour.toString().padStart(2, '0')}:00`,
          date_br: testDate.toLocaleDateString('pt-BR'),
          available: true,
          hour: hour
        });
        console.log(`${hour}h - AVAILABLE FOR SUGGESTION`);
      } else {
        console.log(`${hour}h - BUSY - NOT SUGGESTING`);
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

// FUNÇÃO DE EMAIL AUTOMÁTICO
async function sendConfirmationEmail(emailData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY não configurado');
    }

    const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Header -->
      <div style="background: #2563eb; color: white; padding: 30px 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">✅ Reunião Confirmada</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Fluxomatika - Automação Inteligente</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 30px 20px;">
        <p style="font-size: 18px; color: #1f2937; margin-bottom: 10px;">
          Olá <strong>${emailData.clientName}</strong>,
        </p>
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
          Sua reunião foi confirmada com sucesso! Estamos ansiosos para conversar com você.
        </p>
        
        <!-- Meeting Details Box -->
        <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; margin: 25px 0;">
          <h2 style="color: #1e40af; margin: 0 0 20px 0; font-size: 20px;">📅 Detalhes da Reunião</h2>
          
          <div style="margin: 15px 0;">
            <strong style="color: #374151;">Assunto:</strong>
            <span style="color: #6b7280; margin-left: 10px;">${emailData.summary}</span>
          </div>
          
          <div style="margin: 15px 0;">
            <strong style="color: #374151;">Data:</strong>
            <span style="color: #6b7280; margin-left: 10px;">${emailData.date}</span>
          </div>
          
          <div style="margin: 15px 0;">
            <strong style="color: #374151;">Horário:</strong>
            <span style="color: #6b7280; margin-left: 10px;">${emailData.time} (Horário de Brasília)</span>
          </div>
          
          ${emailData.hangoutLink ? `
          <div style="margin: 20px 0;">
            <a href="${emailData.hangoutLink}" 
               style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 8px; font-weight: bold; margin: 5px 0;">
              🎥 Entrar no Google Meet
            </a>
          </div>
          ` : ''}
          
          <div style="margin: 20px 0;">
            <a href="${emailData.meetingLink}" 
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 8px; font-weight: bold;">
              📅 Ver no Google Calendar
            </a>
          </div>
        </div>
        
        <!-- Next Steps -->
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 16px;">📝 Próximos Passos</h3>
          <ul style="color: #78350f; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Você receberá um lembrete automático 1 hora antes da reunião</li>
            <li>Acesse o link do Google Meet na hora marcada</li>
            <li>Prepare suas dúvidas e objetivos para a conversa</li>
            <li>Em caso de dúvidas, responda este email</li>
          </ul>
        </div>
        
        <p style="color: #6b7280; line-height: 1.6; margin-top: 30px;">
          Estamos ansiosos para conversar sobre como podemos ajudar sua empresa!
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px; text-align: center;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">
          Atenciosamente,<br>
          <strong style="color: #374151;">Equipe Fluxomatika</strong>
        </p>
        <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
          Este email foi enviado automaticamente pela Eva, nossa assistente virtual.
        </p>
      </div>
    </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Eva <onboarding@resend.dev>',
        to: emailData.to,
        subject: `Reunião confirmada - ${emailData.date} às ${emailData.time}`,
        html: emailHtml
      })
    });

    const emailResult = await response.json();
    
    if (!response.ok) {
      throw new Error(`Resend API Error: ${response.status} - ${JSON.stringify(emailResult)}`);
    }

    console.log('✅ Email enviado com sucesso:', emailResult);
    return { success: true, data: emailResult };

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return { success: false, error: error.message };
  }
}

// TOOL 4: Create Google Calendar Event (APENAS CRIAÇÃO - SEM VERIFICAÇÃO PRÉVIA)
async function handleCreateEvent(req, res) {
  try {
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
    const accessToken = await getOAuth2AccessToken();
    const calendarId = 'primary';
    
    // Calculate end time if not provided (default: +30 minutes)  
    let startDate = new Date(start_time);
    
    // DEBUG: Log para investigar o problema de timezone
    console.log('=== CREATE CALENDAR EVENT ===');
    console.log('start_time recebido:', start_time);
    console.log('startDate inicial:', startDate.toISOString());
    
    // If no timezone info in start_time, assume Brazil timezone
    if (!start_time.includes('+') && !start_time.includes('Z') && !start_time.includes('-', 10)) {
      const brasilTime = start_time + '-03:00';
      startDate = new Date(brasilTime);
      console.log('startDate após correção:', startDate.toISOString());
    }
    
    console.log('startDate final:', startDate.toISOString());
    console.log('startDate hora Brasil:', startDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    
    const endDate = end_time ? new Date(end_time) : new Date(startDate.getTime() + 30 * 60 * 1000);

    // REMOVIDO: Verificação automática de disponibilidade
    // A verificação deve ser feita ANTES com check_availability
    console.log('Creating event directly (availability should be checked before)');
    console.log(`Event time: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Create event payload (COM GOOGLE MEET via OAuth2)
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
      conferenceData: {
        createRequest: {
          requestId: `eva-oauth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 }
        ]
      }
    };

    console.log('Creating Calendar Event with Google Meet:', eventPayload);
    
    // Google Calendar API call with OAuth2 (COM GOOGLE MEET)
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
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
      // Se houver erro, pode ser conflito ou outro problema
      console.error('Event creation failed:', response.status, data);
      
      // Verificar se é erro de conflito específico
      if (response.status === 409 || data.error?.message?.includes('conflict')) {
        return res.status(409).json({
          status: 'conflict',
          action: 'create_calendar_event',
          message: `Horário ${startDate.toLocaleString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit'
          })} já está ocupado. Use suggest_alternative_times para ver outras opções.`,
          data: {
            requested_time: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              start_br: startDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
              end_br: endDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            },
            suggestion: "Execute suggest_alternative_times para ver horários disponíveis"
          }
        });
      }
      
      throw new Error(`Google Calendar Error: ${response.status} - ${JSON.stringify(data)}`);
    }

    console.log('Event created successfully!');
    console.log('==============================');

    // ENVIAR EMAIL DE CONFIRMAÇÃO
    let emailSent = false;
    let emailError = null;
    
    try {
      const emailResult = await sendConfirmationEmail({
        to: attendee_email,
        clientName: attendee_name || attendee_email.split('@')[0],
        summary: summary,
        date: startDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        time: startDate.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        }),
        meetingLink: data.htmlLink,
        hangoutLink: data.hangoutLink || data.conferenceData?.entryPoints?.[0]?.uri
      });
      
      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailError = emailResult.error;
      }
      
    } catch (error) {
      console.error('Erro crítico no email:', error);
      emailError = error.message;
    }

    return res.status(200).json({
      status: 'success',
      action: 'create_calendar_event',
      message: emailSent ? 
        'Evento criado com Google Meet e email de confirmação enviado com sucesso!' :
        'Evento criado com Google Meet com sucesso! (Email teve problema, mas agendamento foi confirmado)',
      data: {
        event_id: data.id,
        event_link: data.htmlLink,
        hangout_link: data.hangoutLink || data.conferenceData?.entryPoints?.[0]?.uri,
        google_meet_link: data.conferenceData?.entryPoints?.[0]?.uri,
        conference_data: data.conferenceData,
        calendar_event: data,
        email_sent: emailSent,
        email_error: emailError
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
        hangout_link: data.hangoutLink || data.conferenceData?.entryPoints?.[0]?.uri
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
