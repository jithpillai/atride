import "server-only";

export type RideDisruptionEmailPayload = {
  guildName: string;
  rideTitle: string;
  reason: string;
  startsAt: string;
  endsAt: string;
  proposedResumeAt?: string;
  bookingUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function indiaDate(value: string) {
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

export function renderRideDisruptionEmail(
  eventType: "RIDE_POSTPONED" | "RIDE_CANCELLED",
  recipientName: string,
  payload: RideDisruptionEmailPayload,
) {
  const cancelled = eventType === "RIDE_CANCELLED";
  const headline = cancelled ? `${payload.rideTitle} has been cancelled` : `${payload.rideTitle} has been postponed`;
  const nextDate = !cancelled && payload.proposedResumeAt ? `<p style="margin:12px 0 0;color:#fbbf24"><strong>Proposed update:</strong> ${escapeHtml(indiaDate(payload.proposedResumeAt))}</p>` : "";
  const subject = `${cancelled ? "Cancelled" : "Postponed"}: ${payload.rideTitle}`;
  const text = `Hello ${recipientName},\n\n${headline}.\n\nReason: ${payload.reason}\nOriginal schedule: ${indiaDate(payload.startsAt)} to ${indiaDate(payload.endsAt)}${payload.proposedResumeAt ? `\nProposed update: ${indiaDate(payload.proposedResumeAt)}` : ""}\n\nReview your booking: ${payload.bookingUrl}\n\nPayments are made directly to the Guild. Any refund shown in @Ride must be completed by the Guild.`;
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#0b0e12;color:#f7f7f6;font-family:Arial,Helvetica,sans-serif"><div style="padding:32px 16px"><div style="max-width:600px;margin:0 auto;border:1px solid #2b3038;border-radius:24px;overflow:hidden;background:#14181f"><div style="height:6px;background:${cancelled ? "#ef4444" : "#f59e0b"}"></div><div style="padding:34px"><div style="font-size:25px;font-weight:900;color:#fff"><span style="color:#ff5a18">@</span>Ride</div><p style="margin:28px 0 0;color:#a1a1aa;font-size:14px">Hello ${escapeHtml(recipientName)},</p><h1 style="margin:10px 0;font-size:25px;line-height:1.25;color:#fff">${escapeHtml(headline)}</h1><p style="margin:0;color:#a1a1aa;font-size:15px;line-height:1.7"><strong style="color:#fff">Reason:</strong> ${escapeHtml(payload.reason)}</p><p style="margin:12px 0 0;color:#a1a1aa"><strong>Original schedule:</strong> ${escapeHtml(indiaDate(payload.startsAt))} to ${escapeHtml(indiaDate(payload.endsAt))}</p>${nextDate}<a href="${escapeHtml(payload.bookingUrl)}" style="display:inline-block;margin-top:26px;border-radius:999px;background:#ff5a18;padding:13px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:900">Review booking</a><p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.6">Payments are made directly to ${escapeHtml(payload.guildName)}. Any refund recorded in @Ride must be completed by the Guild.</p></div></div></div></body></html>`;
  return { subject, text, html };
}
