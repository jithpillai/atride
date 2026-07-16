import { describe, expect, it } from "vitest";

import { notificationPresentation } from "./presentation";

describe("in-app notification presentation", () => {
  it("links booking events to the canonical booking history", () => {
    const item = notificationPresentation("BOOKING_RESERVED", {
      rideTitle: "Agumbe Trail",
      guildName: "Demo Guild",
      bookingUrl: "https://atride.in/account/bookings",
    });
    expect(item.title).toContain("Agumbe Trail");
    expect(item.actionUrl).toBe("https://atride.in/account/bookings");
  });

  it("uses the participant-facing disruption reason", () => {
    const item = notificationPresentation("RIDE_CANCELLED", {
      rideTitle: "Hill Ride",
      reason: "Unsafe weather conditions",
      bookingUrl: "/account/bookings",
    });
    expect(item.body).toBe("Unsafe weather conditions");
  });
});
