import { describe, expect, it } from "vitest";

import { moneyToPaise, parseDayItems, parseItinerary, parseOrigins, validRideSlug } from "./validation";

describe("ride package validation", () => {
  it("validates canonical slugs and exact money", () => {
    expect(validRideSlug("agumbe-rain-trail")).toBe(true);
    expect(validRideSlug("agumbe2026")).toBe(true);
    expect(validRideSlug("Agumbe Ride")).toBe(false);
    expect(moneyToPaise("3899")).toBe(389900);
  });

  it("parses multiple origins with capacity and merge details", () => {
    const origins = parseOrigins("Bengaluru | Hoskote Toll | 2026-07-31T05:00 | 15 | 2 | Salem | NH 48 to Salem\nChennai | Poonamallee | 2026-07-30T22:00 | 10 | 1 | Salem | Chennai to Salem via Ulundurpet");
    expect(origins).toHaveLength(2);
    expect(origins[1]).toMatchObject({ city: "Chennai", capacity: 10, bufferCapacity: 1, mergePoint: "Salem", routeSummary: "Chennai to Salem via Ulundurpet" });
    expect(parseOrigins("Coimbatore | Avinashi Road | 2026-07-31T05:00")[0].capacity).toBeNull();
  });

  it("preserves ordered itinerary days and day-specific meals", () => {
    expect(parseItinerary("2026-07-31 | Arrival | Check in and briefing\n2026-08-01 | Explore | Agumbe trail")[1].dayNumber).toBe(2);
    expect(parseDayItems("1 | Dinner | Veg and non-veg buffet")[0]).toMatchObject({ dayNumber: 1, title: "Dinner" });
  });
});
