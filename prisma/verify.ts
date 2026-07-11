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
  const [communityCount, rideCount, userCount, completedProfileCount, listedGuilds, privateGuild, platformAdmin, captain, postgis] = await Promise.all([
    prisma.community.count(),
    prisma.ride.count(),
    prisma.user.count(),
    prisma.participantProfile.count({ where: { onboardingCompletedAt: { not: null } } }),
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
    prisma.userContact.findUnique({
      where: { type_normalizedValue: { type: "EMAIL", normalizedValue: "platform.admin@atride.test" } },
      select: { user: { select: { platformRoles: { select: { role: true } } } } },
    }),
    prisma.userContact.findUnique({
      where: { type_normalizedValue: { type: "EMAIL", normalizedValue: "wildgear.captain@atride.test" } },
      select: {
        user: {
          select: {
            rideStaffAssignments: {
              where: { ride: { slug: "valparai-rainforest-loop" } },
              select: { role: true },
            },
          },
        },
      },
    }),
    prisma.$queryRaw<Array<{ version: string }>>`SELECT PostGIS_Version() AS version`,
  ]);

  if (communityCount !== 3 || rideCount !== 5) {
    throw new Error(`Unexpected seed counts: ${communityCount} Guilds and ${rideCount} rides.`);
  }

  if (userCount < 4) {
    throw new Error(`Expected at least 4 seeded identities, found ${userCount}.`);
  }

  if (completedProfileCount < 4) {
    throw new Error(`Expected at least 4 completed demonstration profiles, found ${completedProfileCount}.`);
  }

  if (!platformAdmin?.user.platformRoles.some(({ role }) => role === "PLATFORM_ADMIN")) {
    throw new Error("The seeded platform administrator role is missing.");
  }

  if (!captain?.user.rideStaffAssignments.some(({ role }) => role === "CAPTAIN")) {
    throw new Error("The seeded ride captain assignment is missing.");
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

  console.log("Database verified: PostGIS, discovery boundaries, identities, RBAC, and ride staff assignments are valid.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
