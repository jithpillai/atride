import "server-only";

import { db } from "@/lib/db";
import { buildPaymentObligations } from "@/server/booking/payment-obligations";
import { RESERVATION_TRANSACTION_OPTIONS, reservationExpiry } from "@/server/booking/validation";
import { queueParticipantReservationEvent } from "@/server/notifications/booking-events";

const INITIAL_PAYMENT_PURPOSES = ["CONFIRMATION_DEPOSIT", "FULL_PAYMENT"] as const;
const CAPACITY_HOLDING_STATUSES = ["RESERVED", "CONFIRMED", "TRANSFER_PENDING"] as const;

type ProcessOptions = { now?: Date; limit?: number; rideId?: string };

export type ReservationExpiryResult = {
  ridesProcessed: number;
  expired: number;
  promoted: number;
  eventKeys: string[];
  rideSlugs: string[];
};

async function processRide(rideId: string, now: Date) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "rides" WHERE "id" = ${rideId}::uuid FOR UPDATE`;
    const ride = await tx.ride.findUnique({
      where: { id: rideId },
      include: { community: { include: { paymentSettings: true } } },
    });
    if (!ride) return { expired: 0, promoted: 0, eventKeys: [] as string[], rideSlug: null as string | null };

    const expiring = await tx.rideBooking.findMany({
      where: {
        rideId,
        status: "RESERVED",
        reservationExpiresAt: { lte: now },
        payments: {
          none: {
            purpose: { in: [...INITIAL_PAYMENT_PURPOSES] },
            status: { in: ["SUBMITTED", "CONFIRMED"] },
          },
        },
      },
      orderBy: { reservationExpiresAt: "asc" },
    });

    const eventKeys: string[] = [];
    let expired = 0;
    for (const booking of expiring) {
      const changed = await tx.rideBooking.updateMany({
        where: { id: booking.id, status: "RESERVED", reservationExpiresAt: { lte: now } },
        data: { status: "EXPIRED" },
      });
      if (!changed.count) continue;
      expired += booking.seatCount;
      eventKeys.push(...await queueParticipantReservationEvent(
        tx,
        booking.id,
        "BOOKING_RESERVATION_EXPIRED",
        booking.reservationExpiresAt?.toISOString() ?? now.toISOString(),
      ));
      await tx.communityAuditEvent.create({
        data: {
          communityId: booking.communityId,
          action: "BOOKING_RESERVATION_EXPIRED",
          metadata: { rideId, bookingId: booking.id, expiredAt: now.toISOString(), source: "SYSTEM" },
        },
      });
    }

    const occupied = await tx.rideBooking.aggregate({
      where: { rideId, status: { in: [...CAPACITY_HOLDING_STATUSES] } },
      _sum: { seatCount: true },
    });
    let occupiedSeats = occupied._sum.seatCount ?? 0;
    const capacity = ride.totalSlots + ride.bufferSlots;
    const canPromote = ride.status === "PUBLISHED"
      && ride.startsAt > now
      && (!ride.registrationClosesAt || ride.registrationClosesAt > now);
    const availableSeats = canPromote ? Math.max(capacity - occupiedSeats, 0) : 0;
    const waitlisted = availableSeats
      ? await tx.rideBooking.findMany({
          where: { rideId, status: "WAITLISTED", seatCount: { lte: availableSeats } },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: availableSeats,
        })
      : [];

    const paymentSettings = ride.community.paymentSettings;
    const upiRecipient = paymentSettings?.upiEnabled && paymentSettings.upiVpa && paymentSettings.upiPayeeName
      ? {
          payeeVpaSnapshot: paymentSettings.upiVpa,
          payeeNameSnapshot: paymentSettings.upiPayeeName,
          payeeInstructionsSnapshot: paymentSettings.participantInstructions,
        }
      : null;
    let promoted = 0;
    for (const booking of waitlisted) {
      if (occupiedSeats + booking.seatCount > capacity) break;
      const expiresAt = reservationExpiry(now, ride.registrationClosesAt);
      if (expiresAt <= now) break;
      const changed = await tx.rideBooking.updateMany({
        where: { id: booking.id, status: "WAITLISTED" },
        data: { status: "RESERVED", reservationExpiresAt: expiresAt },
      });
      if (!changed.count) continue;
      await tx.bookingPayment.deleteMany({
        where: { bookingId: booking.id, status: { in: ["PENDING", "REJECTED"] } },
      });
      await tx.bookingPayment.createMany({
        data: buildPaymentObligations({
          bookingId: booking.id,
          method: booking.paymentMethodPreference,
          totalPricePaise: booking.totalPricePaise,
          confirmationDepositPaise: booking.confirmationDepositPaise,
          balanceDuePaise: booking.balanceDuePaise,
          reservationExpiresAt: expiresAt,
          balanceDueAt: ride.balanceDueAt ?? ride.registrationClosesAt ?? ride.startsAt,
          upiRecipient,
        }),
      });
      occupiedSeats += booking.seatCount;
      promoted += booking.seatCount;
      eventKeys.push(...await queueParticipantReservationEvent(
        tx,
        booking.id,
        "BOOKING_WAITLIST_PROMOTED",
        expiresAt.toISOString(),
      ));
      await tx.communityAuditEvent.create({
        data: {
          communityId: booking.communityId,
          action: "BOOKING_WAITLIST_PROMOTED",
          metadata: { rideId, bookingId: booking.id, reservationExpiresAt: expiresAt.toISOString(), source: "SYSTEM" },
        },
      });
    }

    await tx.ride.update({ where: { id: rideId }, data: { bookedSlots: occupiedSeats } });
    return { expired, promoted, eventKeys, rideSlug: ride.slug };
  }, RESERVATION_TRANSACTION_OPTIONS);
}

export async function processExpiredReservations(options: ProcessOptions = {}): Promise<ReservationExpiryResult> {
  const now = options.now ?? new Date();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const rideIds = options.rideId
    ? [options.rideId]
    : [...new Set((await db.rideBooking.findMany({
        where: {
          status: "RESERVED",
          reservationExpiresAt: { lte: now },
          payments: {
            none: {
              purpose: { in: [...INITIAL_PAYMENT_PURPOSES] },
              status: { in: ["SUBMITTED", "CONFIRMED"] },
            },
          },
        },
        select: { rideId: true },
        orderBy: { reservationExpiresAt: "asc" },
        take: limit,
      })).map(({ rideId }) => rideId))];

  const result: ReservationExpiryResult = { ridesProcessed: 0, expired: 0, promoted: 0, eventKeys: [], rideSlugs: [] };
  for (const rideId of rideIds) {
    const rideResult = await processRide(rideId, now);
    result.ridesProcessed += 1;
    result.expired += rideResult.expired;
    result.promoted += rideResult.promoted;
    result.eventKeys.push(...rideResult.eventKeys);
    if (rideResult.rideSlug) result.rideSlugs.push(rideResult.rideSlug);
  }
  return result;
}
