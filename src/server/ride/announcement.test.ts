import { describe, expect, it } from "vitest";
import { generateAnnouncementText } from "./announcement";

describe("generateAnnouncementText", () => {
  it("uses canonical data while excluding private stay and contact details", () => {
    const content = generateAnnouncementText({
      title: "Agumbe Ride", summary: "A guided monsoon ride.", destination: "Agumbe", startsAt: new Date("2026-07-31T00:00:00Z"), endsAt: new Date("2026-08-02T12:00:00Z"),
      pricePaise: 389900, confirmationDepositPaise: 50000, totalSlots: 20, bufferSlots: 2, bookedSlots: 19, status: "PUBLISHED", slug: "agumbe-ride", vehicleType: "BIKE", distanceKm: 800, updatedAt: new Date(), community: { name: "Wild Gear Crew" },
      origins: [{ city: "Bengaluru", meetingPoint: "Hoskote", departureAt: new Date("2026-07-31T00:00:00Z"), mergePoint: null, routeSummary: "Bengaluru to Agumbe" }],
      itineraryDays: [{ dayNumber: 1, date: new Date("2026-07-31T00:00:00Z"), scheduledAt: new Date("2026-07-30T23:30:00Z"), title: "Ride out", summary: "Reach Agumbe" }],
      accommodations: [{ propertyName: "Private Resort", locality: "Secret Road", roomSummary: "Shared rooms", amenities: ["Parking"], exactLocationRestricted: true }],
      packageItems: [{ type: "INCLUSION", dayNumber: null, title: "Stay", description: "Two nights" }],
      policies: [{ type: "PAYMENT", title: "Payment rules", content: "Pay +91 9876543210. Non-refundable.", version: 1 }],
    }, "https://atride.in");
    expect(content).toContain("3 slots currently available");
    expect(content).toContain("exact property/location details");
    expect(content).not.toContain("Private Resort");
    expect(content).not.toContain("9876543210");
    expect(content).toContain("https://atride.in/rides/agumbe-ride");
  });
});
