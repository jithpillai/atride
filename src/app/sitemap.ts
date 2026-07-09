import type { MetadataRoute } from "next";

import {
  listMarketplaceGuilds,
  listMarketplaceRides,
} from "@/server/repositories/discovery-repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://atride.in";
  const [guilds, rides] = await Promise.all([listMarketplaceGuilds(), listMarketplaceRides()]);
  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    ...guilds.map((guild) => ({ url: `${baseUrl}/guilds/${guild.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...rides.map((ride) => ({ url: `${baseUrl}/rides/${ride.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
