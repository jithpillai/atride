import { describe, expect, it, vi } from "vitest";

import { queueFinancePaymentSubmitted } from "./payment-events";

describe("finance payment submission notifications", () => {
  it("queues finance review events for a submitted balance obligation", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      bookingPayment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "balance-payment",
          bookingId: "booking-1",
          amountPaise: 250_000,
          purpose: "BALANCE",
          method: "UPI",
          payerReference: "624518739201",
          payeeVpaSnapshot: "guild@example",
          payeeNameSnapshot: "Example Guild",
          submittedAt: new Date("2026-07-16T08:22:54.765Z"),
          booking: {
            communityId: "guild-1",
            user: { displayName: "Example Rider" },
            ride: { title: "Monsoon Ride" },
            community: { name: "Example Guild", slug: "example-guild" },
          },
        }),
      },
      communityMembership: {
        findMany: vi.fn().mockResolvedValue([{
          user: {
            id: "finance-user",
            displayName: "Finance Admin",
            contacts: [{ normalizedValue: "finance@example.com" }],
          },
        }]),
      },
      notificationOutboxEvent: { createMany },
    };

    const keys = await queueFinancePaymentSubmitted(
      tx as never,
      "balance-payment",
      "proof-asset",
    );

    expect(keys).toEqual(["payment-submitted:balance-payment:proof-asset:finance-user"]);
    expect(createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        eventType: "BOOKING_PAYMENT_SUBMITTED",
        bookingPaymentId: "balance-payment",
        recipientEmail: "finance@example.com",
        payload: expect.objectContaining({
          paymentPurpose: "BALANCE",
          amountPaise: 250_000,
          reviewUrl: "https://atride.in/guilds/example-guild/manage?section=finance&payment=balance-payment",
        }),
      })],
      skipDuplicates: true,
    });
  });
});
