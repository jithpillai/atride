import { recordSesDeliveryEvent } from "@/server/email/ses-event-service";
import { parseSesDeliveryEvent, parseSnsEnvelope, verifySnsEnvelope } from "@/server/email/ses-events";

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 256_000) return Response.json({ ok: false }, { status: 413 });
  let envelope;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 256_000) return Response.json({ ok: false }, { status: 413 });
    envelope = parseSnsEnvelope(JSON.parse(body));
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const expectedTopic = process.env.SES_SNS_TOPIC_ARN?.trim();
  if (!expectedTopic || envelope.TopicArn !== expectedTopic) return Response.json({ ok: false }, { status: 401 });
  if (!await verifySnsEnvelope(envelope).catch(() => false)) return Response.json({ ok: false }, { status: 401 });

  if (envelope.Type === "SubscriptionConfirmation") {
    const response = await fetch(envelope.SubscribeURL!, { signal: AbortSignal.timeout(5_000), cache: "no-store" });
    return Response.json({ ok: response.ok, subscriptionConfirmed: response.ok }, { status: response.ok ? 200 : 502 });
  }
  if (envelope.Type !== "Notification") return Response.json({ ok: true, ignored: true });

  let event;
  try {
    event = parseSesDeliveryEvent(envelope.Message);
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!event) return Response.json({ ok: true, ignored: true });
  const result = await recordSesDeliveryEvent(envelope.MessageId, event);
  return Response.json({ ok: true, ...result });
}
