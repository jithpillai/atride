import "server-only";

import { db } from "@/lib/db";
import { canManageGuildRides, rideEditorStaffRoles } from "@/server/auth/permissions";
import { AuthError } from "@/server/auth/auth-service";

type ManifestSession = {
  userId: string;
  user: {
    communityMemberships: Array<{
      community: { slug: string };
      roles: Array<{ role: string }>;
    }>;
  };
};

export async function loadRideManifest(session: ManifestSession, slug: string, rideId: string) {
  const membership = session.user.communityMemberships.find(({ community }) => community.slug === slug);
  const managesAllOrigins = canManageGuildRides(membership);
  let permittedOriginIds: string[] | null = null;

  if (!managesAllOrigins) {
    const assignments = await db.rideStaffAssignment.findMany({
      where: {
        rideId,
        userId: session.userId,
        role: { in: rideEditorStaffRoles() },
        ride: { community: { slug } },
      },
      select: { originId: true },
    });
    if (!assignments.length) {
      throw new AuthError("MANIFEST_FORBIDDEN", "You cannot view this ride manifest.", 403);
    }
    if (!assignments.some(({ originId }) => originId === null)) {
      permittedOriginIds = [...new Set(assignments.flatMap(({ originId }) => originId ? [originId] : []))];
    }
  }

  const ride = await db.ride.findFirst({
    where: { id: rideId, community: { slug } },
    include: {
      community: { select: { id: true, name: true, slug: true } },
      origins: { orderBy: { sortOrder: "asc" } },
      bookings: {
        where: {
          status: { in: ["RESERVED", "CONFIRMED", "WAITLISTED", "PAYMENT_REJECTED", "TRANSFER_PENDING"] },
          ...(permittedOriginIds ? { originId: { in: permittedOriginIds } } : {}),
        },
        include: {
          origin: true,
          vehicle: true,
          participants: { orderBy: { sortOrder: "asc" } },
          accommodationSelections: { orderBy: { createdAt: "asc" } },
          payments: { orderBy: { createdAt: "asc" } },
          user: {
            select: {
              displayName: true,
              contacts: { where: { isPrimary: true, type: "EMAIL" }, take: 1 },
              profile: {
                select: {
                  homeCity: true,
                  operationalPhone: true,
                  phoneVerifiedAt: true,
                  bloodGroup: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!ride) throw new AuthError("RIDE_NOT_FOUND", "This ride does not exist.", 404);

  const originOrder = new Map(ride.origins.map((origin, index) => [origin.id, index]));
  ride.bookings.sort((left, right) =>
    (originOrder.get(left.originId ?? "") ?? 999) - (originOrder.get(right.originId ?? "") ?? 999)
    || left.createdAt.getTime() - right.createdAt.getTime(),
  );

  return {
    ride,
    scope: permittedOriginIds
      ? { kind: "ORIGINS" as const, originIds: permittedOriginIds }
      : { kind: "ALL" as const, originIds: ride.origins.map(({ id }) => id) },
  };
}

export function bookingVehicleLabel(booking: {
  vehicleMode: string;
  vehicleSnapshot: unknown;
  vehicle: { manufacturer: string; model: string; registrationLast4: string | null } | null;
}) {
  if (booking.vehicleMode === "NO_VEHICLE") return "Not bringing a vehicle";
  if (booking.vehicleMode === "PRIVATE_VEHICLE") return "Own vehicle · details private";
  if (booking.vehicle) {
    return `${booking.vehicle.manufacturer} ${booking.vehicle.model}${booking.vehicle.registrationLast4 ? ` · …${booking.vehicle.registrationLast4}` : ""}`;
  }
  const snapshot = booking.vehicleSnapshot && typeof booking.vehicleSnapshot === "object"
    ? booking.vehicleSnapshot as Record<string, unknown>
    : null;
  if (snapshot) {
    const name = [snapshot.manufacturer, snapshot.model].filter((value) => typeof value === "string" && value).join(" ");
    const last4 = typeof snapshot.registrationLast4 === "string" ? snapshot.registrationLast4 : "";
    if (name) return `${name}${last4 ? ` · …${last4}` : ""}`;
  }
  return "Own vehicle";
}

export function participantWhatsAppList(manifest: Awaited<ReturnType<typeof loadRideManifest>>) {
  const { ride, scope } = manifest;
  const active = ride.bookings.filter(({ status }) => status === "CONFIRMED");
  const lines = [
    `*${ride.community.name} — Ride Participants*`,
    `*Ride:* ${ride.title}`,
    `*Date:* ${ride.startsAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}`,
    ...(scope.kind === "ORIGINS" ? [`*Starting group:* ${ride.origins.filter(({ id }) => scope.originIds.includes(id)).map(({ city }) => city).join(", ")}`] : []),
    "",
  ];
  let number = 1;
  for (const booking of active) {
    const participants = booking.participants.length ? booking.participants : [{
      displayName: booking.user.displayName,
      role: booking.occupantRole,
      dietaryPreference: booking.dietaryPreference,
    }];
    for (const participant of participants) {
      lines.push(`${number}. ${participant.displayName} - ${booking.origin?.city ?? ride.originCity} - ${humanize(participant.role)} - ${participant.dietaryPreference ?? "Diet not specified"}`);
      number += 1;
    }
  }
  lines.push("", `*Total confirmed participants:* ${number - 1}`);
  if (number === 1) lines.splice(lines.length - 2, 0, "No confirmed participants yet.");
  return lines.join("\n");
}

export function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
