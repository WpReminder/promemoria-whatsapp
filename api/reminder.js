/**
 * Vercel Serverless Function for Reminder Processing
 * 
 * This endpoint is called by Vercel Cron Jobs every hour.
 * It checks for appointments happening in the next hour and sends WhatsApp reminders.
 * 
 * IMPORTANT: Configure this in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/reminder",
 *     "schedule": "0 * * * *"
 *   }]
 * }
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
  // Verify request is from Vercel Cron or manual trigger
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow manual triggers without auth in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const now = new Date();
    const targetTime = new Date(now.getTime() + REMINDER_HOURS_BEFORE * 60 * 60 * 1000);

    // Find appointments in the time window that haven't been reminded
    const result = await pool.query(
      `SELECT * FROM appointments 
       WHERE reminder_sent = false 
       AND datetime >= $1 
       AND datetime <= $2`,
      [now.toISOString(), targetTime.toISOString()]
    );

    const appointments = result.rows;
    let sent = 0;
    let failed = 0;

    for (const appointment of appointments) {
      const appointmentDate = new Date(appointment.datetime);
      const time = appointmentDate.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

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
        sent++;
      } else {
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${appointments.length} reminders`,
      sent,
      failed,
    });
  } catch (error) {
    console.error('Reminder processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await pool.end();
  }
}
