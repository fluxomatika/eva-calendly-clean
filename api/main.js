// api/main.js - Eva Enhanced com verificação de disponibilidade + EMAIL AUTOMÁTICO
const nodemailer = require('nodemailer'); // NOVO: Para envio de emails

// NOVO: Configuração SMTP para emails automáticos
const emailTransporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'fluxomatika@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// NOVO: Função para enviar email de confirmação automático
async function sendConfirmationEmail(eventDetails) {
  const { summary, attendee_name, attendee_email, start_time, event_link } = eventDetails;
  
  // Formatar data e hora em português brasileiro
  const startDate = new Date(start_time);
  const dateStr = startDate.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeStr = startDate.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Template de email profissional
  const emailBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      
      <!-- Container principal -->
      <div style="background-color: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
        
        <!-- Header com gradiente -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">✅ Reunião Confirmada!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px;">Tudo certo, ${attendee_name}! Sua reunião está agendada.</p>
        </div>

        <!-- Conteúdo principal -->
        <div style="padding: 35px 30px;">
          
          <!-- Detalhes da reunião em destaque -->
          <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 10px; margin-bottom: 30px; border-left: 5px solid #667eea;">
            <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 22px; display: flex; align-items: center;">
              📋 ${summary}
            </h2>
            
            <div style="display: grid; gap: 15px;">
              <div style="display: flex; align-items: center;">
                <span style="background-color: #667eea; color: white; padding: 8px 12px; border-radius: 6px; font-weight: 600; margin-right: 15px; min-width: 80px; text-align: center;">📅 DATA</span>
                <span style="color: #2c3e50; font-size: 16px; font-weight: 500;">${dateStr}</span>
              </div>
              
              <div style="display: flex; align-items: center;">
                <span style="background-color: #28a745; color: white; padding: 8px 12px; border-radius: 6px; font-weight: 600; margin-right: 15px; min-width: 80px; text-align: center;">🕒 HORA</span>
                <span style="color: #2c3e50; font-size: 16px; font-weight: 500;">${timeStr}</span>
              </div>
              
              <div style="display: flex; align-items: center;">
                <span style="background-color: #ffc107; color: #2c3e50; padding: 8px 12px; border-radius: 6px; font-weight: 600; margin-right: 15px; min-width: 80px; text-align: center;">⏱️ TEMPO</span>
                <span style="color: #2c3e50; font-size: 16px; font-weight: 500;">30 minutos</span>
              </div>
            </div>
          </div>

          <!-- Próximos passos -->
          <div style="background-color: #e8f5e8; padding: 25px; border-radius: 10px; border: 2px solid #28a745; margin-bottom: 25px;">
            <h3 style="color: #28a745; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center;">
              💡 Próximos Passos
            </h3>
            <ul style="color: #2c3e50; margin: 0; padding-left: 0; list-style: none; line-height: 1.8;">
              <li style="margin-bottom: 8px; display: flex; align-items: flex-start;">
                <span style="color: #28a745; margin-right: 10px; font-weight: bold;">✓</span>
                <span>Você receberá um lembrete automático 15 minutos antes</span>
              </li>
              <li style="margin-bottom: 8px; display: flex; align-items: flex-start;">
                <span style="color: #28a745; margin-right: 10px; font-weight: bold;">✓</span>
                <span>Tenha em mãos documentos ou informações relevantes</span>
              </li>
              <li style="margin-bottom: 0; display: flex; align-items: flex-start;">
                <span style="color: #28a745; margin-right: 10px; font-weight: bold;">✓</span>
                <span>Para reagendar, entre em contato conosco com antecedência</span>
              </li>
            </ul>
          </div>

          <!-- Informações de contato -->
          <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 25px;">
            <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px;">📞 Precisa de Ajuda?</h3>
            <p style="color: #5a6c7d; margin: 0 0 15px 0; line-height: 1.5;">
              Entre em contato conosco a qualquer momento:
            </p>
            <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
              <a href="mailto:fluxomatika@gmail.com" style="background-color: #667eea; color: white; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center;">
                📧 Email
              </a>
              <a href="https://wa.me/5564999999999" style="background-color: #25d366; color: white; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center;">
                💬 WhatsApp
              </a>
            </div>
          </div>

          <!-- Call to action -->
          <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white;">
            <h3 style="margin: 0 0 10px 0; font-size: 20px;">🚀 Estamos Ansiosos!</h3>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">
              Obrigado pela confiança. Até breve, ${attendee_name}!
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; margin: 0; font-size: 14px; line-height: 1.5;">
            Agendamento realizado via <strong style="color: #667eea;">EVA - Assistente Inteligente</strong><br>
            Este é um email automático. Para cancelar ou reagendar, entre em contato conosco.
          </p>
        </div>

      </div>
    </div>
  `;

  // Configurações do email
  const mailOptions = {
    from: '"🤖 Eva Assistente" <fluxomatika@gmail.com>',
    to: attendee_email,
    subject: `✅ Reunião Confirmada - ${summary} - ${dateStr}`,
    html: emailBody,
    headers: {
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'X-Mailer': 'EVA Assistant v2.0'
    }
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Email enviado com sucesso:', info.messageId);
    return {
      success: true,
      message: 'Email de confirmação enviado com sucesso',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return {
      success: false,
      message: 'Erro ao enviar email de confirmação',
      error: error.message
    };
  }
}

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
      action: 'create_calendar_event',
      message: 'Evento criado com sucesso! Email de confirmação enviado.',
      data: {
        event_id: data.id,
        event_link: data.htmlLink,
        hangout_link: data.hangoutLink,
        calendar_event: data
      },
      email_status: {
        sent: emailResult.success,
        message: emailResult.message,
        message_id: emailResult.messageId || null
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
      if (busyTimes.length > 0) {
        console.log(`${hour}h - CONFLICTS:`, busyTimes);
      }
      
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

// TOOL 4: Create Google Calendar Event (with automatic availability check + EMAIL AUTOMÁTICO)
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
    const calendarId = 'fluxomatika@gmail.com';
    
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

    // AUTOMATIC AVAILABILITY CHECK BEFORE CREATING EVENT
    console.log('Checking availability before creating event...');
    console.log(`Requested time: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
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
    const busyTimes = freeBusyData.calendars[calendarId]?.busy || [];
    
    // If time slot is busy, return conflict error with detailed message
    if (busyTimes.length > 0) {
      console.log('Time slot is busy, returning conflict error');
      console.log('Conflicting events:', busyTimes);
      
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
          conflicting_events: busyTimes.map(busy => ({
            start: busy.start,
            end: busy.end,
            start_br: new Date(busy.start).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            end_br: new Date(busy.end).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
          })),
          suggestion: "Execute suggest_alternative_times para ver horários disponíveis"
        }
      });
    }

    console.log('Time slot is available, proceeding with event creation...');

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

    // NOVO: ENVIAR EMAIL AUTOMÁTICO APÓS SUCESSO DO EVENTO
    console.log('Evento criado com sucesso, enviando email de confirmação...');
    
    const emailResult = await sendConfirmationEmail({
      summary,
      attendee_name: attendee_name || attendee_email.split('@')[0],
      attendee_email,
      start_time: startDate.toISOString(),
      event_link: data.htmlLink
    });

    console.log('Resultado do email:', emailResult);

    return res.status(200).json({
      status: 'success',
