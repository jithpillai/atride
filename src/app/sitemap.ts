import type { MetadataRoute } from "next";

import { getListedGuilds, getPublicRides } from "@/data/sample-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://atride.in";
  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    ...getListedGuilds().map((guild) => ({ url: `${baseUrl}/guilds/${guild.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...getPublicRides().map((ride) => ({ url: `${baseUrl}/rides/${ride.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
