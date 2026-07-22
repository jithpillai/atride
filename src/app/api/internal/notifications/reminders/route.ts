import { dispatchNotificationOutbox } from "@/server/notifications/dispatcher";
import { processDueReminders } from "@/server/notifications/reminder-service";

async function reminders(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  const result = await processDueReminders({ limit: 100 });
  const delivery = result.eventKeys.length
    ? await dispatchNotificationOutbox({ eventKeys: result.eventKeys, limit: 100 })
    : { considered: 0, delivered: 0, failed: 0 };
  return Response.json({ ok: true, ...result, delivery });
}

export const GET = reminders;
export const POST = reminders;
