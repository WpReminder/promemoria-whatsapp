import { Pool } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const result = await pool.query(`
      UPDATE appointments 
      SET reminder_sent = false 
      WHERE reminder_sent = true
      RETURNING id, name, datetime, phone, reminder_sent
    `);

    return res.status(200).json({
      success: true,
      message: `Resettati ${result.rowCount} appuntamenti`,
      appointments: result.rows.map(apt => ({
        id: apt.id,
        name: apt.name,
        datetime: new Date(apt.datetime).toLocaleString('it-IT', { timeZone: 'Europe/Rome' }),
        phone: apt.phone,
        reminder_sent: apt.reminder_sent
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    await pool.end();
  }
}