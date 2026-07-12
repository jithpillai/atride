import { describe, expect, it } from "vitest";

import { isStaffRole, normalizeOptionalHttpsUrl, parseOperatingCities } from "./validation";

describe("Guild administration validation", () => {
  it("allows delegated staff roles but not ownership", () => {
    expect(isStaffRole("RIDE_MANAGER")).toBe(true);
    expect(isStaffRole("FINANCE")).toBe(true);
    expect(isStaffRole("OWNER")).toBe(false);
  });

  it("deduplicates operating cities and excludes the home city", () => {
    expect(parseOperatingCities("Bengaluru, Chennai, chennai, Coimbatore", "Bengaluru"))
      .toEqual(["Chennai", "Coimbatore"]);
  });

  it("accepts only optional HTTPS links", () => {
    expect(normalizeOptionalHttpsUrl("")).toBeNull();
    expect(normalizeOptionalHttpsUrl("https://atride.in/guilds/test")).toBe("https://atride.in/guilds/test");
    expect(() => normalizeOptionalHttpsUrl("http://example.com")).toThrow("HTTPS");
  });
});
