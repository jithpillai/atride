import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { processExpiredReservations } from "./expiry-service";
import { accommodationCharge, partyBookingPrice } from "./party-pricing";
import { buildPaymentObligations } from "./payment-obligations";
import { buildBookingSnapshot } from "./snapshot";
import { RESERVATION_TRANSACTION_OPTIONS, reservationExpiry, type BookingVehicleMode, type CompanionRole, type OccupantRole, type OfflinePaymentMethod } from "./validation";

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
  companions: Array<{
    displayName: string;
    role: CompanionRole;
    dietaryPreference: string | null;
    accessibilityNotes: string | null;
    emergencyContactName: string;
    emergencyContactPhone: string;
  }>;
  accommodationOptionIds: string[];
  addOnIds: string[];
  paymentMethod: OfflinePaymentMethod;
  joinWaitlistWhenFull: boolean;
  newcomerDisplayConsent: boolean;
};

const bookingRideInclude = {
  community: { select: { id: true, slug: true, name: true, paymentSettings: true } },
  origins: { orderBy: { sortOrder: "asc" as const } },
  itineraryDays: { orderBy: { sortOrder: "asc" as const } },
  accommodations: { orderBy: { checkInAt: "asc" as const }, include: { options: { where: { active: true }, orderBy: { sortOrder: "asc" as const } } } },
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

    const profile = await tx.participantProfile.findUnique({ where: { userId: input.userId }, include: { user: { select: { displayName: true } } } });
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

    const partySize = 1 + input.companions.length;
    const selectedAddOns = ride.packageItems.filter((item) => item.type === "ADD_ON" && input.addOnIds.includes(item.id));
    if (selectedAddOns.length !== new Set(input.addOnIds).size) throw new AuthError("INVALID_ADD_ON", "One of the selected add-ons is unavailable.");
    const accommodationOptions = ride.accommodations.map((stay) => {
      if (!stay.options.length) return null;
      const option = stay.options.find((candidate) => input.accommodationOptionIds.includes(candidate.id));
      if (!option) throw new AuthError("ACCOMMODATION_REQUIRED", `Choose an accommodation option for ${stay.locality}.`);
      const { units, totalPricePaise } = accommodationCharge(option, partySize);
      return { stay, option, units, totalPricePaise };
    }).filter((selection): selection is NonNullable<typeof selection> => Boolean(selection));
    if (new Set(input.accommodationOptionIds).size !== accommodationOptions.length) throw new AuthError("INVALID_ACCOMMODATION", "One of the selected accommodation options is unavailable.");
    const accommodationTotalPaise = accommodationOptions.reduce((total, selection) => total + selection.totalPricePaise, 0);
    const {
      basePricePaise,
      addOnTotalPaise,
      totalPricePaise,
      confirmationDepositPaise: depositPaise,
      balanceDuePaise,
    } = partyBookingPrice({
      partySize,
      ridePricePaise: ride.pricePaise,
      confirmationDepositPaise: ride.confirmationDepositPaise,
      addOnUnitPricesPaise: selectedAddOns.map((item) => item.pricePaise ?? 0),
      accommodationTotalPaise,
    });

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
    const hasCapacity = effectiveOccupied + partySize <= ride.totalSlots;
    if (!hasCapacity && !input.joinWaitlistWhenFull) throw new AuthError("RIDE_FULL", "This ride is full. Join the waitlist instead.", 409);
    if (!hasCapacity) {
      if (ride.waitlistCapacity <= 0) throw new AuthError("WAITLIST_CLOSED", "This ride's waitlist is closed.", 409);
      const waitlisted = await tx.rideBooking.aggregate({
        where: {
          rideId: ride.id,
          status: "WAITLISTED",
          id: existing ? { not: existing.id } : undefined,
        },
        _sum: { seatCount: true },
      });
      const queuedSeats = waitlisted._sum.seatCount ?? 0;
      if (queuedSeats + partySize > ride.waitlistCapacity) {
        throw new AuthError("WAITLIST_FULL", "The remaining waitlist does not have room for this entire booking party.", 409);
      }
    }

    if (hasCapacity) {
      for (const selection of accommodationOptions) {
        if (selection.option.availableRooms === null) continue;
        const used = await tx.bookingAccommodationSelection.aggregate({
          where: {
            optionId: selection.option.id,
            bookingId: existing ? { not: existing.id } : undefined,
            booking: { status: { in: [...CAPACITY_HOLDING_STATUSES] } },
          },
          _sum: { units: true },
        });
        if ((used._sum.units ?? 0) + selection.units > selection.option.availableRooms) {
          throw new AuthError("ACCOMMODATION_FULL", `${selection.option.name} at ${selection.stay.locality} no longer has enough rooms for this party.`, 409);
        }
      }
    }

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
      seatCount: partySize,
      basePricePaise,
      addOnTotalPaise,
      accommodationTotalPaise,
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
        pricePaise: (item.pricePaise ?? 0) * partySize,
      })) });
    }
    await tx.bookingParticipant.deleteMany({ where: { bookingId: booking.id } });
    await tx.bookingParticipant.createMany({ data: [
      {
        bookingId: booking.id,
        linkedUserId: input.userId,
        displayName: profile.user.displayName,
        role: input.occupantRole,
        dietaryPreference: input.dietaryPreference,
        accessibilityNotes: input.accessibilityNotes,
        emergencyContactName: profile.emergencyContactName,
        emergencyContactPhone: profile.emergencyContactPhone,
        isBookingLead: true,
        sortOrder: 0,
      },
      ...input.companions.map((companion, index) => ({ bookingId: booking.id, linkedUserId: null, isBookingLead: false, sortOrder: index + 1, ...companion })),
    ] });
    await tx.bookingAccommodationSelection.deleteMany({ where: { bookingId: booking.id } });
    if (accommodationOptions.length) await tx.bookingAccommodationSelection.createMany({ data: accommodationOptions.map(({ stay, option, units, totalPricePaise: selectionTotal }) => ({
      bookingId: booking.id,
      accommodationId: stay.id,
      optionId: option.id,
      accommodationName: stay.propertyName,
      optionName: option.name,
      pricingModeSnapshot: option.pricingMode,
      unitPricePaise: option.pricePaise,
      units,
      guestCount: partySize,
      totalPricePaise: selectionTotal,
    })) });
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
    await tx.ride.update({ where: { id: ride.id }, data: { bookedSlots: hasCapacity ? effectiveOccupied + partySize : effectiveOccupied } });
    await tx.communityAuditEvent.create({ data: {
      communityId: ride.communityId,
      actorUserId: input.userId,
      action: hasCapacity ? "BOOKING_RESERVED" : "BOOKING_WAITLISTED",
      metadata: { rideId: ride.id, bookingId: booking.id, originId: origin.id, partySize, accommodationTotalPaise },
    } });
    return { booking, outcome: hasCapacity ? "RESERVED" as const : "WAITLISTED" as const };
  }, RESERVATION_TRANSACTION_OPTIONS);
}

export async function findUserBookingForRide(userId: string, rideId: string) {
  return db.rideBooking.findUnique({
    where: { rideId_userId: { rideId, userId } },
    include: { origin: true, addOns: true, participants: { orderBy: { sortOrder: "asc" } }, accommodationSelections: { orderBy: { createdAt: "asc" } }, payments: { orderBy: { createdAt: "asc" } } },
  });
}
