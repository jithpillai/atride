import "server-only";

import { db } from "@/lib/db";
import { queueRideDisruptionEvents } from "@/server/notifications/ride-disruption-events";

const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const;
const ACTIVE_BOOKING_STATUSES = ["RESERVED", "CONFIRMED", "WAITLISTED", "PAYMENT_REJECTED", "TRANSFER_PENDING"] as const;

export async function postponeRide(input: {
  guildSlug: string;
  rideId: string;
  actorUserId: string;
  reason: string;
  proposedResumeAt: Date | null;
}) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM rides WHERE id = ${input.rideId}::uuid FOR UPDATE`;
    const ride = await tx.ride.findFirst({
      where: { id: input.rideId, community: { slug: input.guildSlug } },
      include: { bookings: { where: { status: { in: [...ACTIVE_BOOKING_STATUSES] } }, select: { id: true } } },
    });
    if (!ride || !["PUBLISHED", "CLOSED"].includes(ride.status)) throw new Error("transition");
    const disruption = await tx.rideDisruption.create({ data: {
      communityId: ride.communityId,
      rideId: ride.id,
      type: "POSTPONEMENT",
      reason: input.reason,
      proposedResumeAt: input.proposedResumeAt,
      createdById: input.actorUserId,
    } });
    await tx.ride.update({ where: { id: ride.id }, data: { status: "POSTPONED" } });
    await tx.communityAuditEvent.create({ data: {
      communityId: ride.communityId,
      actorUserId: input.actorUserId,
      action: "RIDE_POSTPONED",
      metadata: { rideId: ride.id, disruptionId: disruption.id, reason: input.reason, proposedResumeAt: input.proposedResumeAt?.toISOString() ?? null, affectedBookings: ride.bookings.length },
    } });
    const eventKeys = await queueRideDisruptionEvents(tx, disruption.id, "RIDE_POSTPONED", ride.bookings.map(({ id }) => id));
    return { rideSlug: ride.slug, eventKeys };
  }, TRANSACTION_OPTIONS);
}

export async function cancelRide(input: {
  guildSlug: string;
  rideId: string;
  actorUserId: string;
  reason: string;
}) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM rides WHERE id = ${input.rideId}::uuid FOR UPDATE`;
    const ride = await tx.ride.findFirst({
      where: { id: input.rideId, community: { slug: input.guildSlug } },
      include: {
        bookings: {
          where: { status: { in: [...ACTIVE_BOOKING_STATUSES] } },
          include: { payments: { select: { status: true, amountPaise: true } } },
        },
      },
    });
    if (!ride || !["DRAFT", "PUBLISHED", "CLOSED", "POSTPONED"].includes(ride.status)) throw new Error("transition");
    await tx.rideDisruption.updateMany({
      where: { rideId: ride.id, status: "ACTIVE" },
      data: { status: "RESOLVED", resolvedAt: new Date(), resolutionNote: "Superseded by ride cancellation." },
    });
    const disruption = await tx.rideDisruption.create({ data: {
      communityId: ride.communityId,
      rideId: ride.id,
      type: "CANCELLATION",
      reason: input.reason,
      createdById: input.actorUserId,
    } });
    const now = new Date();
    for (const booking of ride.bookings) {
      const confirmedAmountPaise = booking.payments.filter(({ status }) => status === "CONFIRMED").reduce((sum, payment) => sum + payment.amountPaise, 0);
      const submittedAmountPaise = booking.payments.filter(({ status }) => status === "SUBMITTED").reduce((sum, payment) => sum + payment.amountPaise, 0);
      if (confirmedAmountPaise || submittedAmountPaise) {
        await tx.bookingRefund.upsert({
          where: { bookingId: booking.id },
          create: {
            bookingId: booking.id,
            communityId: ride.communityId,
            rideDisruptionId: disruption.id,
            status: confirmedAmountPaise ? "PENDING" : "REVIEW_REQUIRED",
            confirmedAmountPaise,
            submittedAmountPaise,
          },
          update: {
            rideDisruptionId: disruption.id,
            status: confirmedAmountPaise ? "PENDING" : "REVIEW_REQUIRED",
            confirmedAmountPaise,
            submittedAmountPaise,
            refundedAmountPaise: 0,
            reference: null,
            note: null,
            reviewedById: null,
            reviewedAt: null,
          },
        });
      }
    }
    const bookingIds = ride.bookings.map(({ id }) => id);
    if (bookingIds.length) await tx.rideBooking.updateMany({
      where: { id: { in: bookingIds } },
      data: { status: "CANCELLED", cancelledAt: now, reservationExpiresAt: null },
    });
    await tx.ride.update({ where: { id: ride.id }, data: { status: "CANCELLED", bookedSlots: 0 } });
    await tx.communityAuditEvent.create({ data: {
      communityId: ride.communityId,
      actorUserId: input.actorUserId,
      action: "RIDE_CANCELLED",
      metadata: { rideId: ride.id, disruptionId: disruption.id, reason: input.reason, affectedBookings: bookingIds.length },
    } });
    const eventKeys = await queueRideDisruptionEvents(tx, disruption.id, "RIDE_CANCELLED", bookingIds);
    return { rideSlug: ride.slug, eventKeys };
  }, TRANSACTION_OPTIONS);
}
