import cron from "node-cron";
import { storage } from "./storage";
import { sendWhatsAppReminder } from "./whatsapp";
import { format, parseISO, addHours } from "date-fns";
import { it } from "date-fns/locale";

/**
 * CONFIGURAZIONE TEMPO REMINDER
 * 
 * Modifica questa costante per cambiare quanto tempo prima dell'appuntamento
 * deve essere inviato il reminder:
 * - 1 = un'ora prima (default)
 * - 2 = due ore prima
 * - 0.5 = 30 minuti prima
 * ecc.
 */
export const REMINDER_HOURS_BEFORE = 1;

/**
 * Process pending reminders
 * Checks for appointments happening soon and sends WhatsApp reminders
 */
export async function processPendingReminders(): Promise<{ sent: number; failed: number }> {
  console.log(`🔍 Checking for appointments needing reminders (${REMINDER_HOURS_BEFORE}h before)...`);

  try {
    const now = new Date();
    const targetTime = addHours(now, REMINDER_HOURS_BEFORE);

    // Time window: from now to REMINDER_HOURS_BEFORE from now
    const timeWindow = {
      start: now,
      end: targetTime,
    };

    const pendingAppointments = await storage.getPendingReminders(timeWindow);

    if (pendingAppointments.length === 0) {
      console.log("✅ No pending reminders to send");
      return { sent: 0, failed: 0 };
    }

    console.log(`📬 Found ${pendingAppointments.length} reminder(s) to send`);

    let sent = 0;
    let failed = 0;

    for (const appointment of pendingAppointments) {
      const appointmentDate = parseISO(appointment.datetime);
      const formattedTime = format(appointmentDate, "HH:mm", { locale: it });

      const success = await sendWhatsAppReminder({
        to: appointment.phone,
        name: appointment.name,
        appointmentTime: formattedTime,
      });

      if (success) {
        await storage.updateReminderSent(appointment.id);
        sent++;
        console.log(`✅ Reminder sent for ${appointment.name} - Appointment at ${formattedTime}`);
      } else {
        failed++;
        console.error(`❌ Failed to send reminder for ${appointment.name}`);
      }
    }

    console.log(`📊 Reminder summary: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  } catch (error) {
    console.error("❌ Error processing reminders:", error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Start the cron job scheduler
 * By default, runs every hour (can be modified)
 * 
 * CRON SCHEDULE EXAMPLES:
 * "0 * * * *" = every hour at minute 0
 * "star-slash-30 * * * *" = every 30 minutes (replace star-slash with asterisk-slash)
 * "0 star-slash-2 * * *" = every 2 hours (replace star-slash with asterisk-slash)
 * "0 9-18 * * *" = every hour from 9 AM to 6 PM
 */
export function startReminderScheduler() {
  // Run every hour
  const cronSchedule = "0 * * * *";

  cron.schedule(cronSchedule, async () => {
    console.log("\n⏰ Scheduled reminder check started at", new Date().toISOString());
    await processPendingReminders();
  });

  console.log(`✅ Reminder scheduler started (runs: ${cronSchedule})`);
  console.log(`📝 Reminders will be sent ${REMINDER_HOURS_BEFORE} hour(s) before appointments\n`);
}
