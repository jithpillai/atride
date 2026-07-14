import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { processExpiredReservations } from "./expiry-service";
import { buildPaymentObligations } from "./payment-obligations";
import { buildBookingSnapshot } from "./snapshot";
import { RESERVATION_TRANSACTION_OPTIONS, reservationExpiry, type BookingVehicleMode, type OccupantRole, type OfflinePaymentMethod } from "./validation";

const CAPACITY_HOLDING_STATUSES = ["RESERVED", "CONFIRMED", "TRANSFER_PENDING"] as const;

export type ReserveRideInput = {
  rideId: string;
  userId: string;
  originId: string;
  vehicleId: string | null;
  vehicleMode: BookingVehicleMode;
  rideOnlyVehicle: { manufacturer: string | null; model: string | null; registrationLast4: string | null };
  occupantRole: OccupantRole;
  dietaryPreference: string | null;
  accessibilityNotes: string | null;
  addOnIds: string[];
  paymentMethod: OfflinePaymentMethod;
  joinWaitlistWhenFull: boolean;
  newcomerDisplayConsent: boolean;
};

const bookingRideInclude = {
  community: { select: { id: true, slug: true, name: true, paymentSettings: true } },
  origins: { orderBy: { sortOrder: "asc" as const } },
  itineraryDays: { orderBy: { sortOrder: "asc" as const } },
  accommodations: { orderBy: { checkInAt: "asc" as const } },
  packageItems: { orderBy: [{ type: "asc" as const }, { sortOrder: "asc" as const }] },
  policies: { orderBy: [{ type: "asc" as const }, { version: "desc" as const }] },
} satisfies Prisma.RideInclude;

export async function reserveRide(input: ReserveRideInput) {
  await processExpiredReservations({ rideId: input.rideId });
  const now = new Date();
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "rides" WHERE "id" = ${input.rideId}::uuid FOR UPDATE`;
    const ride = await tx.ride.findUnique({ where: { id: input.rideId }, include: bookingRideInclude });
    if (!ride || ride.status !== "PUBLISHED") throw new AuthError("RIDE_UNAVAILABLE", "This ride is not accepting reservations.", 409);
    if (ride.registrationClosesAt && ride.registrationClosesAt <= now) {
      throw new AuthError("REGISTRATION_CLOSED", "Registration for this ride has closed.", 409);
    }

    const profile = await tx.participantProfile.findUnique({ where: { userId: input.userId } });
    if (!profile?.onboardingCompletedAt) throw new AuthError("PROFILE_REQUIRED", "Complete your participant profile before reserving.", 409);
    const origin = ride.origins.find((candidate) => candidate.id === input.originId);
    if (!origin) throw new AuthError("INVALID_ORIGIN", "Choose a valid starting group.");

    const operatesVehicle = input.occupantRole === "RIDER" || input.occupantRole === "DRIVER";
    if (operatesVehicle && input.vehicleMode === "NO_VEHICLE") {
      throw new AuthError("VEHICLE_REQUIRED", "Choose how you are bringing your vehicle for this ride.");
    }
    if (!operatesVehicle && input.vehicleMode !== "NO_VEHICLE") {
      throw new AuthError("VEHICLE_NOT_APPLICABLE", "Only riders and drivers can bring a vehicle with this booking.");
    }

    let vehicleId: string | null = null;
    let vehicleSnapshot: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput = Prisma.DbNull;
    if (input.vehicleMode === "SAVED_VEHICLE") {
      if (!input.vehicleId) throw new AuthError("VEHICLE_REQUIRED", "Choose a vehicle from your garage.");
      const vehicle = await tx.vehicle.findFirst({ where: { id: input.vehicleId, userId: input.userId } });
      if (!vehicle || vehicle.type !== ride.vehicleType) throw new AuthError("INVALID_VEHICLE", `Choose one of your ${ride.vehicleType.toLowerCase()} vehicles.`);
      vehicleId = vehicle.id;
      vehicleSnapshot = {
        source: "SAVED_VEHICLE",
        type: vehicle.type,
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        nickname: vehicle.nickname,
        registrationLast4: vehicle.registrationLast4,
      };
    } else if (input.vehicleMode === "RIDE_ONLY_DETAILS") {
      if (!input.rideOnlyVehicle.manufacturer || !input.rideOnlyVehicle.model) {
        throw new AuthError("VEHICLE_DETAILS_REQUIRED", "Enter the vehicle manufacturer and model, or choose the private vehicle option.");
      }
      vehicleSnapshot = {
        source: "RIDE_ONLY_DETAILS",
        type: ride.vehicleType,
        manufacturer: input.rideOnlyVehicle.manufacturer,
        model: input.rideOnlyVehicle.model,
        registrationLast4: input.rideOnlyVehicle.registrationLast4,
      };
    } else if (input.vehicleMode === "PRIVATE_VEHICLE") {
      vehicleSnapshot = { source: "PRIVATE_VEHICLE", type: ride.vehicleType, detailsShared: false };
    }

    const selectedAddOns = ride.packageItems.filter((item) => item.type === "ADD_ON" && input.addOnIds.includes(item.id));
    if (selectedAddOns.length !== new Set(input.addOnIds).size) throw new AuthError("INVALID_ADD_ON", "One of the selected add-ons is unavailable.");
    const addOnTotalPaise = selectedAddOns.reduce((total, item) => total + (item.pricePaise ?? 0), 0);
    const totalPricePaise = ride.pricePaise + addOnTotalPaise;
    const depositPaise = Math.min(ride.confirmationDepositPaise || totalPricePaise, totalPricePaise);
    const balanceDuePaise = totalPricePaise - depositPaise;

    const occupied = await tx.rideBooking.aggregate({
      where: { rideId: ride.id, status: { in: [...CAPACITY_HOLDING_STATUSES] } },
      _sum: { seatCount: true },
    });
    const occupiedSeats = occupied._sum.seatCount ?? 0;
    const existing = await tx.rideBooking.findUnique({ where: { rideId_userId: { rideId: ride.id, userId: input.userId } } });
    if (existing?.status === "CONFIRMED") return { booking: existing, outcome: "ALREADY_CONFIRMED" as const };
    if (existing?.status === "RESERVED" && existing.reservationExpiresAt && existing.reservationExpiresAt > now) {
      return { booking: existing, outcome: "ALREADY_RESERVED" as const };
    }

    const existingHeldSeat = existing && CAPACITY_HOLDING_STATUSES.includes(existing.status as typeof CAPACITY_HOLDING_STATUSES[number]) ? existing.seatCount : 0;
    const effectiveOccupied = occupiedSeats - existingHeldSeat;
    const hasCapacity = effectiveOccupied < ride.totalSlots + ride.bufferSlots;
    if (!hasCapacity && !input.joinWaitlistWhenFull) throw new AuthError("RIDE_FULL", "This ride is full. Join the waitlist instead.", 409);

    const status = hasCapacity ? "RESERVED" as const : "WAITLISTED" as const;
    const expiresAt = hasCapacity ? reservationExpiry(now, ride.registrationClosesAt) : null;
    if (expiresAt && expiresAt <= now) throw new AuthError("REGISTRATION_CLOSED", "Registration for this ride has closed.", 409);
    const snapshot = buildBookingSnapshot(ride);
    const upiRecipient = ride.community.paymentSettings?.upiEnabled && ride.community.paymentSettings.upiVpa && ride.community.paymentSettings.upiPayeeName
      ? {
          payeeVpaSnapshot: ride.community.paymentSettings.upiVpa,
          payeeNameSnapshot: ride.community.paymentSettings.upiPayeeName,
          payeeInstructionsSnapshot: ride.community.paymentSettings.participantInstructions,
        }
      : null;
    if (hasCapacity && input.paymentMethod === "UPI" && !upiRecipient) {
      throw new AuthError("UPI_UNAVAILABLE", "This Guild has not enabled assisted UPI. Choose bank transfer or cash.", 409);
    }
    const commonData = {
      communityId: ride.communityId,
      originId: origin.id,
      vehicleId,
      vehicleMode: input.vehicleMode,
      vehicleSnapshot,
      paymentMethodPreference: input.paymentMethod,
      status,
      occupantRole: input.occupantRole,
      dietaryPreference: input.dietaryPreference,
      accessibilityNotes: input.accessibilityNotes,
      basePricePaise: ride.pricePaise,
      addOnTotalPaise,
      totalPricePaise,
      confirmationDepositPaise: depositPaise,
      balanceDuePaise,
      reservationExpiresAt: expiresAt,
      waiverAcceptedAt: now,
      commercialTermsAcceptedAt: now,
      newcomerDisplayConsentAt: input.newcomerDisplayConsent ? now : null,
      packageSnapshot: snapshot,
      cancelledAt: null,
      confirmedAt: null,
    } satisfies Prisma.RideBookingUncheckedUpdateInput;

    const booking = existing
      ? await tx.rideBooking.update({ where: { id: existing.id }, data: commonData })
      : await tx.rideBooking.create({ data: { ...commonData, rideId: ride.id, userId: input.userId } as Prisma.RideBookingUncheckedCreateInput });
    await tx.bookingAddOn.deleteMany({ where: { bookingId: booking.id } });
    if (selectedAddOns.length) {
      await tx.bookingAddOn.createMany({ data: selectedAddOns.map((item) => ({
        bookingId: booking.id,
        packageItemId: item.id,
        titleSnapshot: item.title,
        descriptionSnapshot: item.description,
        pricePaise: item.pricePaise ?? 0,
      })) });
    }
    await tx.bookingPayment.deleteMany({ where: { bookingId: booking.id, status: { in: ["PENDING", "REJECTED"] } } });
    if (hasCapacity) {
      await tx.bookingPayment.createMany({ data: buildPaymentObligations({
        bookingId: booking.id,
        method: input.paymentMethod,
        totalPricePaise,
        confirmationDepositPaise: depositPaise,
        balanceDuePaise,
        reservationExpiresAt: expiresAt,
        balanceDueAt: ride.balanceDueAt ?? ride.registrationClosesAt ?? ride.startsAt,
        upiRecipient,
      }) });
    }
    await tx.ride.update({ where: { id: ride.id }, data: { bookedSlots: hasCapacity ? effectiveOccupied + 1 : effectiveOccupied } });
    await tx.communityAuditEvent.create({ data: {
      communityId: ride.communityId,
      actorUserId: input.userId,
      action: hasCapacity ? "BOOKING_RESERVED" : "BOOKING_WAITLISTED",
      metadata: { rideId: ride.id, bookingId: booking.id, originId: origin.id },
    } });
    return { booking, outcome: hasCapacity ? "RESERVED" as const : "WAITLISTED" as const };
  }, RESERVATION_TRANSACTION_OPTIONS);
}

export async function findUserBookingForRide(userId: string, rideId: string) {
  return db.rideBooking.findUnique({
    where: { rideId_userId: { rideId, userId } },
    include: { origin: true, addOns: true, payments: { orderBy: { createdAt: "asc" } } },
  });
}
