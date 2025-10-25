/**
 * Vercel Serverless Function for Appointments
 * 
 * This file is specifically for Vercel deployment.
 * It handles both GET (fetch appointments) and POST (create appointment) requests.
 */

import { Pool } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      // Fetch all appointments
      const result = await pool.query(
        'SELECT * FROM appointments ORDER BY datetime ASC'
      );
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      // Create new appointment
      const { name, phone, datetime } = req.body;

      // Basic validation
      if (!name || !phone || !datetime) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Frontend already sends UTC ISO string, use directly
      const result = await pool.query(
        'INSERT INTO appointments (name, phone, datetime, reminder_sent, created_at) VALUES ($1, $2, $3, false, NOW()) RETURNING *',
        [name, phone, datetime]
      );

      return res.status(201).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await pool.end();
  }
}
