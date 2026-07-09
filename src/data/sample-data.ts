export type GuildAccess = "PUBLIC" | "VERIFIED_USERS" | "GUILD_MEMBERS" | "INVITE_ONLY";

export type Guild = {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  foundedYear: number;
  homeCity: string;
  cities: string[];
  memberCount: number;
  completedRides: number;
  directoryVisibility: "LISTED" | "UNLISTED";
  access: GuildAccess;
  accent: string;
  gradient: string;
  specialties: string[];
};

export type Ride = {
  slug: string;
  guildSlug: string;
  title: string;
  summary: string;
  city: string;
  destination: string;
  startDate: string;
  endDate: string;
  price: number;
  totalSlots: number;
  bookedSlots: number;
  vehicleType: "BIKE" | "CAR_4X4";
  difficulty: "Easy" | "Moderate" | "Challenging";
  featured: boolean;
  gradient: string;
  distanceKm: number;
};

export const launchCities = ["All cities", "Bengaluru", "Chennai", "Coimbatore"] as const;

export const guilds: Guild[] = [
  {
    slug: "royal-ravanas",
    name: "Royal Ravanas",
    shortName: "RR",
    tagline: "Miles, mountains, and a brotherhood built on the road.",
    description:
      "A Bengaluru-led touring collective known for disciplined formations, scenic weekend escapes, and welcoming first-time tourers.",
    foundedYear: 2017,
    homeCity: "Bengaluru",
    cities: ["Bengaluru", "Chennai"],
    memberCount: 486,
    completedRides: 132,
    directoryVisibility: "LISTED",
    access: "PUBLIC",
    accent: "#ff5a18",
    gradient: "linear-gradient(135deg, #191d24 0%, #632411 58%, #ff5a18 100%)",
    specialties: ["Long-distance", "Hill rides", "Breakfast rides"],
  },
  {
    slug: "wild-gear",
    name: "Wild Gear Crew",
    shortName: "WG",
    tagline: "Go farther. Camp lighter. Return with better stories.",
    description:
      "An adventure-first community exploring forest roads, highland camps, and technical routes from Coimbatore and Bengaluru.",
    foundedYear: 2019,
    homeCity: "Coimbatore",
    cities: ["Coimbatore", "Bengaluru"],
    memberCount: 318,
    completedRides: 87,
    directoryVisibility: "LISTED",
    access: "PUBLIC",
    accent: "#df8f23",
    gradient: "linear-gradient(135deg, #101c1a 0%, #22564d 55%, #df8f23 100%)",
    specialties: ["Adventure touring", "Camping", "Trail support"],
  },
  {
    slug: "midnight-compass",
    name: "Midnight Compass",
    shortName: "MC",
    tagline: "A private circle for carefully planned endurance routes.",
    description: "An invite-only demonstration Guild used to validate unlisted and private access policies.",
    foundedYear: 2022,
    homeCity: "Chennai",
    cities: ["Chennai"],
    memberCount: 42,
    completedRides: 19,
    directoryVisibility: "UNLISTED",
    access: "INVITE_ONLY",
    accent: "#8b5cf6",
    gradient: "linear-gradient(135deg, #0d1020 0%, #31275c 58%, #8b5cf6 100%)",
    specialties: ["Night touring", "Endurance", "Invite-only"],
  },
];

export const rides: Ride[] = [
  {
    slug: "monsoon-kodaikanal",
    guildSlug: "royal-ravanas",
    title: "Monsoon Kodaikanal",
    summary: "Three days of misty bends, lakeside mornings, and a supported climb into the Palani hills.",
    city: "Bengaluru",
    destination: "Kodaikanal",
    startDate: "2026-08-14T05:00:00+05:30",
    endDate: "2026-08-16T21:00:00+05:30",
    price: 6499,
    totalSlots: 36,
    bookedSlots: 28,
    vehicleType: "BIKE",
    difficulty: "Moderate",
    featured: true,
    gradient: "linear-gradient(145deg, #101a21 0%, #315b64 45%, #d9772c 100%)",
    distanceKm: 940,
  },
  {
    slug: "sunrise-yelagiri",
    guildSlug: "royal-ravanas",
    title: "Sunrise at Yelagiri",
    summary: "A friendly breakfast ride with formation coaching for riders taking their first highway trip.",
    city: "Chennai",
    destination: "Yelagiri",
    startDate: "2026-07-26T04:30:00+05:30",
    endDate: "2026-07-26T18:00:00+05:30",
    price: 899,
    totalSlots: 24,
    bookedSlots: 13,
    vehicleType: "BIKE",
    difficulty: "Easy",
    featured: false,
    gradient: "linear-gradient(145deg, #2d1d18 0%, #a7431c 48%, #ffb038 100%)",
    distanceKm: 460,
  },
  {
    slug: "valparai-rainforest-loop",
    guildSlug: "wild-gear",
    title: "Valparai Rainforest Loop",
    summary: "Tea estates, elephant corridors, and a carefully timed descent through forty hairpin bends.",
    city: "Coimbatore",
    destination: "Valparai",
    startDate: "2026-08-01T05:15:00+05:30",
    endDate: "2026-08-02T19:30:00+05:30",
    price: 3299,
    totalSlots: 20,
    bookedSlots: 18,
    vehicleType: "BIKE",
    difficulty: "Challenging",
    featured: true,
    gradient: "linear-gradient(145deg, #0e201c 0%, #29634f 50%, #d5a53a 100%)",
    distanceKm: 510,
  },
  {
    slug: "coffee-country-camp",
    guildSlug: "wild-gear",
    title: "Coffee Country Camp",
    summary: "A relaxed overnight ride with tent camping, estate trails, and a campfire route briefing.",
    city: "Bengaluru",
    destination: "Chikkamagaluru",
    startDate: "2026-08-22T05:30:00+05:30",
    endDate: "2026-08-23T20:00:00+05:30",
    price: 3899,
    totalSlots: 28,
    bookedSlots: 9,
    vehicleType: "BIKE",
    difficulty: "Moderate",
    featured: false,
    gradient: "linear-gradient(145deg, #211a13 0%, #6f4c2f 48%, #c9a35a 100%)",
    distanceKm: 620,
  },
  {
    slug: "nilgiri-convergence",
    guildSlug: "royal-ravanas",
    title: "Nilgiri Convergence",
    summary: "Bengaluru, Chennai, and Coimbatore groups merge near the foothills before climbing together.",
    city: "Coimbatore",
    destination: "Ooty",
    startDate: "2026-09-04T05:00:00+05:30",
    endDate: "2026-09-06T20:30:00+05:30",
    price: 7299,
    totalSlots: 48,
    bookedSlots: 21,
    vehicleType: "BIKE",
    difficulty: "Moderate",
    featured: true,
    gradient: "linear-gradient(145deg, #15222c 0%, #31516d 50%, #d38b39 100%)",
    distanceKm: 780,
  },
];

export function getListedGuilds() {
  return guilds.filter((guild) => guild.directoryVisibility === "LISTED");
}

export function getGuildBySlug(slug: string) {
  return guilds.find((guild) => guild.slug === slug);
}

export function getRideBySlug(slug: string) {
  return rides.find((ride) => ride.slug === slug);
}

export function getGuildRides(guildSlug: string) {
  return rides.filter((ride) => ride.guildSlug === guildSlug);
}

export function getPublicRides() {
  const listedSlugs = new Set(getListedGuilds().map((guild) => guild.slug));
  return rides.filter((ride) => listedSlugs.has(ride.guildSlug));
}
