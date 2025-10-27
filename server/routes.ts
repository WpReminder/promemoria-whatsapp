import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAppointmentSchema } from "@shared/schema";
import { processPendingReminders, startReminderScheduler } from "./scheduler";
import { z } from "zod";

// Middleware di protezione API
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const masterPassword = process.env.APP_PASSWORD;
  const cronSecret = process.env.CRON_SECRET;

  if (!masterPassword) {
    console.warn("⚠️ APP_PASSWORD non impostata");
    return next();
  }

  // Check 1: Cookie utente
  const authToken = req.cookies?.auth_token;
  if (authToken === masterPassword) {
    return next();
  }

  // Check 2: Bearer token per cron
  const authHeader = req.headers.authorization;
  if (cronSecret && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === cronSecret) {
      return next();
    }
  }

  // Non autenticato
  console.log(`🚫 API bloccata: ${req.method} ${req.path}`);
  return res.status(401).json({ error: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // LOGIN endpoint (pubblico)
  app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const masterPassword = process.env.APP_PASSWORD;

    if (password === masterPassword) {
      res.cookie('auth_token', masterPassword, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });
      res.redirect('/');
    } else {
      console.warn('❌ Tentativo di login fallito');
      res.redirect('/login');
    }
  });

  // PROTEGGI TUTTE LE API QUI SOTTO
  
  // GET /api/appointments - PROTETTO
  app.get("/api/appointments", requireAuth, async (_req, res) => {
    try {
      const appointments = await storage.getAllAppointments();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // POST /api/appointments - PROTETTO
  app.post("/api/appointments", requireAuth, async (req, res) => {
    try {
      const validatedData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(validatedData);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation error", details: error.errors });
      } else {
        console.error("Error creating appointment:", error);
        res.status(500).json({ error: "Failed to create appointment" });
      }
    }
  });

  // POST /api/reminder - PROTETTO (solo cron con Bearer token)
  app.post("/api/reminder", requireAuth, async (_req, res) => {
    try {
      const result = await processPendingReminders();
      res.json({
        success: true,
        message: `Processed reminders: ${result.sent} sent, ${result.failed} failed`,
        ...result,
      });
    } catch (error) {
      console.error("Error processing reminders:", error);
      res.status(500).json({ error: "Failed to process reminders" });
    }
  });

  // GET /api/reminder - PROTETTO
  app.get("/api/reminder", requireAuth, async (_req, res) => {
    res.json({
      status: "Reminder scheduler is running",
      message: "Use POST /api/reminder to manually trigger reminder processing",
    });
  });

  startReminderScheduler();

  const httpServer = createServer(app);
  return httpServer;
}