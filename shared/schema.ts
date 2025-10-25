import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Appointments table schema
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  datetime: timestamp("datetime", { mode: 'string', withTimezone: true }).notNull(),
  reminderSent: boolean("reminder_sent").notNull().default(false),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().default(sql`now()`),
});

// Insert schema with validation
export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  reminderSent: true,
  createdAt: true,
}).extend({
  name: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  phone: z.string().regex(/^\+39\d{9,10}$/, "Numero non valido. Formato richiesto: +39XXXXXXXXX"),
  datetime: z.string().refine((date) => {
    const appointmentDate = new Date(date);
    return appointmentDate > new Date();
  }, "La data dell'appuntamento deve essere futura"),
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
