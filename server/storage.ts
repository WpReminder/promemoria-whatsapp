// Referenced from javascript_database blueprint - adapted for appointments
import { appointments, type Appointment, type InsertAppointment } from "@shared/schema";
import { db } from "./db";
import { eq, and, lte, gte } from "drizzle-orm";

export interface IStorage {
  // Appointment operations
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentById(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateReminderSent(id: number): Promise<void>;
  getPendingReminders(timeWindow: { start: Date; end: Date }): Promise<Appointment[]>;
}

export class DatabaseStorage implements IStorage {
  async getAllAppointments(): Promise<Appointment[]> {
    const result = await db.select().from(appointments).orderBy(appointments.datetime);
    return result;
  }

  async getAppointmentById(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db
      .insert(appointments)
      .values(insertAppointment)
      .returning();
    return appointment;
  }

  async updateReminderSent(id: number): Promise<void> {
    await db
      .update(appointments)
      .set({ reminderSent: true })
      .where(eq(appointments.id, id));
  }

  async getPendingReminders(timeWindow: { start: Date; end: Date }): Promise<Appointment[]> {
    const result = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.reminderSent, false),
          gte(appointments.datetime, timeWindow.start.toISOString()),
          lte(appointments.datetime, timeWindow.end.toISOString())
        )
      );
    return result;
  }
}

export const storage = new DatabaseStorage();
