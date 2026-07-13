import "server-only";

import { Prisma, type NotificationEventType } from "@/generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;

function applicationUrl() {
  const configured = process.env.APP_URL?.trim();
  return (configured || "https://atride.in").replace(/\/$/, "");
}

function paymentPayload(payment: {
  amountPaise: number;
  purpose: string;
  method: string;
  payerReference: string | null;
  payeeVpaSnapshot: string | null;
  payeeNameSnapshot: string | null;
  submittedAt: Date | null;
  booking: {
    user: { displayName: string };
    ride: { title: string };
    community: { name: string; slug: string };
  };
}, reviewUrl: string, rejectionReason?: string | null): Prisma.InputJsonObject {
  return {
    guildName: payment.booking.community.name,
    rideTitle: payment.booking.ride.title,
    participantName: payment.booking.user.displayName,
    amountPaise: payment.amountPaise,
    paymentPurpose: payment.purpose,
    paymentMethod: payment.method,
    payerReference: payment.payerReference ?? "",
    payeeVpa: payment.payeeVpaSnapshot ?? "",
    payeeName: payment.payeeNameSnapshot ?? "",
    submittedAt: payment.submittedAt?.toISOString() ?? "",
    rejectionReason: rejectionReason ?? "",
    reviewUrl,
  };
}

const paymentInclude = {
  booking: {
    include: {
      user: true,
      ride: true,
      community: true,
    },
  },
} satisfies Prisma.BookingPaymentInclude;

export async function queueFinancePaymentSubmitted(tx: TransactionClient, paymentId: string, submissionKey: string) {
  const payment = await tx.bookingPayment.findUnique({ where: { id: paymentId }, include: paymentInclude });
  if (!payment) return [];
  const memberships = await tx.communityMembership.findMany({
    where: {
      communityId: payment.booking.communityId,
      status: "ACTIVE",
      roles: { some: { role: { in: ["OWNER", "ADMIN", "FINANCE"] } } },
      user: { status: "ACTIVE", contacts: { some: { type: "EMAIL", verifiedAt: { not: null } } } },
    },
    select: {
      user: {
        select: {
          id: true,
          displayName: true,
          contacts: {
            where: { type: "EMAIL", verifiedAt: { not: null } },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            take: 1,
          },
        },
      },
    },
  });
  const reviewUrl = `${applicationUrl()}/guilds/${encodeURIComponent(payment.booking.community.slug)}/manage?section=finance&payment=${payment.id}`;
  const payload = paymentPayload(payment, reviewUrl);
  const events = memberships.flatMap(({ user }) => user.contacts.map((contact) => ({
    eventType: "BOOKING_PAYMENT_SUBMITTED" as const,
    eventKey: `payment-submitted:${payment.id}:${submissionKey}:${user.id}`,
    communityId: payment.booking.communityId,
    bookingPaymentId: payment.id,
    recipientUserId: user.id,
    recipientEmail: contact.normalizedValue,
    recipientName: user.displayName,
    payload,
  })));
  if (events.length) await tx.notificationOutboxEvent.createMany({ data: events, skipDuplicates: true });
  return events.map(({ eventKey }) => eventKey);
}

export async function queueParticipantPaymentReviewed(
  tx: TransactionClient,
  paymentId: string,
  eventType: Extract<NotificationEventType, "BOOKING_PAYMENT_CONFIRMED" | "BOOKING_PAYMENT_REJECTED">,
  rejectionReason?: string | null,
) {
  const payment = await tx.bookingPayment.findUnique({ where: { id: paymentId }, include: paymentInclude });
  if (!payment) return [];
  const contact = await tx.userContact.findFirst({
    where: { userId: payment.booking.userId, type: "EMAIL", verifiedAt: { not: null } },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  if (!contact) return [];
  const reviewUrl = `${applicationUrl()}/rides/${encodeURIComponent(payment.booking.ride.slug)}#booking`;
  const eventKey = `${eventType.toLowerCase()}:${payment.id}:${payment.reviewedAt?.getTime() ?? Date.now()}:${payment.booking.userId}`;
  await tx.notificationOutboxEvent.create({
    data: {
      eventType,
      eventKey,
      communityId: payment.booking.communityId,
      bookingPaymentId: payment.id,
      recipientUserId: payment.booking.userId,
      recipientEmail: contact.normalizedValue,
      recipientName: payment.booking.user.displayName,
      payload: paymentPayload(payment, reviewUrl, rejectionReason),
    },
  });
  return [eventKey];
}
