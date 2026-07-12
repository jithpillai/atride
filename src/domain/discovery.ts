export type GuildAccess = "PUBLIC" | "VERIFIED_USERS" | "GUILD_MEMBERS" | "INVITE_ONLY";

export type GuildView = {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  foundedYear: number | null;
  homeCity: string;
  cities: string[];
  memberCount: number;
  completedRides: number;
  directoryVisibility: "LISTED" | "UNLISTED";
  access: GuildAccess;
  accent: string;
  gradient: string;
  specialties: string[];
  logoUrl: string | null;
  coverUrl: string | null;
  galleryUrls: string[];
  websiteUrl: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
};

export type RideView = {
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
  vehicleType: "BIKE" | "CAR" | "SUV" | "JEEP" | "OTHER";
  difficulty: "Easy" | "Moderate" | "Challenging";
  featured: boolean;
  gradient: string;
  distanceKm: number;
};

export type TenantContext = Readonly<{
  communityId: string;
  slug: string;
}>;

export type ResolvedGuild = {
  tenant: TenantContext;
  guild: GuildView;
};
