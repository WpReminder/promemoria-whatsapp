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

async function sendWhatsAppMessage(phone, name, time) {
  try {
    const phoneNumber = phone.replace("+", "");
    const message = `Ciao ${name}, ti ricordiamo il tuo appuntamento alle ${time} di oggi. A presto!`;

    await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return true;
  } catch (error) {
    console.error('WhatsApp API error:', error);
    return false;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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
    const targetTime = new Date(now.getTime() + REMINDER_HOURS_BEFORE * 60 * 60 * 1000);

    console.log(`🔍 Cerco appuntamenti tra ${now.toISOString()} e ${targetTime.toISOString()}`);

    // Find appointments in the time window that haven't been reminded
    const result = await pool.query(
      `SELECT * FROM appointments 
       WHERE reminder_sent = false 
       AND datetime >= $1 
       AND datetime <= $2`,
      [now.toISOString(), targetTime.toISOString()]
    );

    const appointments = result.rows;
    console.log(`📅 Trovati ${appointments.length} appuntamenti da processare`);

    let sent = 0;
    let failed = 0;

    for (const appointment of appointments) {
      const appointmentDate = new Date(appointment.datetime);
      const time = appointmentDate.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      console.log(`📤 Invio reminder a ${appointment.name} (${appointment.phone}) per ${time}`);

      const success = await sendWhatsAppMessage(
        appointment.phone,
        appointment.name,
        time
      );

      if (success) {
        await pool.query(
          'UPDATE appointments SET reminder_sent = true WHERE id = $1',
          [appointment.id]
        );
        console.log(`✅ Reminder inviato con successo a ${appointment.name}`);
        sent++;
      } else {
        console.error(`❌ Fallito invio a ${appointment.name}`);
        failed++;
      }
    }

    console.log(`📊 Risultato: ${sent} inviati, ${failed} falliti su ${appointments.length} totali`);

    return res.status(200).json({
      success: true,
      message: `Processed ${appointments.length} reminders`,
      sent,
      failed,
      appointments: appointments.map(a => ({
        id: a.id,
        name: a.name,
        datetime: a.datetime
      }))
    });
  } catch (error) {
    console.error('💥 Reminder processing error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    await pool.end();
  }
}