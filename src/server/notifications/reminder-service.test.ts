import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bookingFindMany: vi.fn(),
  paymentFindMany: vi.fn(),
  outboxFindMany: vi.fn(),
  outboxCreateMany: vi.fn(),
  outboxDeleteMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    rideBooking: { findMany: mocks.bookingFindMany },
    bookingPayment: { findMany: mocks.paymentFindMany },
    notificationOutboxEvent: {
      findMany: mocks.outboxFindMany,
      createMany: mocks.outboxCreateMany,
      deleteMany: mocks.outboxDeleteMany,
    },
  },
}));

import { invalidateObsoleteReminderEvents, processDueReminders } from "./reminder-service";

describe("scheduled reminder processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.outboxFindMany.mockResolvedValue([]);
    mocks.bookingFindMany.mockResolvedValue([]);
    mocks.paymentFindMany.mockResolvedValue([]);
    mocks.outboxCreateMany.mockResolvedValue({ count: 0 });
    mocks.outboxDeleteMany.mockResolvedValue({ count: 0 });
  });

  it("queues idempotent ride-start and payment reminders from canonical dates", async () => {
    mocks.bookingFindMany.mockResolvedValue([{
      id: "booking-1", communityId: "guild-1", userId: "rider-1",
      user: { displayName: "Demo Rider", contacts: [{ normalizedValue: "rider@example.com" }] },
      ride: { slug: "agumbe-trail", title: "Agumbe Trail", startsAt: new Date("2026-08-02T06:00:00.000Z"), community: { name: "Demo Guild" } },
    }]);
    mocks.paymentFindMany.mockResolvedValue([{
      id: "payment-1", bookingId: "booking-1", amountPaise: 250000, dueAt: new Date("2026-08-02T00:00:00.000Z"),
      booking: { communityId: "guild-1", userId: "rider-1", user: { displayName: "Demo Rider", contacts: [{ normalizedValue: "rider@example.com" }] }, ride: { slug: "agumbe-trail", title: "Agumbe Trail", community: { name: "Demo Guild" } } },
    }]);

    const result = await processDueReminders({ now: new Date("2026-08-01T07:00:00.000Z") });

    expect(result.rideReminders).toBe(1);
    expect(result.paymentReminders).toBe(1);
    expect(result.eventKeys).toEqual([
      "ride-start-24h:booking-1:1785650400000",
      "payment-due:payment-1:1785628800000",
    ]);
    expect(mocks.outboxCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ eventType: "RIDE_START_REMINDER", recipientUserId: "rider-1" }),
        expect.objectContaining({ eventType: "BOOKING_PAYMENT_REMINDER", bookingPaymentId: "payment-1" }),
      ]),
      skipDuplicates: true,
    });
  });

  it("invalidates a failed reminder when the canonical ride date changes", async () => {
    mocks.outboxFindMany.mockResolvedValue([{
      id: "event-1",
      eventType: "RIDE_START_REMINDER",
      payload: { scheduledFor: "2026-08-02T06:00:00.000Z" },
      booking: { status: "CONFIRMED", ride: { status: "PUBLISHED", startsAt: new Date("2026-08-03T06:00:00.000Z") } },
      bookingPayment: null,
    }]);

    const invalidated = await invalidateObsoleteReminderEvents();

    expect(invalidated).toBe(1);
    expect(mocks.outboxDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ["event-1"] } } });
  });
});
