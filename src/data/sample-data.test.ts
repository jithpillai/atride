import { describe, expect, it } from "vitest";

import { getGuildBySlug, getGuildRides, getListedGuilds, getPublicRides } from "./sample-data";

describe("sample marketplace data", () => {
  it("keeps the private Guild out of discovery", () => {
    expect(getListedGuilds().map((guild) => guild.slug)).not.toContain("midnight-compass");
  });

  it("never exposes private Guild rides in the public feed", () => {
    expect(getPublicRides().every((ride) => ride.guildSlug !== "midnight-compass")).toBe(true);
  });

  it("scopes a Guild ride query to that Guild", () => {
    expect(getGuildRides("wild-gear").every((ride) => ride.guildSlug === "wild-gear")).toBe(true);
  });

  it("resolves an unlisted Guild only by its direct slug", () => {
    expect(getGuildBySlug("midnight-compass")?.directoryVisibility).toBe("UNLISTED");
  });
});
