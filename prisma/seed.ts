import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { guilds, rides } from "../src/data/sample-data";
import { normalizePostgresUrl } from "../src/lib/postgres";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: normalizePostgresUrl(connectionString) }),
});

async function main() {
  for (const guild of guilds) {
    const visibility = {
      directoryVisibility: guild.directoryVisibility,
      guildHallAccess: guild.access,
      searchIndexing: guild.directoryVisibility === "LISTED" ? ("INDEXABLE" as const) : ("NOINDEX" as const),
      defaultRideVisibility: guild.access === "PUBLIC" ? ("PUBLIC" as const) : ("INVITE_ONLY" as const),
    };

    const locations = guild.cities.map((city) => ({
      city,
      state: city === "Bengaluru" ? "Karnataka" : "Tamil Nadu",
      countryCode: "IN",
      isHome: city === guild.homeCity,
    }));

    await prisma.community.upsert({
      where: { slug: guild.slug },
      create: {
        slug: guild.slug,
        name: guild.name,
        shortName: guild.shortName,
        tagline: guild.tagline,
        description: guild.description,
        foundedYear: guild.foundedYear,
        memberCount: guild.memberCount,
        completedRides: guild.completedRides,
        status: "ACTIVE",
        accentColor: guild.accent,
        heroGradient: guild.gradient,
        specialties: guild.specialties,
        locations: { create: locations },
        visibility: { create: visibility },
      },
      update: {
        name: guild.name,
        shortName: guild.shortName,
        tagline: guild.tagline,
        description: guild.description,
        foundedYear: guild.foundedYear,
        memberCount: guild.memberCount,
        completedRides: guild.completedRides,
        status: "ACTIVE",
        accentColor: guild.accent,
        heroGradient: guild.gradient,
        specialties: guild.specialties,
        locations: {
          deleteMany: {},
          create: locations,
        },
        visibility: {
          upsert: {
            create: visibility,
            update: visibility,
          },
        },
      },
    });
  }

  for (const ride of rides) {
    await prisma.ride.upsert({
      where: { slug: ride.slug },
      create: {
        slug: ride.slug,
        title: ride.title,
        summary: ride.summary,
        originCity: ride.city,
        destination: ride.destination,
        startsAt: new Date(ride.startDate),
        endsAt: new Date(ride.endDate),
        pricePaise: ride.price * 100,
        totalSlots: ride.totalSlots,
        bookedSlots: ride.bookedSlots,
        vehicleType: "BIKE",
        difficulty: ride.difficulty.toUpperCase() as "EASY" | "MODERATE" | "CHALLENGING",
        status: "PUBLISHED",
        visibility: "PUBLIC",
        featured: ride.featured,
        heroGradient: ride.gradient,
        distanceKm: ride.distanceKm,
        community: { connect: { slug: ride.guildSlug } },
      },
      update: {
        title: ride.title,
        summary: ride.summary,
        originCity: ride.city,
        destination: ride.destination,
        startsAt: new Date(ride.startDate),
        endsAt: new Date(ride.endDate),
        pricePaise: ride.price * 100,
        totalSlots: ride.totalSlots,
        bookedSlots: ride.bookedSlots,
        vehicleType: "BIKE",
        difficulty: ride.difficulty.toUpperCase() as "EASY" | "MODERATE" | "CHALLENGING",
        status: "PUBLISHED",
        visibility: "PUBLIC",
        featured: ride.featured,
        heroGradient: ride.gradient,
        distanceKm: ride.distanceKm,
        community: { connect: { slug: ride.guildSlug } },
      },
    });
  }

  const [communityCount, rideCount] = await Promise.all([
    prisma.community.count(),
    prisma.ride.count(),
  ]);

  console.log(`Seeded ${communityCount} communities and ${rideCount} rides.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
