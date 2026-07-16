import "server-only";

import { cache } from "react";

import type { GuildView, ResolvedGuild, RideView, TenantContext } from "@/domain/discovery";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { summarizeBookingPayments } from "@/server/booking/payment-summary";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";

const guildInclude = {
  locations: {
    orderBy: [{ isHome: "desc" }, { city: "asc" }],
  },
  visibility: true,
  logoAsset: true,
  coverAsset: true,
  mediaAssets: { where: { purpose: "GUILD_GALLERY" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
  _count: {
    select: {
      memberships: { where: { status: "ACTIVE" } },
      rides: { where: { status: "COMPLETED" } },
    },
  },
} satisfies Prisma.CommunityInclude;

const rideInclude = {
  community: {
    select: { slug: true },
  },
  coverAsset: true,
} satisfies Prisma.RideInclude;

type GuildRecord = Prisma.CommunityGetPayload<{ include: typeof guildInclude }>;
type RideRecord = Prisma.RideGetPayload<{ include: typeof rideInclude }>;

function toGuildView(guild: GuildRecord): GuildView {
  if (!guild.visibility) {
    throw new Error(`Guild ${guild.slug} has no visibility policy.`);
  }

  return {
    slug: guild.slug,
    name: guild.name,
    shortName: guild.shortName,
    tagline: guild.tagline,
    description: guild.description,
    foundedYear: guild.foundedYear,
    homeCity: guild.locations.find((location) => location.isHome)?.city ?? guild.locations[0]?.city ?? "India",
    cities: guild.locations.map((location) => location.city),
    memberCount: guild._count.memberships,
    completedRides: guild._count.rides,
    directoryVisibility: guild.visibility.directoryVisibility,
    access: guild.visibility.guildHallAccess,
    accent: guild.accentColor,
    gradient: guild.heroGradient,
    specialties: guild.specialties,
    logoUrl: guild.logoAsset ? cloudinaryImageUrl(guild.logoAsset) : null,
    coverUrl: guild.coverAsset ? cloudinaryImageUrl(guild.coverAsset) : null,
    galleryUrls: guild.mediaAssets.map((asset) => cloudinaryImageUrl(asset)),
    websiteUrl: guild.websiteUrl,
    instagramUrl: guild.instagramUrl,
    whatsappUrl: guild.whatsappUrl,
    newcomerDisplayEnabled: guild.newcomerDisplayEnabled,
  };
}

function toRideView(ride: RideRecord): RideView {
  const difficulty = {
    EASY: "Easy",
    MODERATE: "Moderate",
    CHALLENGING: "Challenging",
  } as const;

  return {
    slug: ride.slug,
    guildSlug: ride.community.slug,
    title: ride.title,
    summary: ride.summary,
    city: ride.originCity,
    destination: ride.destination,
    startDate: ride.startsAt.toISOString(),
    endDate: ride.endsAt.toISOString(),
    price: ride.pricePaise / 100,
    totalSlots: ride.totalSlots,
    bookedSlots: ride.bookedSlots,
    vehicleType: ride.vehicleType,
    difficulty: difficulty[ride.difficulty],
    featured: ride.featured,
    gradient: ride.heroGradient,
    coverUrl: ride.coverAsset ? cloudinaryImageUrl(ride.coverAsset) : null,
    distanceKm: ride.distanceKm,
  };
}

export const listMarketplaceGuilds = cache(async (): Promise<GuildView[]> => {
  const guilds = await db.community.findMany({
    where: {
      status: "ACTIVE",
      visibility: { directoryVisibility: "LISTED" },
    },
    include: guildInclude,
    orderBy: [{ name: "asc" }],
  });

  return guilds.map(toGuildView);
});

export const listMarketplaceRides = cache(async (): Promise<RideView[]> => {
  const rides = await db.ride.findMany({
    where: {
      status: "PUBLISHED",
      visibility: "PUBLIC",
      community: {
        status: "ACTIVE",
        visibility: {
          directoryVisibility: "LISTED",
          guildHallAccess: "PUBLIC",
        },
      },
    },
    include: rideInclude,
    orderBy: [{ featured: "desc" }, { startsAt: "asc" }],
  });

  return rides.map(toRideView);
});

export const listUpcomingStaffRides = cache(async (userId: string) => {
  const rides = await db.ride.findMany({
    where: {
      startsAt: { gte: new Date() },
      status: { in: ["PUBLISHED", "CLOSED", "POSTPONED"] },
      OR: [
        { staffAssignments: { some: { userId } } },
        { bookings: { some: { userId, status: { in: ["RESERVED", "CONFIRMED", "WAITLISTED", "PAYMENT_REJECTED", "TRANSFER_PENDING"] } } } },
      ],
    },
    include: {
      community: { select: { slug: true, name: true } },
      coverAsset: true,
      staffAssignments: { where: { userId }, include: { origin: { select: { city: true } } } },
      bookings: { where: { userId }, include: { origin: { select: { city: true } }, payments: { orderBy: { createdAt: "asc" } } } },
    },
    orderBy: { startsAt: "asc" },
    take: 12,
  });
  const mapped = rides.map((ride) => {
    const booking = ride.bookings[0];
    const summary = booking ? summarizeBookingPayments(booking) : null;
    return {
      ...toRideView(ride),
      guildName: ride.community.name,
      assignments: ride.staffAssignments.map((assignment) => ({ role: assignment.role, originCity: assignment.origin?.city ?? null })),
      booking: booking ? {
        status: booking.status,
        originCity: booking.origin?.city ?? null,
        paymentStatus: summary?.activePayment?.status ?? (summary?.fullyPaid ? "CONFIRMED" : null),
        paymentPurpose: summary?.activePayment?.purpose ?? null,
        paidPaise: summary?.paidPaise ?? 0,
        outstandingPaise: summary?.outstandingPaise ?? booking.totalPricePaise,
        paymentOverdue: summary?.overdue ?? false,
        reservationExpiresAt: booking.reservationExpiresAt?.toISOString() ?? null,
      } : null,
    };
  });
  const priority = (ride: typeof mapped[number]) => ride.booking?.outstandingPaise ? 0
    : ride.booking?.status === "CONFIRMED" ? 1
      : ride.booking?.status === "WAITLISTED" ? 2
        : 3;
  return mapped.sort((left, right) => priority(left) - priority(right) || new Date(left.startDate).getTime() - new Date(right.startDate).getTime()).slice(0, 6);
});

export type PersonalizedFeaturedRide = {
  ride: RideView;
  contextLabel: string;
  kind: "UPCOMING" | "COMPLETED" | "GUILD_UPCOMING";
};

export const findPersonalizedFeaturedRide = cache(async (userId: string): Promise<PersonalizedFeaturedRide | null> => {
  const now = new Date();
  const visibleRide: Prisma.RideWhereInput = {
    visibility: "PUBLIC",
    community: {
      status: "ACTIVE",
      visibility: { guildHallAccess: "PUBLIC" },
    },
  };
  const personalConnection: Prisma.RideWhereInput = {
    OR: [
      { staffAssignments: { some: { userId } } },
      { bookings: { some: { userId, status: { in: ["RESERVED", "CONFIRMED", "WAITLISTED", "PAYMENT_REJECTED", "TRANSFER_PENDING"] } } } },
    ],
  };

  const upcoming = await db.ride.findFirst({
    where: {
      ...visibleRide,
      ...personalConnection,
      startsAt: { gte: now },
      status: { in: ["PUBLISHED", "CLOSED", "POSTPONED"] },
    },
    include: rideInclude,
    orderBy: { startsAt: "asc" },
  });
  if (upcoming) return { ride: toRideView(upcoming), contextLabel: "Your upcoming ride", kind: "UPCOMING" };

  const completed = await db.ride.findFirst({
    where: {
      ...visibleRide,
      status: "COMPLETED",
      OR: [
        { staffAssignments: { some: { userId } } },
        { bookings: { some: { userId, status: "CONFIRMED" } } },
      ],
    },
    include: rideInclude,
    orderBy: { endsAt: "desc" },
  });
  if (completed) return { ride: toRideView(completed), contextLabel: "From your ride history", kind: "COMPLETED" };

  const membershipRide = await db.ride.findFirst({
    where: {
      ...visibleRide,
      startsAt: { gte: now },
      status: { in: ["PUBLISHED", "CLOSED", "POSTPONED"] },
      community: {
        status: "ACTIVE",
        visibility: { guildHallAccess: "PUBLIC" },
        memberships: { some: { userId, status: "ACTIVE" } },
      },
    },
    include: {
      community: { select: { slug: true, name: true } },
      coverAsset: true,
    },
    orderBy: { startsAt: "asc" },
  });
  if (membershipRide) {
    return {
      ride: toRideView(membershipRide),
      contextLabel: `From ${membershipRide.community.name}`,
      kind: "GUILD_UPCOMING",
    };
  }

  return null;
});

export const listMarketplaceCities = cache(async (): Promise<string[]> => {
  const locations = await db.communityLocation.findMany({
    where: {
      community: {
        status: "ACTIVE",
        visibility: { directoryVisibility: "LISTED" },
      },
    },
    distinct: ["city"],
    select: { city: true },
    orderBy: { city: "asc" },
  });

  return ["All cities", ...locations.map(({ city }) => city)];
});

export const resolveGuildTenant = cache(async (slug: string): Promise<ResolvedGuild | null> => {
  const guild = await db.community.findFirst({
    where: { slug, status: "ACTIVE" },
    include: guildInclude,
  });

  if (!guild) return null;

  return {
    tenant: { communityId: guild.id, slug: guild.slug },
    guild: toGuildView(guild),
  };
});

export const listPublishedRidesForTenant = cache(
  async (tenant: TenantContext): Promise<RideView[]> => {
    const rides = await db.ride.findMany({
      where: {
        communityId: tenant.communityId,
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
      include: rideInclude,
      orderBy: { startsAt: "asc" },
    });

    // This guards against accidentally reusing trusted context across tenants.
    if (rides.some((ride) => ride.community.slug !== tenant.slug)) {
      throw new Error("Tenant context mismatch while loading rides.");
    }

    return rides.map(toRideView);
  },
);

export type GuildRideHighlight = {
  slug: string;
  title: string;
  destination: string;
  startsAt: string;
  status: "UPCOMING" | "COMPLETED";
  imageUrls: string[];
};

export const listGuildRideHighlights = cache(async (tenant: TenantContext): Promise<{
  upcoming: GuildRideHighlight[];
  completed: GuildRideHighlight[];
}> => {
  const include = {
    coverAsset: true,
    mediaAssets: {
      where: { purpose: "RIDE_GALLERY" as const, access: "PUBLIC" as const },
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      take: 2,
    },
  } satisfies Prisma.RideInclude;
  const [upcoming, completed] = await Promise.all([
    db.ride.findMany({
      where: {
        communityId: tenant.communityId,
        status: { in: ["PUBLISHED", "CLOSED"] },
        visibility: "PUBLIC",
        startsAt: { gte: new Date() },
      },
      include,
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    db.ride.findMany({
      where: { communityId: tenant.communityId, status: "COMPLETED", visibility: "PUBLIC" },
      include,
      orderBy: { endsAt: "desc" },
      take: 3,
    }),
  ]);
  const mapRide = (ride: typeof upcoming[number], status: GuildRideHighlight["status"]): GuildRideHighlight => ({
    slug: ride.slug,
    title: ride.title,
    destination: ride.destination,
    startsAt: ride.startsAt.toISOString(),
    status,
    imageUrls: [
      ...(ride.coverAsset ? [cloudinaryImageUrl(ride.coverAsset)] : []),
      ...ride.mediaAssets.map((asset) => cloudinaryImageUrl(asset)),
    ].slice(0, 3),
  });

  return {
    upcoming: upcoming.map((ride) => mapRide(ride, "UPCOMING")),
    completed: completed.map((ride) => mapRide(ride, "COMPLETED")),
  };
});

export const findPublicRideBySlug = cache(async (slug: string): Promise<RideView | null> => {
  const ride = await db.ride.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      community: {
        status: "ACTIVE",
        visibility: { guildHallAccess: "PUBLIC" },
      },
    },
    include: rideInclude,
  });

  return ride ? toRideView(ride) : null;
});

export const findPublicRidePackageBySlug = cache(async (slug: string) => db.ride.findFirst({
  where: {
    slug, status: { in: ["PUBLISHED", "CLOSED", "POSTPONED", "CANCELLED", "COMPLETED"] }, visibility: "PUBLIC",
    community: { status: "ACTIVE", visibility: { guildHallAccess: "PUBLIC" } },
  },
  include: {
    community: { select: { slug: true, name: true, shortName: true, newcomerDisplayEnabled: true, paymentSettings: { select: { upiEnabled: true } } } },
    origins: { orderBy: { sortOrder: "asc" } }, itineraryDays: { orderBy: { sortOrder: "asc" } },
    accommodations: { orderBy: { checkInAt: "asc" }, include: { options: { where: { active: true }, orderBy: { sortOrder: "asc" } } } }, packageItems: { orderBy: [{ type: "asc" }, { sortOrder: "asc" }] },
    policies: { orderBy: [{ type: "asc" }, { version: "desc" }] },
    bookings: { where: { status: "WAITLISTED" }, select: { seatCount: true } },
    coverAsset: true, mediaAssets: { where: { purpose: "RIDE_GALLERY" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    staffAssignments: { include: { user: { select: { displayName: true } }, origin: { select: { city: true } } }, orderBy: { role: "asc" } },
  },
}));

export const listStaticGuildSlugs = cache(async (): Promise<string[]> => {
  const guilds = await db.community.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true },
  });
  return guilds.map(({ slug }) => slug);
});

export const listPublicRideSlugs = cache(async (): Promise<string[]> => {
  const rides = await db.ride.findMany({
    where: {
      status: { in: ["PUBLISHED", "CLOSED", "POSTPONED", "CANCELLED", "COMPLETED"] },
      visibility: "PUBLIC",
      community: {
        status: "ACTIVE",
        visibility: { guildHallAccess: "PUBLIC" },
      },
    },
    select: { slug: true },
  });
  return rides.map(({ slug }) => slug);
});
