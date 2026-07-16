import "server-only";

import { Prisma } from "@/generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;

function applicationUrl() {
  return (process.env.APP_URL?.trim() || "https://atride.in").replace(/\/$/, "");
}

export async function queueRideAnnouncementEvents(tx: TransactionClient, announcementId: string) {
  const announcement = await tx.rideAnnouncement.findUnique({
    where: { id: announcementId },
    select: {
      id: true,
      title: true,
      content: true,
      urgency: true,
      requiresAcknowledgement: true,
      publishedAt: true,
      ride: {
        select: {
          id: true,
          slug: true,
          title: true,
          community: { select: { id: true, name: true } },
          bookings: {
            where: { status: { in: ["RESERVED", "CONFIRMED"] } },
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
  if (!announcement?.publishedAt || !announcement.title) return [];
  const rideUrl = `${applicationUrl()}/rides/${encodeURIComponent(announcement.ride.slug)}#ride-updates`;
  const events = announcement.ride.bookings.flatMap((booking) => booking.user.contacts.map((contact) => ({
    eventType: "RIDE_ANNOUNCEMENT" as const,
    eventKey: `ride-announcement:${announcement.id}:${booking.userId}`,
    communityId: announcement.ride.community.id,
    bookingId: booking.id,
    recipientUserId: booking.userId,
    recipientEmail: contact.normalizedValue,
    recipientName: booking.user.displayName,
    payload: {
      announcementId: announcement.id,
      guildName: announcement.ride.community.name,
      rideTitle: announcement.ride.title,
      announcementTitle: announcement.title,
      announcementBody: announcement.content,
      urgency: announcement.urgency,
      requiresAcknowledgement: announcement.requiresAcknowledgement,
      rideUrl,
    },
  })));
  if (events.length) await tx.notificationOutboxEvent.createMany({ data: events, skipDuplicates: true });
  return events.map(({ eventKey }) => eventKey);
}
