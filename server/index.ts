import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import cookieParser from 'cookie-parser';

const app = express();

app.use(express.json({
  verify: (req, _res, buf) => { (req as any).rawBody = buf; }
}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Funzione di controllo autenticazione (ESPORTABILE)
export function isAuthenticated(req: Request): boolean {
  const masterPassword = process.env.APP_PASSWORD;
  const cronSecret = process.env.CRON_SECRET;

  if (!masterPassword) {
    console.warn("⚠️ APP_PASSWORD non impostata. Accesso libero.");
    return true;
  }

  // Check cookie utente
  const authToken = req.cookies.auth_token;
  if (authToken === masterPassword) {
    return true;
  }

  // Check Bearer token per cron
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

// Serve pagina login (PUBBLICO)
app.get('/login', (_req, res) => {
  res.send(loginHtml);
});

// MIDDLEWARE GLOBALE DI AUTENTICAZIONE
app.use((req, res, next) => {
  const isPublicPath = (
    req.path === '/login' || 
    req.path === '/api/login' ||
    req.path === '/favicon.ico'
  );

  // Permetti accesso a pagine pubbliche
  if (isPublicPath) {
    return next();
  }

  // Controlla autenticazione
  const authenticated = isAuthenticated(req);
  
  console.log(`🔐 ${req.method} ${req.path} - Auth: ${authenticated}`);

  if (!authenticated) {
    // Non autenticato
    if (req.path.startsWith('/api/')) {
      console.log(`🚫 API bloccata: ${req.path}`);
      return res.status(401).json({ error: "Unauthorized" });
    } else {
      console.log(`🚫 Frontend bloccato, redirect a /login`);
      return res.redirect('/login');
    }
  }

  // Autenticato: procedi
  next();
});

// Logging middleware
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
  // Registra le routes (DOPO il middleware di autenticazione)
  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`❌ Error ${status}:`, message);
    res.status(status).json({ message });
  });

  // Serving frontend
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    const distPath = path.join(process.cwd(), "dist", "public");
    console.log("📂 Serving static files from:", distPath);
    console.log("📄 index.html exists:", fs.existsSync(path.join(distPath, "index.html")));

    // Serve static files
    app.use(express.static(distPath));

    // SPA fallback
    app.get("*", (_req, res) => {
      const indexFile = path.join(distPath, "index.html");
      if (!fs.existsSync(indexFile)) {
        console.error("❌ index.html not found");
        return res.status(500).send("Application error: index.html not found");
      }
      res.sendFile(indexFile);
    });
  }

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    log(`✅ Server running on port ${port}`);
  });
})();