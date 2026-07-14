type SnapshotRide = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  destination: string;
  startsAt: Date;
  endsAt: Date;
  pricePaise: number;
  confirmationDepositPaise: number;
  balanceDueAt: Date | null;
  registrationClosesAt: Date | null;
  vehicleType: string;
  vehicleRequirements: string;
  updatedAt: Date;
  origins: Array<{ id: string; city: string; meetingPoint: string; departureAt: Date; mergePoint: string | null; routeSummary: string | null }>;
  itineraryDays: Array<{ dayNumber: number; sortOrder: number; date: Date; scheduledAt: Date | null; title: string; summary: string }>;
  accommodations: Array<{ propertyName: string; locality: string; checkInAt: Date; checkOutAt: Date; roomSummary: string; amenities: string[]; participantNote: string | null; exactLocationRestricted: boolean; options: Array<{ id: string; name: string; description: string | null; pricingMode: string; pricePaise: number; maxOccupancy: number; availableRooms: number | null; sortOrder: number }> }>;
  packageItems: Array<{ id: string; type: string; dayNumber: number | null; title: string; description: string | null; pricePaise: number | null; sortOrder: number }>;
  policies: Array<{ id: string; type: string; title: string; content: string; version: number; sortOrder: number }>;
  community: {
    id: string;
    slug: string;
    name: string;
    paymentSettings?: {
      upiEnabled: boolean;
      upiVpa: string | null;
      upiPayeeName: string | null;
      participantInstructions: string | null;
    } | null;
  };
};

export function buildBookingSnapshot(ride: SnapshotRide) {
  const latestPolicies = ride.policies.filter(
    (policy, index, policies) => policies.findIndex((candidate) => candidate.type === policy.type) === index,
  );
  return {
    snapshotVersion: 1,
    capturedAt: new Date().toISOString(),
    sourceUpdatedAt: ride.updatedAt.toISOString(),
    ride: {
      id: ride.id,
      slug: ride.slug,
      title: ride.title,
      summary: ride.summary,
      description: ride.description,
      destination: ride.destination,
      startsAt: ride.startsAt.toISOString(),
      endsAt: ride.endsAt.toISOString(),
      pricePaise: ride.pricePaise,
      confirmationDepositPaise: ride.confirmationDepositPaise,
      balanceDueAt: ride.balanceDueAt?.toISOString() ?? null,
      registrationClosesAt: ride.registrationClosesAt?.toISOString() ?? null,
      vehicleType: ride.vehicleType,
      vehicleRequirements: ride.vehicleRequirements,
    },
    guild: { id: ride.community.id, slug: ride.community.slug, name: ride.community.name },
    origins: ride.origins.map((origin) => ({ ...origin, departureAt: origin.departureAt.toISOString() })),
    itinerary: ride.itineraryDays.map((item) => ({
      ...item,
      date: item.date.toISOString().slice(0, 10),
      scheduledAt: item.scheduledAt?.toISOString() ?? null,
    })),
    accommodations: ride.accommodations.map((stay) => ({
      ...stay,
      checkInAt: stay.checkInAt.toISOString(),
      checkOutAt: stay.checkOutAt.toISOString(),
    })),
    packageItems: ride.packageItems,
    policies: latestPolicies,
  };
}
