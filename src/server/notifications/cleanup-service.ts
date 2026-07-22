import "server-only";

import { db } from "@/lib/db";
import {
  announcementIdFromPayload,
  canDeleteInboxItem,
  daysBefore,
  isAcknowledgementProtectedPayload,
  NOTIFICATION_RETENTION_DAYS,
} from "@/server/notifications/retention-policy";

const MAX_DELIVERY_ATTEMPTS = 5;

export async function cleanupNotifications(options: { now?: Date; limit?: number } = {}) {
  const now = options.now ?? new Date();
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  const inboxCandidates = await db.notificationInboxItem.findMany({
    where: {
      OR: [
        { readAt: { not: null, lte: daysBefore(now, NOTIFICATION_RETENTION_DAYS.readInbox) }, createdAt: { lte: daysBefore(now, NOTIFICATION_RETENTION_DAYS.readInbox) } },
        { readAt: null, createdAt: { lte: daysBefore(now, NOTIFICATION_RETENTION_DAYS.unreadInbox) } },
      ],
    },
    select: {
      id: true,
      eventKey: true,
      recipientUserId: true,
      createdAt: true,
      readAt: true,
      booking: { select: { ride: { select: { endsAt: true } } } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const eventKeys = inboxCandidates.map((item) => item.eventKey);
  const announcementEvents = eventKeys.length
    ? await db.notificationOutboxEvent.findMany({
        where: { eventKey: { in: eventKeys }, eventType: "RIDE_ANNOUNCEMENT" },
        select: { eventKey: true, payload: true },
      })
    : [];
  const protectedByKey = new Map(announcementEvents.map((event) => [event.eventKey, {
    required: isAcknowledgementProtectedPayload(event.payload),
    announcementId: announcementIdFromPayload(event.payload),
  }]));
  const protectedAnnouncementIds = [...new Set(announcementEvents.flatMap((event) => {
    const protection = protectedByKey.get(event.eventKey);
    return protection?.required && protection.announcementId ? [protection.announcementId] : [];
  }))];
  const acknowledgements = protectedAnnouncementIds.length
    ? await db.rideAnnouncementAcknowledgement.findMany({
        where: { announcementId: { in: protectedAnnouncementIds } },
        select: { announcementId: true, userId: true, acknowledgedAt: true },
      })
    : [];
  const acknowledgementByRecipient = new Map(acknowledgements.map((item) => [`${item.announcementId}:${item.userId}`, item.acknowledgedAt]));
  const inboxIds = inboxCandidates.flatMap((item) => {
    const protection = protectedByKey.get(item.eventKey);
    const acknowledgedAt = protection?.announcementId
      ? acknowledgementByRecipient.get(`${protection.announcementId}:${item.recipientUserId}`) ?? null
      : null;
    return canDeleteInboxItem({
      now,
      createdAt: item.createdAt,
      readAt: item.readAt,
      rideEndsAt: item.booking?.ride.endsAt,
      requiresAcknowledgement: protection?.required ?? false,
      acknowledgedAt,
    }) ? [item.id] : [];
  });

  const deliveredCandidates = await db.notificationOutboxEvent.findMany({
    where: { status: "DELIVERED", deliveredAt: { lte: daysBefore(now, NOTIFICATION_RETENTION_DAYS.deliveredOutbox) } },
    select: { id: true, eventType: true, payload: true, recipientUserId: true },
    orderBy: { deliveredAt: "asc" },
    take: limit,
  });
  const deliveredAnnouncementIds = [...new Set(deliveredCandidates.flatMap((event) => {
    const announcementId = announcementIdFromPayload(event.payload);
    return event.eventType === "RIDE_ANNOUNCEMENT" && isAcknowledgementProtectedPayload(event.payload) && announcementId ? [announcementId] : [];
  }))];
  const deliveredAcknowledgements = deliveredAnnouncementIds.length
    ? await db.rideAnnouncementAcknowledgement.findMany({
        where: { announcementId: { in: deliveredAnnouncementIds } },
        select: { announcementId: true, userId: true, acknowledgedAt: true },
      })
    : [];
  const deliveredAckMap = new Map(deliveredAcknowledgements.map((item) => [`${item.announcementId}:${item.userId}`, item.acknowledgedAt]));
  const deliveredOutboxIds = deliveredCandidates.flatMap((event) => {
    if (event.eventType !== "RIDE_ANNOUNCEMENT" || !isAcknowledgementProtectedPayload(event.payload)) return [event.id];
    const announcementId = announcementIdFromPayload(event.payload);
    const acknowledgedAt = announcementId ? deliveredAckMap.get(`${announcementId}:${event.recipientUserId}`) : null;
    return acknowledgedAt && acknowledgedAt <= daysBefore(now, NOTIFICATION_RETENTION_DAYS.resolvedCritical) ? [event.id] : [];
  });

  const deadLetterCandidates = await db.notificationOutboxEvent.findMany({
    where: {
      status: "FAILED",
      attempts: { gte: MAX_DELIVERY_ATTEMPTS },
      updatedAt: { lte: daysBefore(now, NOTIFICATION_RETENTION_DAYS.deadLetterOutbox) },
    },
    select: { id: true, eventType: true, payload: true, recipientUserId: true },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });

  const deadLetterAnnouncementIds = [...new Set(deadLetterCandidates.flatMap((event) => {
    const announcementId = announcementIdFromPayload(event.payload);
    return event.eventType === "RIDE_ANNOUNCEMENT" && isAcknowledgementProtectedPayload(event.payload) && announcementId
      ? [announcementId]
      : [];
  }))];
  const deadLetterAcknowledgements = deadLetterAnnouncementIds.length
    ? await db.rideAnnouncementAcknowledgement.findMany({
        where: { announcementId: { in: deadLetterAnnouncementIds } },
        select: { announcementId: true, userId: true, acknowledgedAt: true },
      })
    : [];
  const deadLetterAckMap = new Map(deadLetterAcknowledgements.map((item) => [
    `${item.announcementId}:${item.userId}`,
    item.acknowledgedAt,
  ]));
  const deadLetterOutboxIds = deadLetterCandidates.flatMap((event) => {
    if (event.eventType !== "RIDE_ANNOUNCEMENT" || !isAcknowledgementProtectedPayload(event.payload)) return [event.id];
    const announcementId = announcementIdFromPayload(event.payload);
    const acknowledgedAt = announcementId ? deadLetterAckMap.get(`${announcementId}:${event.recipientUserId}`) : null;
    return acknowledgedAt && acknowledgedAt <= daysBefore(now, NOTIFICATION_RETENTION_DAYS.resolvedCritical)
      ? [event.id]
      : [];
  });

  const providerEventCandidates = await db.emailProviderEvent.findMany({
    where: { createdAt: { lte: daysBefore(now, NOTIFICATION_RETENTION_DAYS.providerEvents) } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const [inbox, deliveredOutbox, deadLetterOutbox, providerEvents] = await db.$transaction([
    db.notificationInboxItem.deleteMany({ where: { id: { in: inboxIds } } }),
    db.notificationOutboxEvent.deleteMany({ where: { id: { in: deliveredOutboxIds } } }),
    db.notificationOutboxEvent.deleteMany({ where: { id: { in: deadLetterOutboxIds } } }),
    db.emailProviderEvent.deleteMany({ where: { id: { in: providerEventCandidates.map((item) => item.id) } } }),
  ]);
  return {
    inboxDeleted: inbox.count,
    deliveredOutboxDeleted: deliveredOutbox.count,
    deadLetterOutboxDeleted: deadLetterOutbox.count,
    providerEventsDeleted: providerEvents.count,
  };
}
