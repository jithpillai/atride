import type { NotificationEventType } from "@/generated/prisma/enums";

export type RideAnnouncementEmailPayload = {
  guildName: string;
  rideTitle: string;
  announcementTitle: string;
  announcementBody: string;
  urgency: string;
  requiresAcknowledgement: boolean;
  rideUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

export function renderRideAnnouncementEmail(eventType: NotificationEventType, recipientName: string, payload: RideAnnouncementEmailPayload) {
  if (eventType !== "RIDE_ANNOUNCEMENT") throw new Error("Unsupported ride-announcement email event.");
  const critical = payload.urgency === "CRITICAL";
  const importance = critical ? "Critical ride update" : payload.urgency === "IMPORTANT" ? "Important ride update" : "Ride announcement";
  const action = payload.requiresAcknowledgement ? "Read and acknowledge" : "View ride update";
  const subject = `${critical ? "Action required: " : ""}${payload.rideTitle} · ${payload.announcementTitle}`;
  const text = [`Hello ${recipientName},`, "", importance, payload.announcementTitle, "", payload.announcementBody, "", `${action}: ${payload.rideUrl}`, "", `${payload.guildName} via @Ride`].join("\n");
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#0b0e12;color:#f7f7f6;font-family:Arial,Helvetica,sans-serif"><div style="padding:32px 16px"><div style="max-width:600px;margin:0 auto;border:1px solid #2b3038;border-radius:24px;overflow:hidden;background:#14181f"><div style="height:6px;background:${critical ? "#ef4444" : "#ff5a18"}"></div><div style="padding:34px"><div style="font-size:25px;font-weight:900;color:#fff"><span style="color:#ff5a18">@</span>Ride</div><p style="margin:28px 0 0;color:${critical ? "#fca5a5" : "#fb923c"};font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.12em">${escapeHtml(importance)}</p><p style="margin:12px 0 0;color:#a1a1aa;font-size:14px">Hello ${escapeHtml(recipientName)},</p><h1 style="margin:10px 0;font-size:25px;line-height:1.25;color:#fff">${escapeHtml(payload.announcementTitle)}</h1><p style="margin:0 0 24px;color:#d4d4d8;font-size:15px;line-height:1.7;white-space:pre-line">${escapeHtml(payload.announcementBody)}</p><a href="${escapeHtml(payload.rideUrl)}" style="display:inline-block;border-radius:999px;background:${critical ? "#ef4444" : "#ff5a18"};padding:13px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:900">${escapeHtml(action)}</a><p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.6">Official update from ${escapeHtml(payload.guildName)}. Essential ride information remains available in @Ride even if you do not use WhatsApp.</p></div></div></div></body></html>`;
  return { subject, text, html };
}
