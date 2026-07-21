import "server-only";

import { db } from "@/lib/db";
import { getEmailProvider } from "@/server/email/provider";
import { renderBookingEventEmail, type BookingEmailPayload } from "@/server/email/booking-template";
import { renderPaymentEventEmail, type PaymentEmailPayload } from "@/server/email/payment-template";
import { renderRideDisruptionEmail, type RideDisruptionEmailPayload } from "@/server/email/ride-disruption-template";
import { renderRideAnnouncementEmail, type RideAnnouncementEmailPayload } from "@/server/email/announcement-template";
import { renderReminderEmail, type ReminderEmailPayload } from "@/server/email/reminder-template";
import { notificationPresentation } from "@/server/notifications/presentation";
import { shouldSendNotificationEmail } from "@/server/notifications/preference-policy";

const MAX_ATTEMPTS = 5;

function errorMessage(error: unknown) {
  return (error instanceof Error ? error.message : "Unknown notification delivery failure").replace(/[\r\n]/g, " ").slice(0, 1000);
}

export async function dispatchNotificationOutbox(options: { eventKeys?: string[]; limit?: number } = {}) {
  const now = new Date();
  await db.notificationOutboxEvent.updateMany({
    where: { status: "PROCESSING", lockedAt: { lte: new Date(now.getTime() - 10 * 60_000) } },
    data: { status: "FAILED", lockedAt: null, availableAt: now, lastError: "Recovered an interrupted notification delivery." },
  });
  const events = await db.notificationOutboxEvent.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: MAX_ATTEMPTS },
      availableAt: { lte: now },
      ...(options.eventKeys?.length ? { eventKey: { in: options.eventKeys } } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { recipient: { select: { notificationPreference: true } } },
    take: Math.min(Math.max(options.limit ?? 25, 1), 100),
  });
  let delivered = 0;
  let failed = 0;
  for (const event of events) {
    const claimed = await db.notificationOutboxEvent.updateMany({
      where: { id: event.id, status: { in: ["PENDING", "FAILED"] }, attempts: event.attempts },
      data: { status: "PROCESSING", lockedAt: new Date(), attempts: { increment: 1 } },
    });
    if (!claimed.count) continue;
    try {
      const inbox = notificationPresentation(event.eventType, event.payload);
      await db.notificationInboxItem.upsert({
        where: { eventKey: event.eventKey },
        create: {
          eventKey: event.eventKey,
          eventType: event.eventType,
          communityId: event.communityId,
          bookingId: event.bookingId,
          recipientUserId: event.recipientUserId,
          title: inbox.title,
          body: inbox.body,
          actionUrl: inbox.actionUrl,
        },
        update: {},
      });
      const sendEmail = shouldSendNotificationEmail(
        event.eventType,
        event.payload && typeof event.payload === "object" && !Array.isArray(event.payload) ? event.payload as Record<string, unknown> : {},
        event.recipient.notificationPreference,
      );
      const message = event.eventType === "RIDE_START_REMINDER" || event.eventType === "BOOKING_PAYMENT_REMINDER"
        ? renderReminderEmail(event.eventType, event.recipientName, event.payload as unknown as ReminderEmailPayload)
        : event.eventType === "RIDE_ANNOUNCEMENT"
        ? renderRideAnnouncementEmail(event.eventType, event.recipientName, event.payload as unknown as RideAnnouncementEmailPayload)
        : event.eventType === "RIDE_POSTPONED" || event.eventType === "RIDE_CANCELLED"
        ? renderRideDisruptionEmail(event.eventType, event.recipientName, event.payload as unknown as RideDisruptionEmailPayload)
        : event.eventType === "BOOKING_RESERVED" || event.eventType === "BOOKING_WAITLISTED" || event.eventType === "BOOKING_RESERVATION_EXPIRED" || event.eventType === "BOOKING_WAITLIST_PROMOTED"
        ? renderBookingEventEmail(event.eventType, event.recipientName, event.payload as unknown as BookingEmailPayload)
        : renderPaymentEventEmail(event.eventType, event.recipientName, event.payload as unknown as PaymentEmailPayload);
      const result = sendEmail
        ? await getEmailProvider(event.recipientEmail).sendTransactional({ to: event.recipientEmail, ...message })
        : { messageId: "preference:in-app-only" };
      await db.notificationOutboxEvent.update({
        where: { id: event.id },
        data: { status: "DELIVERED", deliveredAt: new Date(), lockedAt: null, lastError: null, providerMessageId: result.messageId ?? null },
      });
      delivered += 1;
    } catch (error) {
      const attempts = event.attempts + 1;
      await db.notificationOutboxEvent.update({
        where: { id: event.id },
        data: {
          status: "FAILED",
          lockedAt: null,
          lastError: errorMessage(error),
          availableAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000),
        },
      });
      failed += 1;
    }
  }
  return { considered: events.length, delivered, failed };
}
