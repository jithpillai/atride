import { createVerify } from "node:crypto";

export type SnsEnvelope = {
  Type: "Notification" | "SubscriptionConfirmation" | "UnsubscribeConfirmation";
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: "1" | "2";
  Signature: string;
  SigningCertURL: string;
  Subject?: string;
  Token?: string;
  SubscribeURL?: string;
};

export type SesDeliveryEvent = {
  providerMessageId: string | null;
  deliveryStatus: "DELIVERED" | "DELAYED" | "BOUNCED" | "COMPLAINED" | "REJECTED";
  eventType: string;
  occurredAt: Date;
  recipients: string[];
  suppressRecipients: boolean;
};

const certificateCache = new Map<string, string>();

function snsHostname(hostname: string) {
  return /^sns(?:\.[a-z0-9-]+)?\.amazonaws\.com(?:\.cn)?$/i.test(hostname);
}

export function isAllowedSnsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && snsHostname(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function snsStringToSign(envelope: SnsEnvelope) {
  const fields = envelope.Type === "Notification"
    ? ["Message", "MessageId", ...(envelope.Subject ? ["Subject"] : []), "Timestamp", "TopicArn", "Type"]
    : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  return fields.map((field) => `${field}\n${String(envelope[field as keyof SnsEnvelope] ?? "")}\n`).join("");
}

export function parseSnsEnvelope(value: unknown): SnsEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid-sns-envelope");
  const source = value as Record<string, unknown>;
  const type = source.Type;
  if (typeof type !== "string" || !["Notification", "SubscriptionConfirmation", "UnsubscribeConfirmation"].includes(type)) {
    throw new Error("invalid-sns-envelope");
  }
  const required = ["MessageId", "TopicArn", "Message", "Timestamp", "SignatureVersion", "Signature", "SigningCertURL"];
  if (required.some((key) => typeof source[key] !== "string" || !String(source[key]).trim())) throw new Error("invalid-sns-envelope");
  if (source.SignatureVersion !== "1" && source.SignatureVersion !== "2") throw new Error("invalid-sns-envelope");
  const envelope = source as unknown as SnsEnvelope;
  if (!isAllowedSnsUrl(envelope.SigningCertURL)) throw new Error("invalid-sns-certificate-url");
  if (type !== "Notification" && (!envelope.SubscribeURL || !isAllowedSnsUrl(envelope.SubscribeURL))) throw new Error("invalid-sns-subscribe-url");
  if (!Number.isFinite(new Date(envelope.Timestamp).getTime())) throw new Error("invalid-sns-timestamp");
  return envelope;
}

export async function verifySnsEnvelope(envelope: SnsEnvelope) {
  let certificate = certificateCache.get(envelope.SigningCertURL);
  if (!certificate) {
    const response = await fetch(envelope.SigningCertURL, { signal: AbortSignal.timeout(5_000), cache: "no-store" });
    if (!response.ok) throw new Error("sns-certificate-unavailable");
    certificate = await response.text();
    if (!certificate.includes("BEGIN CERTIFICATE") || certificate.length > 20_000) throw new Error("invalid-sns-certificate");
    certificateCache.set(envelope.SigningCertURL, certificate);
  }
  const verifier = createVerify(envelope.SignatureVersion === "1" ? "RSA-SHA1" : "RSA-SHA256");
  verifier.update(snsStringToSign(envelope), "utf8");
  verifier.end();
  return verifier.verify(certificate, envelope.Signature, "base64");
}

function emails(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return [entry.trim().toLowerCase()];
    if (entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).emailAddress === "string") {
      return [String((entry as Record<string, unknown>).emailAddress).trim().toLowerCase()];
    }
    return [];
  }).filter((email) => email.includes("@") && email.length <= 320);
}

export function parseSesDeliveryEvent(message: string): SesDeliveryEvent | null {
  const value = JSON.parse(message) as Record<string, unknown>;
  const rawType = String(value.eventType || value.notificationType || "").toUpperCase();
  const status = ({
    DELIVERY: "DELIVERED",
    DELIVERY_DELAY: "DELAYED",
    BOUNCE: "BOUNCED",
    COMPLAINT: "COMPLAINED",
    REJECT: "REJECTED",
    RENDERING_FAILURE: "REJECTED",
  } as const)[rawType as "DELIVERY" | "DELIVERY_DELAY" | "BOUNCE" | "COMPLAINT" | "REJECT" | "RENDERING_FAILURE"];
  if (!status) return null;
  const mail = value.mail && typeof value.mail === "object" ? value.mail as Record<string, unknown> : {};
  const bounce = value.bounce && typeof value.bounce === "object" ? value.bounce as Record<string, unknown> : {};
  const complaint = value.complaint && typeof value.complaint === "object" ? value.complaint as Record<string, unknown> : {};
  const eventDetail = value.delivery && typeof value.delivery === "object" ? value.delivery as Record<string, unknown>
    : value.deliveryDelay && typeof value.deliveryDelay === "object" ? value.deliveryDelay as Record<string, unknown>
    : bounce;
  const occurred = String(eventDetail.timestamp || complaint.timestamp || mail.timestamp || "");
  const occurredAt = Number.isFinite(new Date(occurred).getTime()) ? new Date(occurred) : new Date();
  const recipients = [...new Set([
    ...emails(bounce.bouncedRecipients),
    ...emails(complaint.complainedRecipients),
    ...emails(mail.destination),
  ])];
  return {
    providerMessageId: typeof mail.messageId === "string" ? mail.messageId.slice(0, 240) : null,
    deliveryStatus: status,
    eventType: rawType.slice(0, 40),
    occurredAt,
    recipients,
    suppressRecipients: status === "COMPLAINED" || (status === "BOUNCED" && String(bounce.bounceType || "").toUpperCase() === "PERMANENT"),
  };
}
