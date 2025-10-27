/**
 * Vercel Serverless Function - Check Authentication
 */

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin || 'https://promemoria-whatsapp.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Leggi il cookie dal server
  const cookies = req.headers.cookie || '';
  const authToken = cookies
    .split(';')
    .find(c => c.trim().startsWith('auth_token='))
    ?.split('=')[1];

  const masterPassword = process.env.APP_PASSWORD;

  if (authToken === masterPassword) {
    return res.status(200).json({ authenticated: true });
  } else {
    return res.status(401).json({ authenticated: false });
  }
}