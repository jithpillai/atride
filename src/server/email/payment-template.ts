import type { NotificationEventType } from "@/generated/prisma/enums";

export type PaymentEmailPayload = {
  guildName: string;
  rideTitle: string;
  participantName: string;
  amountPaise: number;
  paymentPurpose: string;
  paymentMethod: string;
  payerReference?: string | null;
  payeeVpa?: string | null;
  payeeName?: string | null;
  submittedAt?: string | null;
  rejectionReason?: string | null;
  reviewUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function money(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
}

export function renderPaymentEventEmail(eventType: NotificationEventType, recipientName: string, payload: PaymentEmailPayload) {
  const amount = money(payload.amountPaise);
  const purpose = label(payload.paymentPurpose);
  const method = label(payload.paymentMethod);
  const isSubmitted = eventType === "BOOKING_PAYMENT_SUBMITTED";
  const isConfirmed = eventType === "BOOKING_PAYMENT_CONFIRMED";
  const headline = isSubmitted ? "Payment ready for review" : isConfirmed ? "Payment confirmed" : "Payment needs attention";
  const subject = isSubmitted
    ? `${payload.guildName}: ${amount} payment submitted for ${payload.rideTitle}`
    : isConfirmed
      ? `${payload.rideTitle}: ${purpose} confirmed`
      : `${payload.rideTitle}: ${purpose} proof rejected`;
  const action = isSubmitted ? "Review payment" : "View booking";
  const statusCopy = isSubmitted
    ? `${payload.participantName} submitted ${amount} for finance verification.`
    : isConfirmed
      ? `${payload.guildName} confirmed receipt of your ${amount} ${purpose.toLowerCase()}.`
      : `${payload.guildName} could not verify your ${amount} ${purpose.toLowerCase()}.`;
  const details = [
    `Ride: ${payload.rideTitle}`,
    `Participant: ${payload.participantName}`,
    `Payment: ${purpose}`,
    `Method: ${method}`,
    `Amount: ${amount}`,
    payload.payeeVpa ? `Requested recipient: ${payload.payeeName || "Guild payee"} · ${payload.payeeVpa}` : null,
    payload.payerReference ? `Reference: ${payload.payerReference}` : null,
    payload.rejectionReason ? `Reason: ${payload.rejectionReason}` : null,
  ].filter(Boolean) as string[];
  const text = [
    `Hello ${recipientName},`, "", headline, statusCopy, "", ...details, "", `${action}: ${payload.reviewUrl}`, "", "@Ride · Ride together",
  ].join("\n");
  const detailRows = details.map((detail) => `<div style="padding:7px 0;border-bottom:1px solid #2b3038;color:#d4d4d8;font-size:14px">${escapeHtml(detail)}</div>`).join("");
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#0b0e12;color:#f7f7f6;font-family:Arial,Helvetica,sans-serif"><div style="padding:32px 16px"><div style="max-width:600px;margin:0 auto;border:1px solid #2b3038;border-radius:24px;overflow:hidden;background:#14181f"><div style="height:6px;background:#ff5a18"></div><div style="padding:34px"><div style="font-size:25px;font-weight:900;color:#fff"><span style="color:#ff5a18">@</span>Ride</div><p style="margin:28px 0 0;color:#a1a1aa;font-size:14px">Hello ${escapeHtml(recipientName)},</p><h1 style="margin:10px 0;font-size:25px;line-height:1.25;color:#fff">${escapeHtml(headline)}</h1><p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7">${escapeHtml(statusCopy)}</p><div style="border-top:1px solid #2b3038">${detailRows}</div><a href="${escapeHtml(payload.reviewUrl)}" style="display:inline-block;margin-top:26px;border-radius:999px;background:#ff5a18;padding:13px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:900">${escapeHtml(action)}</a><p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.6">Payment confirmation remains a Guild finance decision. @Ride does not receive or settle these funds.</p></div></div></div></body></html>`;
  return { subject, text, html };
}
