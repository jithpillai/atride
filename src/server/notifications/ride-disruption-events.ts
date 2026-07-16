import "server-only";

import { Prisma, type NotificationEventType } from "@/generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;
type RideDisruptionEventType = Extract<NotificationEventType, "RIDE_POSTPONED" | "RIDE_CANCELLED">;

function applicationUrl() {
  return (process.env.APP_URL?.trim() || "https://atride.in").replace(/\/$/, "");
}

export async function queueRideDisruptionEvents(
  tx: TransactionClient,
  disruptionId: string,
  eventType: RideDisruptionEventType,
  bookingIds: string[],
) {
  const disruption = await tx.rideDisruption.findUnique({
    where: { id: disruptionId },
    select: {
      id: true,
      reason: true,
      proposedResumeAt: true,
      ride: {
        select: {
          slug: true,
          title: true,
          startsAt: true,
          endsAt: true,
          community: { select: { id: true, name: true } },
          bookings: {
            where: { id: { in: bookingIds } },
            select: {
              id: true,
              userId: true,
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
            },
          },
        },
      },
    },
  });
  if (!disruption) return [];

  const events = disruption.ride.bookings.flatMap((booking) => booking.user.contacts.map((contact) => ({
    eventType,
    eventKey: `${eventType.toLowerCase()}:${disruption.id}:${booking.userId}`,
    communityId: disruption.ride.community.id,
    bookingId: booking.id,
    recipientUserId: booking.userId,
    recipientEmail: contact.normalizedValue,
    recipientName: booking.user.displayName,
    payload: {
      guildName: disruption.ride.community.name,
      rideTitle: disruption.ride.title,
      reason: disruption.reason,
      startsAt: disruption.ride.startsAt.toISOString(),
      endsAt: disruption.ride.endsAt.toISOString(),
      proposedResumeAt: disruption.proposedResumeAt?.toISOString() ?? "",
      bookingUrl: `${applicationUrl()}/account/bookings`,
    },
  })));
  if (events.length) await tx.notificationOutboxEvent.createMany({ data: events, skipDuplicates: true });
  return events.map(({ eventKey }) => eventKey);
}
