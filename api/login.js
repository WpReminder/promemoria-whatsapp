/**
 * Vercel Serverless Function for Login
 */

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin || 'https://promemoria-whatsapp.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  const masterPassword = process.env.APP_PASSWORD;

  if (!masterPassword) {
    console.warn("⚠️ APP_PASSWORD non impostata");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (password === masterPassword) {
    res.setHeader('Set-Cookie', 
      `auth_token=${masterPassword}; HttpOnly; Secure; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`
    );
    
    return res.status(200).json({ success: true });
  } else {
    console.warn('❌ Tentativo di login fallito');
    return res.status(401).json({ error: 'Invalid password' });
  }
}