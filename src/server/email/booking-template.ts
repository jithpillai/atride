import type { NotificationEventType } from "@/generated/prisma/enums";

export type BookingEmailPayload = {
  guildName: string;
  rideTitle: string;
  bookingUrl: string;
  reservationExpiresAt?: string | null;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

export function renderBookingEventEmail(eventType: NotificationEventType, recipientName: string, payload: BookingEmailPayload) {
  const promoted = eventType === "BOOKING_WAITLIST_PROMOTED";
  const expiry = payload.reservationExpiresAt
    ? new Date(payload.reservationExpiresAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
    : null;
  const headline = promoted ? "A ride slot is now held for you" : "Your ride reservation expired";
  const subject = promoted
    ? `${payload.rideTitle}: a waitlist slot is available`
    : `${payload.rideTitle}: reservation hold expired`;
  const statusCopy = promoted
    ? `${payload.guildName} released a slot from the waitlist. Complete the required payment${expiry ? ` before ${expiry}` : " within the displayed hold period"} to keep it.`
    : `The temporary payment hold for ${payload.rideTitle} ended before a payment was submitted. The seat has been released safely.`;
  const action = promoted ? "Complete reservation" : "View ride";
  const text = [`Hello ${recipientName},`, "", headline, statusCopy, "", `${action}: ${payload.bookingUrl}`, "", "@Ride · Ride together"].join("\n");
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#0b0e12;color:#f7f7f6;font-family:Arial,Helvetica,sans-serif"><div style="padding:32px 16px"><div style="max-width:600px;margin:0 auto;border:1px solid #2b3038;border-radius:24px;overflow:hidden;background:#14181f"><div style="height:6px;background:#ff5a18"></div><div style="padding:34px"><div style="font-size:25px;font-weight:900;color:#fff"><span style="color:#ff5a18">@</span>Ride</div><p style="margin:28px 0 0;color:#a1a1aa;font-size:14px">Hello ${escapeHtml(recipientName)},</p><h1 style="margin:10px 0;font-size:25px;line-height:1.25;color:#fff">${escapeHtml(headline)}</h1><p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7">${escapeHtml(statusCopy)}</p><a href="${escapeHtml(payload.bookingUrl)}" style="display:inline-block;border-radius:999px;background:#ff5a18;padding:13px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:900">${escapeHtml(action)}</a><p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.6">Never pay a changed UPI recipient without verifying it against the booking page.</p></div></div></div></body></html>`;
  return { subject, text, html };
}
