import { processExpiredReservations } from "@/server/booking/expiry-service";
import { dispatchNotificationOutbox } from "@/server/notifications/dispatcher";

async function expire(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const result = await processExpiredReservations({ limit: 100 });
  const delivery = result.eventKeys.length
    ? await dispatchNotificationOutbox({ eventKeys: result.eventKeys, limit: 100 })
    : { considered: 0, delivered: 0, failed: 0 };
  return Response.json({ ok: true, ...result, delivery });
}

export const GET = expire;
export const POST = expire;
