import { describe, expect, it } from "vitest";

import { renderRideDisruptionEmail } from "./ride-disruption-template";

const payload = {
  guildName: "Example Guild",
  rideTitle: "Monsoon Trail",
  reason: "The destination road is closed following severe weather.",
  startsAt: "2026-08-10T00:00:00.000Z",
  endsAt: "2026-08-12T12:00:00.000Z",
  proposedResumeAt: "2026-08-20T00:00:00.000Z",
  bookingUrl: "https://atride.in/account/bookings",
};

describe("ride disruption email", () => {
  it("renders postponement details and a participant booking link", () => {
    const message = renderRideDisruptionEmail("RIDE_POSTPONED", "Rider", payload);
    expect(message.subject).toContain("Postponed");
    expect(message.text).toContain(payload.reason);
    expect(message.html).toContain(payload.bookingUrl);
    expect(message.html).toContain("Proposed update");
  });

  it("renders cancellation without promising that AtRide performs the refund", () => {
    const message = renderRideDisruptionEmail("RIDE_CANCELLED", "Rider", { ...payload, proposedResumeAt: "" });
    expect(message.subject).toContain("Cancelled");
    expect(message.text).toContain("must be completed by the Guild");
    expect(message.html).not.toContain("Proposed update");
  });
});
