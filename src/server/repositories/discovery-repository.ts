import "server-only";

import { cache } from "react";

import type { GuildView, ResolvedGuild, RideView, TenantContext } from "@/domain/discovery";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

const guildInclude = {
  locations: {
    orderBy: [{ isHome: "desc" }, { city: "asc" }],
  },
  visibility: true,
} satisfies Prisma.CommunityInclude;

const rideInclude = {
  community: {
    select: { slug: true },
  },
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
    memberCount: guild.memberCount,
    completedRides: guild.completedRides,
    directoryVisibility: guild.visibility.directoryVisibility,
    access: guild.visibility.guildHallAccess,
    accent: guild.accentColor,
    gradient: guild.heroGradient,
    specialties: guild.specialties,
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
      status: "PUBLISHED",
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
