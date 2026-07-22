import { describe, expect, it } from "vitest";

import { renderRideAnnouncementEmail } from "./announcement-template";

const payload = {
  guildName: "Demo Guild",
  rideTitle: "Agumbe Trail",
  announcementTitle: "Meeting point changed",
  announcementBody: "Report at the east gate by 05:15.",
  urgency: "IMPORTANT",
  requiresAcknowledgement: false,
  rideUrl: "https://atride.in/rides/agumbe-trail#ride-updates",
};

describe("ride announcement email template", () => {
  it("renders an official ride update with its canonical participant link", () => {
    const email = renderRideAnnouncementEmail("RIDE_ANNOUNCEMENT", "Demo Rider", payload);
    expect(email.subject).toContain(payload.announcementTitle);
    expect(email.text).toContain(payload.announcementBody);
    expect(email.html).toContain(payload.rideUrl);
  });

  it("makes critical acknowledgement messages explicit", () => {
    const email = renderRideAnnouncementEmail("RIDE_ANNOUNCEMENT", "Demo Rider", {
      ...payload,
      urgency: "CRITICAL",
      requiresAcknowledgement: true,
    });
    expect(email.subject).toContain("Action required");
    expect(email.text).toContain("Read and acknowledge");
  });
});
