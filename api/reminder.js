/**
 * Vercel Serverless Function for Reminder Processing
 * 
 * This endpoint is called by cron-job.org every hour.
 * It checks for appointments happening in the next hour and sends WhatsApp reminders.
 */

import { Pool } from '@neondatabase/serverless';
import axios from 'axios';

// PLACEHOLDER: Set these in Vercel Environment Variables
const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "YOUR_ACCESS_TOKEN_HERE";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "YOUR_PHONE_NUMBER_ID_HERE";

/**
 * CONFIGURAZIONE TEMPO REMINDER
 * Modifica questo valore per cambiare quando inviare i reminder:
 * - 1 = un'ora prima (default)
 * - 2 = due ore prima
 * - 0.5 = 30 minuti prima
 */
const REMINDER_HOURS_BEFORE = 1;

/**
 * MARGINE DI SICUREZZA (in minuti)
 * Finestra temporale per catturare appuntamenti anche se il timing non è perfetto
 */
const WINDOW_MARGIN_MINUTES = 5;

async function sendWhatsAppMessage(phone, name, time) {
  try {
    const phoneNumber = phone.replace(/[^0-9]/g, "");

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
          name: "promemoria_appuntamento",
          language: {
            code: "it"
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: name  // {{1}} = nome
                },
                {
                  type: "text",
                  text: time  // {{2}} = ora
                }
              ]
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ WhatsApp API response:`, response.data);
    
    if (response.data.messages && response.data.messages.length > 0) {
      return { success: true, messageId: response.data.messages[0].id };
    } else {
      console.error('⚠️ WhatsApp response senza message ID:', response.data);
      return { success: false, error: 'No message ID in response' };
    }
  } catch (error) {
    console.error('❌ WhatsApp API error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://promemoria-whatsapp.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Accetta sia GET che POST
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // AUTENTICAZIONE DOPPIA: Bearer token (cron-job.org) O Cookie (accesso manuale)
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  
  // Controlla Bearer token
  const isValidBearer = authHeader === expectedToken;
  
  // Controlla cookie
  const cookies = req.headers.cookie || '';
  const cookieToken = cookies
    .split(';')
    .find(c => c.trim().startsWith('auth_token='))
    ?.split('=')[1];
  const isValidCookie = cookieToken === process.env.APP_PASSWORD;

  // Se NESSUNO dei due è valido → 401
  if (!isValidBearer && !isValidCookie) {
    console.warn('❌ Accesso non autorizzato a /api/reminder');
    console.log('Auth header:', authHeader);
    console.log('Expected token:', expectedToken);
    console.log('Cookie token:', cookieToken);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('✅ Autenticato via:', isValidBearer ? 'Bearer token (cron-job.org)' : 'Cookie (accesso manuale)');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const now = new Date();
    
    // Calcola la finestra temporale con margine di sicurezza
    const targetTime = now.getTime() + (REMINDER_HOURS_BEFORE * 60 * 60 * 1000);
    const windowStart = new Date(targetTime - (WINDOW_MARGIN_MINUTES * 60 * 1000));
    const windowEnd = new Date(targetTime + (WINDOW_MARGIN_MINUTES * 60 * 1000));

    console.log('🕒 === INFORMAZIONI TEMPORALI ===');
    console.log(`⏰ Ora server (UTC): ${now.toISOString()}`);
    console.log(`🇮🇹 Ora italiana: ${now.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);
    console.log(`🎯 Target (UTC): ${new Date(targetTime).toISOString()}`);
    console.log(`🎯 Target (IT): ${new Date(targetTime).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);
    console.log(`📅 Finestra ricerca (UTC): ${windowStart.toISOString()} → ${windowEnd.toISOString()}`);
    console.log(`📅 Finestra ricerca (IT): ${windowStart.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })} → ${windowEnd.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);

    // Find appointments in the time window that haven't been reminded
    const result = await pool.query(
      `SELECT * FROM appointments 
       WHERE reminder_sent = false 
       AND datetime >= $1 
       AND datetime <= $2
       ORDER BY datetime ASC`,
      [windowStart, windowEnd]
    );

    const appointments = result.rows;
    console.log(`📋 Trovati ${appointments.length} appuntamenti da processare`);

    if (appointments.length > 0) {
      console.log('📝 Dettagli appuntamenti:');
      appointments.forEach(apt => {
        console.log(`  - ID ${apt.id}: ${apt.name} alle ${new Date(apt.datetime).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })} (${apt.phone})`);
      });
    }

    let sent = 0;
    let failed = 0;
    const results = [];

    for (const appointment of appointments) {
      const appointmentDate = new Date(appointment.datetime);
      const time = appointmentDate.toLocaleTimeString('it-IT', { 
        timeZone: 'Europe/Rome',
        hour: '2-digit', 
        minute: '2-digit' 
      });

      console.log(`📤 Invio reminder a ${appointment.name} (${appointment.phone}) per le ${time}`);

      const result = await sendWhatsAppMessage(
        appointment.phone,
        appointment.name,
        time
      );

      if (result.success) {
        // IMPORTANTE: Marca come inviato SOLO se WhatsApp ha confermato
        await pool.query(
          'UPDATE appointments SET reminder_sent = true WHERE id = $1',
          [appointment.id]
        );
        console.log(`✅ Reminder inviato con successo a ${appointment.name} (Message ID: ${result.messageId})`);
        sent++;
        results.push({
          id: appointment.id,
          name: appointment.name,
          datetime: appointment.datetime,
          status: 'sent',
          message_id: result.messageId
        });
      } else {
        // NON marcare come inviato se fallisce
        console.error(`❌ Fallito invio a ${appointment.name}:`, result.error);
        failed++;
        results.push({
          id: appointment.id,
          name: appointment.name,
          datetime: appointment.datetime,
          status: 'failed',
          error: result.error
        });
      }
    }

    console.log(`📊 === RISULTATO FINALE ===`);
    console.log(`✅ Inviati: ${sent}`);
    console.log(`❌ Falliti: ${failed}`);
    console.log(`📋 Totali: ${appointments.length}`);

    return res.status(200).json({
      success: true,
      message: `Processed ${appointments.length} reminders`,
      sent,
      failed,
      results
    });
  } catch (error) {
    console.error('💥 Reminder processing error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  } finally {
    await pool.end();
  }
}