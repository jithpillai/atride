import { processExpiredReservations } from "@/server/booking/expiry-service";
import { cleanupNotifications } from "@/server/notifications/cleanup-service";
import { dispatchNotificationOutbox } from "@/server/notifications/dispatcher";
import { processDueReminders } from "@/server/notifications/reminder-service";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const reservations = await processExpiredReservations({ limit: 50 });
  const reminders = await processDueReminders({ limit: 100 });
  const delivery = await dispatchNotificationOutbox({ limit: 100 });
  const cleanup = await cleanupNotifications({ limit: 200 });

  return Response.json({ ok: true, reservations, reminders, delivery, cleanup });
}
