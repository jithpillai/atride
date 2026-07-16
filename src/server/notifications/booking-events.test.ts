import { describe, expect, it, vi } from "vitest";

import { queueParticipantBookingCreated } from "./booking-events";

describe("booking-created notifications", () => {
  it("queues one idempotent participant event with party and origin context", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      rideBooking: { findUnique: vi.fn().mockResolvedValue({
        id: "booking-1",
        communityId: "guild-1",
        userId: "rider-1",
        seatCount: 2,
        reservationExpiresAt: new Date("2026-08-01T10:00:00.000Z"),
        origin: { name: "Bengaluru convoy", city: "Bengaluru" },
        user: { displayName: "Demo Rider", contacts: [{ normalizedValue: "rider@example.com" }] },
        ride: { slug: "agumbe-trail", title: "Agumbe Trail" },
        community: { name: "Demo Guild" },
      }) },
      notificationOutboxEvent: { createMany },
    };

    const keys = await queueParticipantBookingCreated(tx as never, "booking-1", "BOOKING_RESERVED", "v1");

    expect(keys).toEqual(["booking_reserved:booking-1:v1"]);
    expect(createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        eventType: "BOOKING_RESERVED",
        recipientUserId: "rider-1",
        payload: expect.objectContaining({ partySize: 2, originName: "Bengaluru convoy" }),
      })],
      skipDuplicates: true,
    });
  });
});
