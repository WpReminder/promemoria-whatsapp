/**
 * Vercel Serverless Function for Login - TEST VERSION
 */

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  const masterPassword = process.env.APP_PASSWORD;

  console.log('🔐 Login request received');

  if (!masterPassword) {
    console.warn("⚠️ APP_PASSWORD non impostata");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (password === masterPassword) {
    console.log('✅ Password corretta');
    
    // Prova cookie MOLTO semplice
    res.setHeader('Set-Cookie', `auth_token=${masterPassword}; Path=/; Max-Age=2592000`);
    
    return res.status(200).json({ 
      success: true,
      message: 'Cookie should be set',
      cookieValue: `auth_token=${masterPassword}`
    });
  } else {
    console.warn('❌ Password errata');
    return res.status(401).json({ error: 'Invalid password' });
  }
}