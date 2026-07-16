import { describe, expect, it } from "vitest";
import { normalizeStructuredDraft, requiredItineraryDates, sanitizeAiSource, type RideAssistantFormInput } from "./ride-assistant";

const input = {
  title: "Yercaud Ride", summary: "Three-day ride", description: "", destination: "Yercaud", startsAt: "2026-08-12T05:00", endsAt: "2026-08-14T20:00",
  price: "2900", confirmationDeposit: "1000", totalSlots: "30", waitlistCapacity: "5", distanceKm: "230", vehicleType: "BIKE", vehicleRequirements: "Touring-ready bike", difficulty: "MODERATE",
  origins: "Bengaluru | Hoskote | 2026-08-12T05:00 |  | Salem | Bengaluru to Yercaud", itinerary: "", propertyName: "", propertyLocality: "", checkInAt: "", checkOutAt: "", roomSummary: "", amenities: "", participantNote: "", inclusions: "", exclusions: "", addOns: "", meals: "", activities: "",
} satisfies RideAssistantFormInput;

describe("sanitizeAiSource", () => {
  it("removes operational identifiers and participant manifest rows", () => {
    const result = sanitizeAiSource("GPay +91 98765 43210\n1. Rider One - Bengaluru - Rider - Non veg\nJoin https://chat.whatsapp.com/private\nMail admin@example.com");
    expect(result).not.toContain("98765");
    expect(result).not.toContain("Rider One");
    expect(result).not.toContain("chat.whatsapp.com/private");
    expect(result).not.toContain("admin@example.com");
  });
});

describe("normalizeStructuredDraft", () => {
  it("converts typed Gemini JSON into existing Ride Studio row formats", () => {
    const result = normalizeStructuredDraft({
      description: "A factual ride.",
      origins: [{ city: "Bengaluru", meetingPoint: "Hoskote", departureAt: "2026-07-31T05:00", capacity: "", mergePoint: "Agumbe", routeSummary: "Bengaluru to Agumbe" }],
      itinerary: [{ date: "2026-07-31", title: "Ride out", plan: "Reach the stay" }],
      accommodation: { roomSummary: "Shared stay", amenities: ["Parking", "Hot water"], participantNote: "Carry ID" },
      inclusions: [{ title: "Stay", detail: "Two nights" }], exclusions: [], addOns: [],
      meals: [{ dayNumber: 1, title: "Dinner", detail: "Buffet" }], activities: [], missingFacts: ["Meeting point timing"],
    });
    expect(result.origins).toContain("Bengaluru | Hoskote | 2026-07-31T05:00");
    expect(result.origins).toContain("Bengaluru to Agumbe");
    expect(result.itinerary).toBe("2026-07-31 | Ride out | Reach the stay");
    expect(result.amenities).toBe("Parking, Hot water");
    expect(result.meals).toBe("1 | Dinner | Buffet");
  });

  it("deterministically fills every inclusive ride date when the model omits a day", () => {
    const result = normalizeStructuredDraft({
      itinerary: [
        { date: "2026-08-12", title: "Arrival", plan: "Ride to Yercaud" },
        { date: "2026-08-14", title: "Return", plan: "Return to Bengaluru" },
      ],
      missingFacts: [],
    }, input);
    expect(requiredItineraryDates(input)).toEqual(["2026-08-12", "2026-08-13", "2026-08-14"]);
    expect(result.itinerary.split("\n")).toHaveLength(3);
    expect(result.itinerary).toContain("2026-08-13 | Yercaud ride plan");
    expect(result.missingFacts).toContain("Confirm the detailed itinerary, stops, meals, activities, and timing for 2026-08-13.");
  });

  it("retains multiple timed itinerary events on the same date", () => {
    const result = normalizeStructuredDraft({
      itinerary: [
        { date: "2026-08-12T05:00", title: "Departure", plan: "Leave Bengaluru" },
        { date: "2026-08-12T09:00", title: "Breakfast", plan: "Group breakfast" },
        { date: "2026-08-13", title: "Explore", plan: "Destination ride" },
        { date: "2026-08-14T16:00", title: "Return", plan: "Return to Bengaluru" },
      ],
      missingFacts: [],
    }, input);
    expect(result.itinerary.split("\n")).toHaveLength(4);
    expect(result.itinerary).toContain("2026-08-12T05:00 | Departure");
    expect(result.itinerary).toContain("2026-08-12T09:00 | Breakfast");
  });
});
