import type { NotificationEventType } from "@/generated/prisma/enums";

export type ReminderEmailPayload = {
  guildName: string;
  rideTitle: string;
  reminderKind: "UPCOMING_RIDE" | "PAYMENT_DUE" | "PAYMENT_OVERDUE";
  startsAt?: string | null;
  dueAt?: string | null;
  amountPaise?: number | null;
  bookingUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

function indiaTime(value?: string | null) {
  if (!value) return "the time shown in @Ride";
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

function money(paise?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format((paise ?? 0) / 100);
}

export function renderReminderEmail(eventType: NotificationEventType, recipientName: string, payload: ReminderEmailPayload) {
  if (eventType !== "RIDE_START_REMINDER" && eventType !== "BOOKING_PAYMENT_REMINDER") throw new Error("Unsupported reminder email event.");
  const rideStart = payload.reminderKind === "UPCOMING_RIDE";
  const overdue = payload.reminderKind === "PAYMENT_OVERDUE";
  const headline = rideStart ? "Your ride starts soon" : overdue ? "Your ride payment is overdue" : "Your ride payment is due soon";
  const subject = rideStart ? `${payload.rideTitle}: upcoming ride reminder` : `${payload.rideTitle}: ${overdue ? "payment overdue" : "payment reminder"}`;
  const copy = rideStart
    ? `${payload.rideTitle} starts at ${indiaTime(payload.startsAt)}. Review the latest meeting point, itinerary, vehicle requirements, and official updates before departure.`
    : `${money(payload.amountPaise)} is ${overdue ? "overdue" : "due by"} ${indiaTime(payload.dueAt)}. Open your booking to review the current payment obligation and Guild instructions.`;
  const action = rideStart ? "Review ride details" : "Review payment";
  const text = [`Hello ${recipientName},`, "", headline, copy, "", `${action}: ${payload.bookingUrl}`, "", `${payload.guildName} via @Ride`].join("\n");
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#0b0e12;color:#f7f7f6;font-family:Arial,Helvetica,sans-serif"><div style="padding:32px 16px"><div style="max-width:600px;margin:0 auto;border:1px solid #2b3038;border-radius:24px;overflow:hidden;background:#14181f"><div style="height:6px;background:${overdue ? "#ef4444" : "#ff5a18"}"></div><div style="padding:34px"><div style="font-size:25px;font-weight:900;color:#fff"><span style="color:#ff5a18">@</span>Ride</div><p style="margin:28px 0 0;color:#a1a1aa;font-size:14px">Hello ${escapeHtml(recipientName)},</p><h1 style="margin:10px 0;font-size:25px;line-height:1.25;color:#fff">${escapeHtml(headline)}</h1><p style="margin:0 0 24px;color:#d4d4d8;font-size:15px;line-height:1.7">${escapeHtml(copy)}</p><a href="${escapeHtml(payload.bookingUrl)}" style="display:inline-block;border-radius:999px;background:${overdue ? "#ef4444" : "#ff5a18"};padding:13px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:900">${escapeHtml(action)}</a><p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.6">This reminder is derived from the current ride and payment dates stored in @Ride.</p></div></div></div></body></html>`;
  return { subject, text, html };
}
