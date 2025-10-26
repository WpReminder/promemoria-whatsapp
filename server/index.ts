import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";

const app = express();

app.use(express.json({
  verify: (req, _res, buf) => { (req as any).rawBody = buf; }
}));
app.use(express.urlencoded({ extended: false }));

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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // Serve static files in production
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    // risolvi percorso sempre dalla root effettiva di deploy
    const distPath = path.join(process.cwd(), "dist", "public");
    console.log("Serving static files from:", distPath);

    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      console.error("⚠️ index.html non trovato in", distPath);
    }

    app.use(express.static(distPath));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    log(`✅ Server running on port ${port}`);
  });
})();
