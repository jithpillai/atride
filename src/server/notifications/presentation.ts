import type { NotificationEventType } from "@/generated/prisma/enums";

type Payload = Record<string, unknown>;

function text(payload: Payload, key: string, fallback = "") {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function notificationPresentation(eventType: NotificationEventType, rawPayload: unknown) {
  const payload = rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload) ? rawPayload as Payload : {};
  const ride = text(payload, "rideTitle", "your ride");
  const guild = text(payload, "guildName", "the Guild");
  const actionUrl = text(payload, "bookingUrl") || text(payload, "reviewUrl") || null;

  switch (eventType) {
    case "BOOKING_RESERVED":
      return { title: `Reservation held · ${ride}`, body: `Complete the required payment before the hold expires to keep your booking with ${guild}.`, actionUrl };
    case "BOOKING_WAITLISTED":
      return { title: `Waitlist joined · ${ride}`, body: `Your complete booking party is queued. We will notify you when enough capacity becomes available.`, actionUrl };
    case "BOOKING_WAITLIST_PROMOTED":
      return { title: `A slot is available · ${ride}`, body: `Your waitlisted booking is now temporarily held. Complete payment before the displayed deadline.`, actionUrl };
    case "BOOKING_RESERVATION_EXPIRED":
      return { title: `Reservation expired · ${ride}`, body: `The unpaid temporary hold ended and its capacity was released.`, actionUrl };
    case "BOOKING_PAYMENT_SUBMITTED":
      return { title: `Payment proof submitted · ${ride}`, body: `${text(payload, "participantName", "A participant")} submitted payment evidence for finance review.`, actionUrl };
    case "BOOKING_PAYMENT_CONFIRMED":
      return { title: `Payment confirmed · ${ride}`, body: `${guild} confirmed your submitted payment.`, actionUrl };
    case "BOOKING_PAYMENT_REJECTED":
      return { title: `Payment needs attention · ${ride}`, body: text(payload, "rejectionReason", "The Guild could not confirm the submitted payment evidence."), actionUrl };
    case "RIDE_POSTPONED":
      return { title: `Ride postponed · ${ride}`, body: text(payload, "reason", `${guild} postponed this ride.`), actionUrl };
    case "RIDE_CANCELLED":
      return { title: `Ride cancelled · ${ride}`, body: text(payload, "reason", `${guild} cancelled this ride.`), actionUrl };
    case "RIDE_ANNOUNCEMENT":
      return { title: `${text(payload, "announcementTitle", "Ride update")} · ${ride}`, body: text(payload, "announcementBody", `${guild} published a ride update.`), actionUrl: text(payload, "rideUrl") || actionUrl };
    case "RIDE_START_REMINDER":
      return { title: `Ride starts soon · ${ride}`, body: `Review the latest meeting point, itinerary, requirements, and official updates before departure.`, actionUrl: text(payload, "bookingUrl") || actionUrl };
    case "BOOKING_PAYMENT_REMINDER":
      return { title: `${text(payload, "reminderKind") === "PAYMENT_OVERDUE" ? "Payment overdue" : "Payment due soon"} · ${ride}`, body: `Open your booking to review the current payment obligation and Guild instructions.`, actionUrl: text(payload, "bookingUrl") || actionUrl };
  }
}
