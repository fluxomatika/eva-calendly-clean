// api/main.js - EVA Sistema Completo com Email SMTP
import { google } from 'googleapis';
import nodemailer from 'nodemailer';

const GOOGLE_SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const calendarId = 'fluxomatika@gmail.com';

// Configuração Calendar API
const auth = new google.auth.JWT(
  GOOGLE_SERVICE_ACCOUNT.client_email,
  null,
  GOOGLE_SERVICE_ACCOUNT.private_key,
  ['https://www.googleapis.com/auth/calendar']
);

const calendar = google.calendar({ version: 'v3', auth });

// Configuração SMTP para envio de emails
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'fluxomatika@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD // App Password específica
  }
});

// Função para enviar email de confirmação via SMTP
async function sendConfirmationEmail(eventDetails) {
  const { summary, start, attendee_email, attendee_name } = eventDetails;
  
  // Formatar data e hora em português
  const startDate = new Date(start.dateTime);
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

  // Template de email profissional otimizado
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
              <li style="margin-bottom: 8px; display: flex; align-items:
