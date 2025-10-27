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

  if (!masterPassword) {
    console.warn("⚠️ APP_PASSWORD non impostata. Accesso libero.");
    return true;
  }

  const authToken = req.cookies.auth_token;
  if (authToken === masterPassword) {
    return true;
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
    <title>Login - Promemoria WhatsApp</title>
    <style>
      body { 
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
        display: grid; 
        place-items: center; 
        min-height: 100vh; 
        background-color: #f4f4f5; 
        color: #18181b; 
        margin: 0; 
      }
      form { 
        background: #ffffff; 
        padding: 2rem; 
        border-radius: 0.5rem; 
        box-shadow: 0 4px 10px rgba(0,0,0,0.1); 
      }
      h2 { 
        font-size: 1.5rem; 
        margin-bottom: 1.5rem; 
        text-align: center; 
      }
      input { 
        display: block; 
        width: 300px; 
        padding: 0.75rem; 
        font-size: 1rem; 
        border: 1px solid #d4d4d8; 
        border-radius: 0.25rem; 
        margin-bottom: 1rem;
      }
      button { 
        width: 100%; 
        padding: 0.75rem; 
        font-size: 1rem; 
        background: #22c55e; 
        color: white; 
        border: none; 
        border-radius: 0.25rem; 
        margin-top: 0.5rem; 
        cursor: pointer; 
        transition: background 0.2s; 
      }
      button:hover { 
        background: #16a34a; 
      }
      .error {
        color: #ef4444;
        text-align: center;
        margin-top: 1rem;
        font-size: 0.875rem;
      }
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
    
    // Redirect con HTML + JS per compatibilità massima
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="refresh" content="0;url=/" />
        <title>Login Successful</title>
      </head>
      <body>
        <p>Login effettuato. Reindirizzamento...</p>
        <script>window.location.href = '/';</script>
      </body>
      </html>
    `);
  } else {
    console.warn('❌ Tentativo di login fallito');
    res.send(loginHtml + '<div class="error">❌ Password errata. Riprova.</div>');
  }
});

// Trova la directory dist
let distPath;
const possiblePaths = [
  path.join(__dirname, '..', 'dist', 'public'),
  path.join(process.cwd(), 'dist', 'public'),
  path.join('/var/task', 'dist', 'public')
];

for (const testPath of possiblePaths) {
  if (fs.existsSync(testPath)) {
    distPath = testPath;
    console.log(`✅ Found dist at: ${distPath}`);
    break;
  }
}

if (!distPath) {
  console.error('❌ Could not find dist/public directory');
  app.use('*', (req, res) => {
    res.status(500).send('Frontend files not found');
  });
} else {
  // Gli asset DEVONO essere pubblici per il funzionamento della pagina di login
  app.use('/assets', express.static(path.join(distPath, 'assets')));
  
  // TUTTO il resto richiede autenticazione
  app.use((req, res, next) => {
    const authenticated = isAuthenticated(req);
    console.log(`📄 ${req.method} ${req.path} - Auth: ${authenticated}`);
    
    if (!authenticated) {
      console.log(`🚫 Serving login for ${req.path}`);
      return res.send(loginHtml);
    }
    
    next();
  });
  
  // Serve static files (solo se autenticato grazie al middleware sopra)
  app.use(express.static(distPath));

  // SPA fallback
  app.get('*', (req, res) => {
    const indexFile = path.join(distPath, 'index.html');
    if (fs.existsSync(indexFile)) {
      res.sendFile(indexFile);
    } else {
      res.status(404).send('Page not found');
    }
  });
}

export default app;