import { describe, expect, it } from "vitest";

import { renderReminderEmail } from "./reminder-template";

describe("scheduled reminder email template", () => {
  it("renders a ride-start reminder with the current start time", () => {
    const email = renderReminderEmail("RIDE_START_REMINDER", "Demo Rider", {
      guildName: "Demo Guild",
      rideTitle: "Agumbe Trail",
      reminderKind: "UPCOMING_RIDE",
      startsAt: "2026-08-01T00:00:00.000Z",
      bookingUrl: "https://atride.in/rides/agumbe-trail#ride-updates",
    });
    expect(email.subject).toContain("upcoming ride reminder");
    expect(email.text).toContain("Agumbe Trail starts at");
    expect(email.html).toContain("#ride-updates");
  });

  it("distinguishes an overdue payment", () => {
    const email = renderReminderEmail("BOOKING_PAYMENT_REMINDER", "Demo Rider", {
      guildName: "Demo Guild",
      rideTitle: "Agumbe Trail",
      reminderKind: "PAYMENT_OVERDUE",
      dueAt: "2026-07-30T12:00:00.000Z",
      amountPaise: 250000,
      bookingUrl: "https://atride.in/account/bookings",
    });
    expect(email.subject).toContain("payment overdue");
    expect(email.text).toContain("₹2,500.00");
  });
});
