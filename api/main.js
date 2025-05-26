// api/main.js - Eva Enhanced FUNCIONAL (sem Google Meet por enquanto)
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

// TOOL 4: Create Google Calendar Event (SEM GOOGLE MEET por enquanto)
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
    let startDate = new Date(start_time);
    
    // DEBUG: Log para investigar o problema de timezone
    console.log('=== DEBUG TIMEZONE EMAIL ===');
    console.log('start_time recebido:', start_time);
    console.log('startDate inicial:', startDate.toISOString());
    console.log('startDate hora UTC:', startDate.getUTCHours());
    
    // CORREÇÃO DE TIMEZONE - se não tem timezone, interpretar como horário do Brasil
    if (!start_time.includes('+') && !start_time.includes('Z') && !start_time.includes('-', 10)) {
      // Se Eva enviou "2025-05-27T09:00:00", significa 9h no Brasil
      // Precisamos converter para UTC: 9h Brasil = 12h UTC
      const [datePart, timePart] = start_time.split('T');
      const [hours, minutes, seconds] = timePart.split(':');
      
      // Criar data interpretando como hora do Brasil (UTC-3)
      startDate = new Date(datePart + 'T' + timePart + '-03:00');
      
      console.log('Interpretado como horário Brasil (UTC-3):', startDate.toISOString());
    }
    
    console.log('startDate final:', startDate.toISOString());
    console.log('startDate hora Brasil:', startDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    console.log('Hora que deve aparecer no email:', startDate.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    }));
    console.log('========================');
    
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

    // Create event payload (COM Google Meet - configuração simplificada)
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
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

    console.log('Creating Calendar Event:', eventPayload);
    
    // Google Calendar API call with Service Account (COM Google Meet)
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
      throw new Error(`Google Calendar Error: ${response.status} - ${JSON.stringify(data)}`);
    }

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
        hangoutLink: data.hangoutLink || null
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
        'Evento criado e email de confirmação enviado com sucesso!' :
        'Evento criado com sucesso! (Email teve problema, mas agendamento foi confirmado)',
      data: {
        event_id: data.id,
        event_link: data.htmlLink,
        hangout_link: data.hangoutLink || null,
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
        hangout_link: data.hangoutLink || null
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
