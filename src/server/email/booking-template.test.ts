import { describe, expect, it } from "vitest";

import { renderBookingEventEmail } from "./booking-template";

const payload = {
  guildName: "Demo Guild",
  rideTitle: "Monsoon Trail",
  bookingUrl: "https://atride.in/rides/monsoon-trail#booking",
  reservationExpiresAt: "2026-07-15T05:30:00.000Z",
};

describe("booking reservation email template", () => {
  it("explains a time-limited waitlist promotion", () => {
    const email = renderBookingEventEmail("BOOKING_WAITLIST_PROMOTED", "Demo Rider", payload);
    expect(email.subject).toContain("waitlist slot");
    expect(email.text).toContain("Complete reservation");
    expect(email.html).toContain(payload.bookingUrl);
  });

  it("explains that an expired hold released the seat", () => {
    const email = renderBookingEventEmail("BOOKING_RESERVATION_EXPIRED", "Demo Rider", payload);
    expect(email.subject).toContain("expired");
    expect(email.text).toContain("seat has been released");
  });
});
