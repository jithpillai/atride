import "server-only";

import { Prisma, type NotificationEventType } from "@/generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;
type ReservationEventType = Extract<NotificationEventType, "BOOKING_RESERVATION_EXPIRED" | "BOOKING_WAITLIST_PROMOTED">;
type BookingCreatedEventType = Extract<NotificationEventType, "BOOKING_RESERVED" | "BOOKING_WAITLISTED">;

function applicationUrl() {
  return (process.env.APP_URL?.trim() || "https://atride.in").replace(/\/$/, "");
}

export async function queueParticipantReservationEvent(
  tx: TransactionClient,
  bookingId: string,
  eventType: ReservationEventType,
  occurrenceKey: string,
) {
  const booking = await tx.rideBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      communityId: true,
      userId: true,
      reservationExpiresAt: true,
      user: {
        select: {
          displayName: true,
          contacts: {
            where: { type: "EMAIL", verifiedAt: { not: null } },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            take: 1,
          },
        },
      },
      ride: { select: { slug: true, title: true } },
      community: { select: { name: true } },
    },
  });
  const contact = booking?.user.contacts[0];
  if (!booking || !contact) return [];
  const eventKey = `${eventType.toLowerCase()}:${booking.id}:${occurrenceKey}`;
  await tx.notificationOutboxEvent.createMany({
    data: [{
      eventType,
      eventKey,
      communityId: booking.communityId,
      bookingId: booking.id,
      recipientUserId: booking.userId,
      recipientEmail: contact.normalizedValue,
      recipientName: booking.user.displayName,
      payload: {
        guildName: booking.community.name,
        rideTitle: booking.ride.title,
        bookingUrl: `${applicationUrl()}/rides/${encodeURIComponent(booking.ride.slug)}#booking`,
        reservationExpiresAt: booking.reservationExpiresAt?.toISOString() ?? "",
      },
    }],
    skipDuplicates: true,
  });
  return [eventKey];
}

export async function queueParticipantBookingCreated(
  tx: TransactionClient,
  bookingId: string,
  eventType: BookingCreatedEventType,
  occurrenceKey: string,
) {
  const booking = await tx.rideBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      communityId: true,
      userId: true,
      seatCount: true,
      reservationExpiresAt: true,
      origin: { select: { name: true, city: true } },
      user: {
        select: {
          displayName: true,
          contacts: {
            where: { type: "EMAIL", verifiedAt: { not: null } },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            take: 1,
          },
        },
      },
      ride: { select: { slug: true, title: true } },
      community: { select: { name: true } },
    },
  });
  const contact = booking?.user.contacts[0];
  if (!booking || !contact) return [];
  const eventKey = `${eventType.toLowerCase()}:${booking.id}:${occurrenceKey}`;
  await tx.notificationOutboxEvent.createMany({
    data: [{
      eventType,
      eventKey,
      communityId: booking.communityId,
      bookingId: booking.id,
      recipientUserId: booking.userId,
      recipientEmail: contact.normalizedValue,
      recipientName: booking.user.displayName,
      payload: {
        guildName: booking.community.name,
        rideTitle: booking.ride.title,
        bookingUrl: `${applicationUrl()}/account/bookings`,
        reservationExpiresAt: booking.reservationExpiresAt?.toISOString() ?? "",
        originName: booking.origin?.name || booking.origin?.city || "",
        partySize: booking.seatCount,
      },
    }],
    skipDuplicates: true,
  });
  return [eventKey];
}
