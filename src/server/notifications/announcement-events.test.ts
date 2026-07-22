import { describe, expect, it, vi } from "vitest";

import { queueRideAnnouncementEvents } from "./announcement-events";

describe("ride announcement notifications", () => {
  it("fans out one idempotent event per active participant booking", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    const tx = {
      rideAnnouncement: { findUnique: vi.fn().mockResolvedValue({
        id: "announcement-1",
        title: "Departure update",
        content: "Report by 05:15.",
        urgency: "CRITICAL",
        requiresAcknowledgement: true,
        publishedAt: new Date("2026-08-01T05:00:00.000Z"),
        ride: {
          id: "ride-1",
          slug: "agumbe-trail",
          title: "Agumbe Trail",
          community: { id: "guild-1", name: "Demo Guild" },
          bookings: [
            { id: "booking-1", userId: "rider-1", user: { displayName: "Rider One", contacts: [{ normalizedValue: "one@example.com" }] } },
            { id: "booking-2", userId: "rider-2", user: { displayName: "Rider Two", contacts: [{ normalizedValue: "two@example.com" }] } },
          ],
        },
      }) },
      notificationOutboxEvent: { createMany },
    };

    const keys = await queueRideAnnouncementEvents(tx as never, "announcement-1");

    expect(keys).toEqual([
      "ride-announcement:announcement-1:rider-1",
      "ride-announcement:announcement-1:rider-2",
    ]);
    expect(createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          eventType: "RIDE_ANNOUNCEMENT",
          recipientUserId: "rider-1",
          payload: expect.objectContaining({ urgency: "CRITICAL", requiresAcknowledgement: true }),
        }),
      ]),
      skipDuplicates: true,
    });
  });
});
