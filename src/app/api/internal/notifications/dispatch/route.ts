import { dispatchNotificationOutbox } from "@/server/notifications/dispatcher";

async function dispatch(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const result = await dispatchNotificationOutbox({ limit: 50 });
  return Response.json({ ok: true, ...result });
}

export const GET = dispatch;
export const POST = dispatch;
