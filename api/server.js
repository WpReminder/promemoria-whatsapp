import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Funzione di controllo autenticazione
function isAuthenticated(req) {
  const masterPassword = process.env.APP_PASSWORD;
  const cronSecret = process.env.CRON_SECRET;

  if (!masterPassword) {
    console.warn("⚠️ APP_PASSWORD non impostata. Accesso libero.");
    return true;
  }

  const authToken = req.cookies.auth_token;
  if (authToken === masterPassword) {
    return true;
  }

  const authHeader = req.headers.authorization;
  if (cronSecret && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === cronSecret) {
      return true;
    }
  }

  return false;
}

// Pagina di Login HTML
const loginHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: grid; place-items: center; min-height: 100vh; background-color: #f4f4f5; color: #18181b; margin: 0; }
      form { background: #ffffff; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
      h2 { font-size: 1.5rem; margin-bottom: 1.5rem; text-align: center; }
      input { display: block; width: 300px; padding: 0.75rem; font-size: 1rem; border: 1px solid #d4d4d8; border-radius: 0.25rem; margin-bottom: 1rem;}
      button { width: 100%; padding: 0.75rem; font-size: 1rem; background: #22c55e; color: white; border: none; border-radius: 0.25rem; margin-top: 0.5rem; cursor: pointer; transition: background 0.2s; }
      button:hover { background: #16a34a; }
    </style>
  </head>
  <body>
    <form action="/api/login" method="POST">
      <h2>🔒 Accesso Riservato</h2>
      <input type="password" name="password" placeholder="Inserisci la password" required autofocus />
      <button type="submit">Entra</button>
    </form>
  </body>
  </html>
`;

// Route: Login page
app.get('/login', (req, res) => {
  res.send(loginHtml);
});

// Route: Login POST
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const masterPassword = process.env.APP_PASSWORD;

  if (password === masterPassword) {
    res.cookie('auth_token', masterPassword, {
      httpOnly: true,
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
      sameSite: 'lax'
    });
    res.redirect('/');
  } else {
    console.warn('❌ Tentativo di login fallito');
    res.redirect('/login');
  }
});

// Middleware globale: proteggi tutto tranne login
app.use((req, res, next) => {
  const isPublicPath = (
    req.path === '/login' || 
    req.path === '/api/login' ||
    req.path === '/favicon.ico' ||
    req.path.startsWith('/_next') ||
    req.path.startsWith('/assets')
  );

  if (isPublicPath) {
    return next();
  }

  const authenticated = isAuthenticated(req);
  console.log(`🔐 ${req.method} ${req.path} - Auth: ${authenticated}`);

  if (!authenticated) {
    if (req.path.startsWith('/api/')) {
      console.log(`🚫 API bloccata: ${req.path}`);
      return res.status(401).json({ error: "Unauthorized" });
    } else {
      console.log(`🚫 Frontend bloccato, redirect a /login`);
      return res.redirect('/login');
    }
  }

  next();
});

// Importa le route dal tuo server compilato
let serverRoutes;
try {
  // Prova a importare il server compilato
  const serverModule = await import('../dist/index.js');
  console.log('✅ Server routes loaded from dist/index.js');
} catch (error) {
  console.error('⚠️ Could not load server routes:', error.message);
}

// API Routes protette (fallback se l'import non funziona)
app.get('/api/appointments', (req, res) => {
  res.status(503).json({ error: 'Service temporarily unavailable' });
});

app.post('/api/appointments', (req, res) => {
  res.status(503).json({ error: 'Service temporarily unavailable' });
});

app.get('/api/reminder', (req, res) => {
  res.status(401).json({ error: 'Unauthorized' });
});

app.post('/api/reminder', (req, res) => {
  res.status(401).json({ error: 'Unauthorized' });
});

// Serve static files - prova multipli path
let distPath;
const possiblePaths = [
  path.join(__dirname, '..', 'dist', 'public'),
  path.join(process.cwd(), 'dist', 'public'),
  path.join('/var/task', 'dist', 'public')
];

for (const testPath of possiblePaths) {
  console.log(`🔍 Testing path: ${testPath}`);
  if (fs.existsSync(testPath)) {
    distPath = testPath;
    console.log(`✅ Found dist at: ${distPath}`);
    break;
  }
}

if (!distPath) {
  console.error('❌ Could not find dist/public directory');
  console.log('📂 Current directory:', process.cwd());
  console.log('📂 __dirname:', __dirname);
  
  app.get('*', (req, res) => {
    res.status(500).send(`
      <h1>Configuration Error</h1>
      <p>Could not locate frontend files</p>
      <pre>Searched paths:\n${possiblePaths.join('\n')}</pre>
      <pre>CWD: ${process.cwd()}</pre>
      <pre>__dirname: ${__dirname}</pre>
    `);
  });
} else {
  app.use(express.static(distPath));

  // SPA fallback
  app.get('*', (req, res) => {
    const indexFile = path.join(distPath, 'index.html');
    if (fs.existsSync(indexFile)) {
      res.sendFile(indexFile);
    } else {
      res.status(404).send('Frontend file not found');
    }
  });
}

export default app;