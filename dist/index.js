var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  appointments: () => appointments,
  insertAppointmentSchema: () => insertAppointmentSchema
});
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  datetime: timestamp("datetime", { mode: "string", withTimezone: true }).notNull(),
  reminderSent: boolean("reminder_sent").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).notNull().default(sql`now()`)
});
var insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  reminderSent: true,
  createdAt: true
}).extend({
  name: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  phone: z.string().regex(/^\+39\d{9,10}$/, "Numero non valido. Formato richiesto: +39XXXXXXXXX"),
  datetime: z.string().refine((date) => {
    const appointmentDate = new Date(date);
    return appointmentDate > /* @__PURE__ */ new Date();
  }, "La data dell'appuntamento deve essere futura")
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, and, lte, gte } from "drizzle-orm";
var DatabaseStorage = class {
  async getAllAppointments() {
    const result = await db.select().from(appointments).orderBy(appointments.datetime);
    return result;
  }
  async getAppointmentById(id) {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || void 0;
  }
  async createAppointment(insertAppointment) {
    const [appointment] = await db.insert(appointments).values(insertAppointment).returning();
    return appointment;
  }
  async updateReminderSent(id) {
    await db.update(appointments).set({ reminderSent: true }).where(eq(appointments.id, id));
  }
  async getPendingReminders(timeWindow) {
    const result = await db.select().from(appointments).where(
      and(
        eq(appointments.reminderSent, false),
        gte(appointments.datetime, timeWindow.start.toISOString()),
        lte(appointments.datetime, timeWindow.end.toISOString())
      )
    );
    return result;
  }
};
var storage = new DatabaseStorage();

// server/scheduler.ts
import cron from "node-cron";

// server/whatsapp.ts
import axios from "axios";
var WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";
var ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "YOUR_ACCESS_TOKEN_HERE";
var PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "YOUR_PHONE_NUMBER_ID_HERE";
async function sendWhatsAppReminder(message) {
  try {
    const phoneNumber = message.to.replace("+", "");
    const messageText = `Ciao ${message.name}, ti ricordiamo il tuo appuntamento alle ${message.appointmentTime} di oggi. A presto!`;
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: {
          body: messageText
        }
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`\u2705 WhatsApp reminder sent to ${message.name} (${message.to})`);
    return response.status === 200;
  } catch (error) {
    console.error("\u274C Error sending WhatsApp message:", error);
    if (ACCESS_TOKEN === "YOUR_ACCESS_TOKEN_HERE" || PHONE_NUMBER_ID === "YOUR_PHONE_NUMBER_ID_HERE") {
      console.error("\u26A0\uFE0F  WHATSAPP CREDENTIALS NOT CONFIGURED!");
      console.error("Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables");
    }
    return false;
  }
}

// server/scheduler.ts
import { format, parseISO, addHours } from "date-fns";
import { it } from "date-fns/locale";
var REMINDER_HOURS_BEFORE = 1;
async function processPendingReminders() {
  console.log(`\u{1F50D} Checking for appointments needing reminders (${REMINDER_HOURS_BEFORE}h before)...`);
  try {
    const now = /* @__PURE__ */ new Date();
    const targetTime = addHours(now, REMINDER_HOURS_BEFORE);
    const timeWindow = {
      start: now,
      end: targetTime
    };
    const pendingAppointments = await storage.getPendingReminders(timeWindow);
    if (pendingAppointments.length === 0) {
      console.log("\u2705 No pending reminders to send");
      return { sent: 0, failed: 0 };
    }
    console.log(`\u{1F4EC} Found ${pendingAppointments.length} reminder(s) to send`);
    let sent = 0;
    let failed = 0;
    for (const appointment of pendingAppointments) {
      const appointmentDate = parseISO(appointment.datetime);
      const formattedTime = format(appointmentDate, "HH:mm", { locale: it });
      const success = await sendWhatsAppReminder({
        to: appointment.phone,
        name: appointment.name,
        appointmentTime: formattedTime
      });
      if (success) {
        await storage.updateReminderSent(appointment.id);
        sent++;
        console.log(`\u2705 Reminder sent for ${appointment.name} - Appointment at ${formattedTime}`);
      } else {
        failed++;
        console.error(`\u274C Failed to send reminder for ${appointment.name}`);
      }
    }
    console.log(`\u{1F4CA} Reminder summary: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  } catch (error) {
    console.error("\u274C Error processing reminders:", error);
    return { sent: 0, failed: 0 };
  }
}
function startReminderScheduler() {
  const cronSchedule = "0 * * * *";
  cron.schedule(cronSchedule, async () => {
    console.log("\n\u23F0 Scheduled reminder check started at", (/* @__PURE__ */ new Date()).toISOString());
    await processPendingReminders();
  });
  console.log(`\u2705 Reminder scheduler started (runs: ${cronSchedule})`);
  console.log(`\u{1F4DD} Reminders will be sent ${REMINDER_HOURS_BEFORE} hour(s) before appointments
`);
}

// server/routes.ts
import { z as z2 } from "zod";
async function registerRoutes(app2) {
  app2.get("/api/appointments", async (_req, res) => {
    try {
      const appointments2 = await storage.getAllAppointments();
      res.json(appointments2);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });
  app2.post("/api/appointments", async (req, res) => {
    try {
      const validatedData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(validatedData);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ error: "Validation error", details: error.errors });
      } else {
        console.error("Error creating appointment:", error);
        res.status(500).json({ error: "Failed to create appointment" });
      }
    }
  });
  app2.post("/api/reminder", async (_req, res) => {
    try {
      const result = await processPendingReminders();
      res.json({
        success: true,
        message: `Processed reminders: ${result.sent} sent, ${result.failed} failed`,
        ...result
      });
    } catch (error) {
      console.error("Error processing reminders:", error);
      res.status(500).json({ error: "Failed to process reminders" });
    }
  });
  app2.get("/api/reminder", async (_req, res) => {
    res.json({
      status: "Reminder scheduler is running",
      message: "Use POST /api/reminder to manually trigger reminder processing"
    });
  });
  startReminderScheduler();
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
