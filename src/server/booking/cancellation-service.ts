import "server-only";

import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { dispatchNotificationOutbox } from "@/server/notifications/dispatcher";
import { processExpiredReservations } from "./expiry-service";
import { RESERVATION_TRANSACTION_OPTIONS } from "./validation";

const CANCELLABLE_STATUSES = ["RESERVED", "CONFIRMED", "WAITLISTED", "PAYMENT_REJECTED", "TRANSFER_PENDING"] as const;
const CAPACITY_HOLDING_STATUSES = ["RESERVED", "CONFIRMED", "TRANSFER_PENDING"] as const;

export async function cancelBookingByStaff(input: {
  guildSlug: string;
  rideId: string;
  bookingId: string;
  actorUserId: string;
  reason: string;
}) {
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "rides" WHERE "id" = ${input.rideId}::uuid FOR UPDATE`;
    const booking = await tx.rideBooking.findFirst({
      where: {
        id: input.bookingId,
        rideId: input.rideId,
        status: { in: [...CANCELLABLE_STATUSES] },
        community: { slug: input.guildSlug },
      },
      include: {
        ride: { select: { id: true, slug: true } },
        payments: { select: { status: true, amountPaise: true, purpose: true } },
      },
    });
    if (!booking) throw new AuthError("BOOKING_NOT_CANCELLABLE", "This booking is no longer cancellable.", 409);

    const confirmedAmountPaise = booking.payments
      .filter(({ status }) => status === "CONFIRMED")
      .reduce((total, payment) => total + payment.amountPaise, 0);
    const submittedAmountPaise = booking.payments
      .filter(({ status }) => status === "SUBMITTED")
      .reduce((total, payment) => total + payment.amountPaise, 0);
    const heldCapacity = CAPACITY_HOLDING_STATUSES.includes(booking.status as typeof CAPACITY_HOLDING_STATUSES[number]);
    const now = new Date();

    await tx.rideBooking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancelledAt: now, reservationExpiresAt: null },
    });
    const occupied = await tx.rideBooking.aggregate({
      where: { rideId: booking.rideId, status: { in: [...CAPACITY_HOLDING_STATUSES] } },
      _sum: { seatCount: true },
    });
    await tx.ride.update({
      where: { id: booking.rideId },
      data: { bookedSlots: occupied._sum.seatCount ?? 0 },
    });
    await tx.communityAuditEvent.create({
      data: {
        communityId: booking.communityId,
        actorUserId: input.actorUserId,
        targetUserId: booking.userId,
        action: "BOOKING_CANCELLED_BY_STAFF",
        metadata: {
          rideId: booking.rideId,
          bookingId: booking.id,
          previousStatus: booking.status,
          reason: input.reason,
          partySize: booking.seatCount,
          seatsReleased: heldCapacity ? booking.seatCount : 0,
          confirmedAmountPaise,
          submittedAmountPaise,
          refundReviewRequired: confirmedAmountPaise > 0,
          proofReviewRequired: submittedAmountPaise > 0,
          cancelledAt: now.toISOString(),
        },
      },
    });
    return {
      rideId: booking.rideId,
      rideSlug: booking.ride.slug,
      confirmedAmountPaise,
      submittedAmountPaise,
    };
  }, RESERVATION_TRANSACTION_OPTIONS);

  let promotedSeats = 0;
  try {
    const promotion = await processExpiredReservations({ rideId: result.rideId });
    promotedSeats = promotion.promoted;
    if (promotion.eventKeys.length) {
      await dispatchNotificationOutbox({ eventKeys: promotion.eventKeys }).catch((error) => {
        console.error("Immediate waitlist-promotion notification failed; the durable event remains queued", { error });
      });
    }
  } catch (error) {
    // Cancellation is already committed and must not be reported as failed. The
    // idempotent scheduler or next booking attempt can safely retry promotion.
    console.error("Booking cancelled, but immediate waitlist promotion failed", {
      rideId: result.rideId,
      error,
    });
  }
  return { ...result, promotedSeats };
}
