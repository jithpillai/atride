import { describe, expect, it } from "vitest";

import { shouldSendNotificationEmail } from "./preference-policy";

const muted = { emailRideReminders: false, emailRoutineAnnouncements: false };

describe("notification email preferences", () => {
  it("allows riders to mute optional reminders and routine announcements", () => {
    expect(shouldSendNotificationEmail("RIDE_START_REMINDER", {}, muted)).toBe(false);
    expect(shouldSendNotificationEmail("RIDE_ANNOUNCEMENT", { urgency: "NORMAL" }, muted)).toBe(false);
  });

  it("never mutes important, critical, booking, payment, or disruption email", () => {
    expect(shouldSendNotificationEmail("RIDE_ANNOUNCEMENT", { urgency: "IMPORTANT" }, muted)).toBe(true);
    expect(shouldSendNotificationEmail("RIDE_ANNOUNCEMENT", { urgency: "CRITICAL" }, muted)).toBe(true);
    expect(shouldSendNotificationEmail("BOOKING_PAYMENT_REMINDER", {}, muted)).toBe(true);
    expect(shouldSendNotificationEmail("RIDE_CANCELLED", {}, muted)).toBe(true);
  });

  it("defaults to email enabled before a preference row exists", () => {
    expect(shouldSendNotificationEmail("RIDE_START_REMINDER", {}, null)).toBe(true);
  });
});
