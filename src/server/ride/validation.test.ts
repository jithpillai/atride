import { describe, expect, it } from "vitest";

import { moneyToPaise, parseDayItems, parseItinerary, parseOrigins, requiredCalendarDate, validRideSlug } from "./validation";

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
    const itinerary = parseItinerary("2026-07-31T05:30 | Arrival | Check in and briefing\n2026-08-01 | Explore | Agumbe trail");
    expect(itinerary[1].dayNumber).toBe(2);
    expect(itinerary[0].date.toISOString()).toBe("2026-07-31T00:00:00.000Z");
    expect(itinerary[0].scheduledAt?.toISOString()).toBe("2026-07-31T00:00:00.000Z");
    expect(itinerary[1].scheduledAt).toBeNull();
    expect(itinerary.map(({ dayNumber, sortOrder }) => ({ dayNumber, sortOrder }))).toEqual([{ dayNumber: 1, sortOrder: 0 }, { dayNumber: 2, sortOrder: 1 }]);
    expect(parseDayItems("1 | Dinner | Veg and non-veg buffet")[0]).toMatchObject({ dayNumber: 1, title: "Dinner" });
  });

  it("keeps date-only itinerary values on the entered calendar date", () => {
    expect(requiredCalendarDate("2026-07-20").toISOString()).toBe("2026-07-20T00:00:00.000Z");
    expect(parseItinerary("2026-07-20 | Breakfast | Group breakfast")[0].date.toISOString()).toBe("2026-07-20T00:00:00.000Z");
  });

  it("assigns multiple same-date events to one ride day with independent ordering", () => {
    const events = parseItinerary("2026-07-20T05:00 | Departure | Leave Bengaluru\n2026-07-20T08:30 | Breakfast | Group breakfast\n2026-07-21 | Return | Ride home");
    expect(events.map(({ dayNumber, sortOrder }) => ({ dayNumber, sortOrder }))).toEqual([
      { dayNumber: 1, sortOrder: 0 },
      { dayNumber: 1, sortOrder: 1 },
      { dayNumber: 2, sortOrder: 2 },
    ]);
  });
});
