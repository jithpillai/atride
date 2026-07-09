import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizePostgresUrl } from "../src/lib/postgres";

try {
  loadEnvFile(".env.local");
} catch {
  // Hosted environments provide variables directly.
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to verify persistence.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: normalizePostgresUrl(connectionString) }),
});

async function main() {
  const [communityCount, rideCount, listedGuilds, privateGuild, postgis] = await Promise.all([
    prisma.community.count(),
    prisma.ride.count(),
    prisma.community.findMany({
      where: {
        status: "ACTIVE",
        visibility: { directoryVisibility: "LISTED" },
      },
      select: { slug: true },
    }),
    prisma.community.findUnique({
      where: { slug: "midnight-compass" },
      select: {
        visibility: {
          select: { directoryVisibility: true, guildHallAccess: true },
        },
      },
    }),
    prisma.$queryRaw<Array<{ version: string }>>`SELECT PostGIS_Version() AS version`,
  ]);

  if (communityCount !== 3 || rideCount !== 5) {
    throw new Error(`Unexpected seed counts: ${communityCount} Guilds and ${rideCount} rides.`);
  }

  if (listedGuilds.length !== 2 || listedGuilds.some(({ slug }) => slug === "midnight-compass")) {
    throw new Error("The marketplace visibility boundary is not working.");
  }

  if (
    privateGuild?.visibility?.directoryVisibility !== "UNLISTED" ||
    privateGuild.visibility.guildHallAccess !== "INVITE_ONLY"
  ) {
    throw new Error("The private demonstration Guild policy is incorrect.");
  }

  if (!postgis[0]?.version) {
    throw new Error("PostGIS is not enabled.");
  }

  console.log("Database verified: PostGIS enabled, 3 Guilds, 5 rides, 2 marketplace Guilds.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
