import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { guilds, rides } from "../src/data/sample-data";
import { normalizePostgresUrl } from "../src/lib/postgres";
import { DEFAULT_GUILD_RIDE_POLICIES } from "../src/server/guild/default-ride-policies";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: normalizePostgresUrl(connectionString) }),
});

type SeedIdentity = {
  email: string;
  displayName: string;
};

async function upsertIdentity({ email, displayName }: SeedIdentity) {
  const contact = await prisma.userContact.findUnique({
    where: { type_normalizedValue: { type: "EMAIL", normalizedValue: email } },
    include: { user: true },
  });

  if (contact) {
    await prisma.user.update({
      where: { id: contact.userId },
      data: { displayName, status: "ACTIVE" },
    });
    await prisma.userContact.update({
      where: { id: contact.id },
      data: { displayValue: email, isPrimary: true, verifiedAt: new Date() },
    });
    return contact.user;
  }

  return prisma.user.create({
    data: {
      displayName,
      contacts: {
        create: {
          type: "EMAIL",
          normalizedValue: email,
          displayValue: email,
          isPrimary: true,
          verifiedAt: new Date(),
        },
      },
    },
  });
}

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

    const seededGuild = await prisma.community.upsert({
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
    for (const policy of DEFAULT_GUILD_RIDE_POLICIES) {
      await prisma.communityRidePolicyTemplate.upsert({
        where: { communityId_type: { communityId: seededGuild.id, type: policy.type } },
        create: { communityId: seededGuild.id, type: policy.type, title: policy.title, content: policy.content },
        update: {},
      });
    }
  }

  for (const ride of rides) {
    const seededRide = await prisma.ride.upsert({
      where: { slug: ride.slug },
      create: {
        slug: ride.slug,
        title: ride.title,
        summary: ride.summary,
        description: `${ride.summary} This demonstration package shows the structured itinerary, stay, meals, inclusions, exclusions, and organizer policies available in the AtRide Ride Studio.`,
        originCity: ride.city,
        destination: ride.destination,
        startsAt: new Date(ride.startDate),
        endsAt: new Date(ride.endDate),
        pricePaise: ride.price * 100,
        totalSlots: ride.totalSlots,
        bookedSlots: ride.bookedSlots,
        vehicleType: "BIKE",
        vehicleRequirements: "Road-legal motorcycle in safe touring condition; full-face helmet and appropriate riding gear are mandatory.",
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
        description: `${ride.summary} This demonstration package shows the structured itinerary, stay, meals, inclusions, exclusions, and organizer policies available in the AtRide Ride Studio.`,
        originCity: ride.city,
        destination: ride.destination,
        startsAt: new Date(ride.startDate),
        endsAt: new Date(ride.endDate),
        pricePaise: ride.price * 100,
        totalSlots: ride.totalSlots,
        bookedSlots: ride.bookedSlots,
        vehicleType: "BIKE",
        vehicleRequirements: "Road-legal motorcycle in safe touring condition; full-face helmet and appropriate riding gear are mandatory.",
        difficulty: ride.difficulty.toUpperCase() as "EASY" | "MODERATE" | "CHALLENGING",
        status: "PUBLISHED",
        visibility: "PUBLIC",
        featured: ride.featured,
        heroGradient: ride.gradient,
        distanceKm: ride.distanceKm,
        community: { connect: { slug: ride.guildSlug } },
      },
    });

    const [originCount, dayCount, stayCount, itemCount, policyCount] = await Promise.all([
      prisma.rideOrigin.count({ where: { rideId: seededRide.id } }),
      prisma.rideItineraryDay.count({ where: { rideId: seededRide.id } }),
      prisma.rideAccommodation.count({ where: { rideId: seededRide.id } }),
      prisma.ridePackageItem.count({ where: { rideId: seededRide.id } }),
      prisma.ridePolicy.count({ where: { rideId: seededRide.id } }),
    ]);
    const start = new Date(ride.startDate);
    if (!originCount) await prisma.rideOrigin.create({ data: { rideId: seededRide.id, city: ride.city, meetingPoint: `${ride.city} designated assembly point`, departureAt: start, capacity: ride.totalSlots, mergePoint: "Main highway regroup point", routeSummary: `${ride.city} to ${ride.destination} through organizer-approved regrouping stops.` } });
    if (!dayCount) {
      const days = Math.max(1, Math.ceil((new Date(ride.endDate).getTime() - start.getTime()) / 86400000));
      await prisma.rideItineraryDay.createMany({ data: Array.from({ length: days }, (_, index) => ({ rideId: seededRide.id, dayNumber: index + 1, date: new Date(start.getTime() + index * 86400000), title: index === 0 ? "Departure and arrival" : index === days - 1 ? "Breakfast and return" : "Explore the destination", summary: index === 0 ? "Rider briefing, planned regroup stops, arrival, check-in, and dinner." : index === days - 1 ? "Breakfast, checkout, and a coordinated return ride." : "Guided local sightseeing, free time, meals, and evening crew activities." })) });
    }
    if (!stayCount) await prisma.rideAccommodation.create({ data: { rideId: seededRide.id, propertyName: `${ride.destination} Trail Resort`, locality: ride.destination, checkInAt: new Date(start.getTime() + 12 * 3600000), checkOutAt: new Date(ride.endDate), roomSummary: "Shared rooms allocated by the organizer, with separate accommodation arrangements where required.", amenities: ["Secure parking", "Hot water", "Campfire area", "Dining hall"], participantNote: "Final allocation and exact location are shared with confirmed participants.", exactLocationRestricted: true } });
    if (!itemCount) await prisma.ridePackageItem.createMany({ data: [
      { rideId: seededRide.id, type: "INCLUSION", title: "Night accommodation", description: "Shared accommodation for the published ride dates.", sortOrder: 0 },
      { rideId: seededRide.id, type: "INCLUSION", title: "Included meals", description: "Breakfast and dinner as listed in the itinerary.", sortOrder: 1 },
      { rideId: seededRide.id, type: "EXCLUSION", title: "Fuel and personal expenses", description: "Participants manage fuel, tolls, and personal purchases.", sortOrder: 0 },
      { rideId: seededRide.id, type: "MEAL", dayNumber: 1, title: "Dinner", description: "Vegetarian and non-vegetarian buffet", sortOrder: 0 },
      { rideId: seededRide.id, type: "ACTIVITY", dayNumber: 1, title: "Crew briefing", description: "Safety briefing and next-day ride plan", sortOrder: 0 },
    ] });
    if (!policyCount) await prisma.ridePolicy.createMany({ data: [
      { rideId: seededRide.id, type: "SAFETY", title: "Safety and ride rules", content: "Full-face helmet and appropriate riding gear are mandatory. Follow the assigned road formation, traffic rules, hand signals, captains, and marshals. Racing, rash driving, illegal drugs, and drink-and-drive are prohibited.", version: 1 },
      { rideId: seededRide.id, type: "PAYMENT", title: "Payment rules", content: "A slot is confirmed only after the organizer verifies the required confirmation payment. Remaining balance must be paid by the published due date.", version: 1 },
      { rideId: seededRide.id, type: "CANCELLATION", title: "Cancellation and refund policy", content: "Confirmation payments and late cancellations may be non-refundable when property and activity commitments have already been paid by the organizer.", version: 1 },
    ] });
  }

  const [platformAdmin, ravanasAdmin, wildGearCaptain, rider] = await Promise.all([
    upsertIdentity({ email: "platform.admin@atride.test", displayName: "AtRide Platform Admin" }),
    upsertIdentity({ email: "ravanas.admin@atride.test", displayName: "Royal Ravanas Admin" }),
    upsertIdentity({ email: "wildgear.captain@atride.test", displayName: "Wild Gear Captain" }),
    upsertIdentity({ email: "rider@atride.test", displayName: "Demo Rider" }),
  ]);

  const seededProfiles = [
    { user: platformAdmin, homeCity: "Bengaluru", homeState: "Karnataka" },
    { user: ravanasAdmin, homeCity: "Chennai", homeState: "Tamil Nadu" },
    { user: wildGearCaptain, homeCity: "Bengaluru", homeState: "Karnataka" },
    { user: rider, homeCity: "Coimbatore", homeState: "Tamil Nadu" },
  ];
  const acceptedAt = new Date();
  await Promise.all(seededProfiles.map(({ user, homeCity, homeState }) =>
    prisma.participantProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        homeCity,
        homeState,
        termsAcceptedAt: acceptedAt,
        privacyAcceptedAt: acceptedAt,
        onboardingCompletedAt: acceptedAt,
      },
      update: {
        homeCity,
        homeState,
        termsAcceptedAt: acceptedAt,
        privacyAcceptedAt: acceptedAt,
        onboardingCompletedAt: acceptedAt,
      },
    }),
  ));

  const captainVehicle = await prisma.vehicle.findFirst({
    where: { userId: wildGearCaptain.id, nickname: "Trail Lead" },
  });
  if (!captainVehicle) {
    await prisma.vehicle.create({
      data: {
        userId: wildGearCaptain.id,
        type: "BIKE",
        nickname: "Trail Lead",
        manufacturer: "Adventure Moto",
        model: "Summit 450",
        manufactureYear: 2025,
        color: "Orange",
        registrationLast4: "450X",
        isPrimary: true,
      },
    });
  }

  await prisma.platformRoleAssignment.upsert({
    where: { userId_role: { userId: platformAdmin.id, role: "PLATFORM_ADMIN" } },
    create: { userId: platformAdmin.id, role: "PLATFORM_ADMIN" },
    update: {},
  });

  const [ravanas, wildGear, valparaiRide] = await Promise.all([
    prisma.community.findUniqueOrThrow({ where: { slug: "royal-ravanas" } }),
    prisma.community.findUniqueOrThrow({ where: { slug: "wild-gear" } }),
    prisma.ride.findUniqueOrThrow({ where: { slug: "valparai-rainforest-loop" } }),
  ]);

  const ravanasMembership = await prisma.communityMembership.upsert({
    where: { communityId_userId: { communityId: ravanas.id, userId: ravanasAdmin.id } },
    create: { communityId: ravanas.id, userId: ravanasAdmin.id, status: "ACTIVE", joinedAt: new Date() },
    update: { status: "ACTIVE", joinedAt: new Date() },
  });
  const captainMembership = await prisma.communityMembership.upsert({
    where: { communityId_userId: { communityId: wildGear.id, userId: wildGearCaptain.id } },
    create: { communityId: wildGear.id, userId: wildGearCaptain.id, status: "ACTIVE", joinedAt: new Date() },
    update: { status: "ACTIVE", joinedAt: new Date() },
  });
  await prisma.communityMembership.upsert({
    where: { communityId_userId: { communityId: ravanas.id, userId: rider.id } },
    create: { communityId: ravanas.id, userId: rider.id, status: "ACTIVE", joinedAt: new Date() },
    update: { status: "ACTIVE", joinedAt: new Date() },
  });

  await Promise.all([
    prisma.communityRoleAssignment.upsert({
      where: { membershipId_role: { membershipId: ravanasMembership.id, role: "OWNER" } },
      create: { membershipId: ravanasMembership.id, role: "OWNER" },
      update: {},
    }),
    prisma.communityRoleAssignment.upsert({
      where: { membershipId_role: { membershipId: ravanasMembership.id, role: "ADMIN" } },
      create: { membershipId: ravanasMembership.id, role: "ADMIN" },
      update: {},
    }),
    prisma.communityRoleAssignment.upsert({
      where: { membershipId_role: { membershipId: captainMembership.id, role: "RIDE_MANAGER" } },
      create: { membershipId: captainMembership.id, role: "RIDE_MANAGER" },
      update: {},
    }),
    prisma.rideStaffAssignment.upsert({
      where: {
        rideId_userId_role: {
          rideId: valparaiRide.id,
          userId: wildGearCaptain.id,
          role: "CAPTAIN",
        },
      },
      create: {
        communityId: wildGear.id,
        rideId: valparaiRide.id,
        userId: wildGearCaptain.id,
        role: "CAPTAIN",
      },
      update: {},
    }),
  ]);

  const [communityCount, rideCount, userCount, profileCount] = await Promise.all([
    prisma.community.count(),
    prisma.ride.count(),
    prisma.user.count(),
    prisma.participantProfile.count(),
  ]);

  console.log(`Seeded ${communityCount} communities, ${rideCount} rides, ${userCount} users, and ${profileCount} profiles.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
