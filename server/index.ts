import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import cookieParser from 'cookie-parser'; // Importa cookie-parser

const app = express();

app.use(express.json({
  verify: (req, _res, buf) => { (req as any).rawBody = buf; }
}));
app.use(express.urlencoded({ extended: false }));

// --- SEZIONE AUTENTICAZIONE (GATE) ---

// 1. Usa il middleware per leggere i cookie
app.use(cookieParser());

// 2. Pagina di Login (HTML semplice)
const loginHtml = `
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: grid; place-items: center; min-height: 100vh; background-color: #f4f4f5; color: #18181b; }
    form { background: #ffffff; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    h2 { font-size: 1.5rem; margin-bottom: 1.5rem; text-align: center; }
    input { display: block; width: 300px; padding: 0.75rem; font-size: 1rem; border: 1px solid #d4d4d8; border-radius: 0.25rem; margin-bottom: 1rem;}
    button { width: 100%; padding: 0.75rem; font-size: 1rem; background: #22c55e; color: white; border: none; border-radius: 0.25rem; margin-top: 0.5rem; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #16a34a; }
  </style>
  <form action="/api/login" method="POST">
    <h2>Accesso Riservato</h2>
    <input type="password" name="password" placeholder="Inserisci la password" required />
    <button type="submit">Entra</button>
  </form>
`;
app.get('/login', (_req, res) => {
  res.status(401).send(loginHtml);
});

// 3. Middleware "Buttafuori" GLOBALE
// Controlla *ogni* richiesta PRIMA che raggiunga i file statici e le API protette.
app.use((req, res, next) => {
  const masterPassword = process.env.APP_PASSWORD;
  const cronSecret = process.env.CRON_SECRET; 

  // Se APP_PASSWORD non è impostata, l'ambiente non è protetto.
  if (!masterPassword) {
    console.warn("ATTENZIONE: Variabile APP_PASSWORD non impostata. Accesso libero.");
    return next();
  }

  // Check 1: L'utente ha un cookie di login valido (Autenticazione Umano)?
  const authToken = req.cookies.auth_token;
  const hasValidCookie = (authToken === masterPassword);

  // Check 2: Il servizio esterno ha un token API valido (Autenticazione Macchina)?
  const authHeader = req.headers.authorization;
  let hasValidCronSecret = false;
  if (cronSecret && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]; 
    if (token === cronSecret) {
      hasValidCronSecret = true;
    }
  }

  // Check 3: L'utente sta cercando di accedere alle pagine pubbliche (login)?
  const isPublicPath = (
    req.path === '/login' || 
    req.path === '/api/login' ||
    req.path === '/favicon.ico'
  );

  // DECISIONE FINALE: Lascia passare se è loggato, è un cron job, o sta accedendo a una pagina pubblica.
  if (
    hasValidCookie ||      
    hasValidCronSecret ||   
    isPublicPath            
  ) {
    next(); 
  } else {
    // --- LOGICA DI BLOCCO AGGIORNATA ---
    
    // Se la richiesta è per un endpoint API, rispondiamo con 401 JSON
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Altrimenti, è una richiesta per il frontend/asset: reindirizza al login
    res.redirect('/login');
    // --- FINE LOGICA DI BLOCCO ---
  }
});
// --- FINE SEZIONE AUTENTICAZIONE ---


// Logging middleware (ORA QUI DOPO IL CHECK DI SICUREZZA)
app.use((req, res, next) => {
  const start = Date.now();
  const pathReq = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    if (pathReq.startsWith("/api")) {
      let logLine = `${req.method} ${pathReq} ${res.statusCode} in ${Date.now() - start}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      log(logLine.length > 80 ? logLine.slice(0, 79) + "…" : logLine);
    }
  });
  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

// ====================================================================
// IL SERVIZIO DI VITE/STATIC (FRONTEND) DEVE ESSERE DOPO L'AUTENTICAZIONE
// ====================================================================
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    // --- INIZIO BLOCCO MODIFICATO ---
    
    const distPath = path.join(process.cwd(), "dist", "public");
    console.log("📂 CERCO I FILE QUI:", distPath);
    console.log("📄 index.html ESISTE?", fs.existsSync(path.join(distPath, "index.html")));

    // 1. Serve i file statici (CSS, JS, assets)
    app.use(express.static(distPath));

    // 2. Serviamo ESPLICITAMENTE la pagina principale (index.html) per la root e per le rotte SPA
    const sendIndexFile = (_req: Request, res: Response) => {
      const indexFile = path.join(distPath, "index.html");
      if (!fs.existsSync(indexFile)) {
        console.error("❌ index.html non trovato in:", indexFile);
        return res.status(500).send("index.html non trovato");
      }
      res.sendFile(indexFile);
    };
    
    // Serve la root esplicitamente (questo è il punto critico)
    app.get("/", sendIndexFile); 

    // Catch-all per tutte le altre rotte SPA (es. /appointments, /settings)
    app.get("*", sendIndexFile); 

    // --- FINE BLOCCO MODIFICATO ---
  }

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    log(`✅ Server running on port ${port}`);
  });
})();
