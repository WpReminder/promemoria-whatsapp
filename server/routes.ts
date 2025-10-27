import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAppointmentSchema } from "@shared/schema";
import { processPendingReminders, startReminderScheduler } from "./scheduler";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // --- ENDPOINT DI LOGIN (IMPOSTA COOKIE) ---
  app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const masterPassword = process.env.APP_PASSWORD;

    if (password === masterPassword) {
      // Password corretta! Imposta il cookie.
      res.cookie('auth_token', masterPassword, {
        httpOnly: true, // Impedisce l'accesso al cookie da JavaScript nel browser
        secure: process.env.NODE_ENV !== 'development', // Usa solo HTTPS in produzione
        maxAge: 30 * 24 * 60 * 60 * 1000, // Scadenza dopo 30 giorni
        path: '/',
      });
      // Reindirizza l'utente alla pagina principale (l'app React)
      res.redirect('/');
    } else {
      // Password errata
      console.warn('Tentativo di login fallito');
      // Reindirizza l'utente alla pagina di login
      res.redirect('/login');
    }
  });

  // --- FINE ROTTE AUTENTICAZIONE ---

  // GET /api/appointments - Get all appointments
  app.get("/api/appointments", async (_req, res) => {
    try {
      const appointments = await storage.getAllAppointments();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // POST /api/appointments - Create new appointment
  app.post("/api/appointments", async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertAppointmentSchema.parse(req.body);

      // Frontend already sends UTC ISO string, no conversion needed
      // Create appointment directly
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

  // POST /api/reminder - Trigger for reminder processing (solo per cron job)
  app.post("/api/reminder", async (_req, res) => {
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

  // GET /api/reminder - Solo per debug, status informativo (invariato)
  app.get("/api/reminder", async (_req, res) => {
    res.json({
      status: "Reminder scheduler is running",
      message: "Use POST /api/reminder to manually trigger reminder processing",
    });
  });

  // Start the automatic reminder scheduler
  startReminderScheduler();

  const httpServer = createServer(app);

  return httpServer;
}
