import { describe, expect, it } from "vitest";

import { buildPaymentObligations } from "./payment-obligations";

describe("buildPaymentObligations", () => {
  it("creates a confirmation deposit and separately tracked balance", () => {
    const obligations = buildPaymentObligations({
      bookingId: "booking-1",
      method: "UPI",
      totalPricePaise: 389900,
      confirmationDepositPaise: 50000,
      balanceDuePaise: 339900,
      reservationExpiresAt: new Date("2026-07-15T00:00:00Z"),
      balanceDueAt: new Date("2026-07-25T00:00:00Z"),
      upiRecipient: { payeeVpaSnapshot: "demo@upi", payeeNameSnapshot: "Demo Guild", payeeInstructionsSnapshot: null },
    });
    expect(obligations.map(({ purpose }) => purpose)).toEqual(["CONFIRMATION_DEPOSIT", "BALANCE"]);
    expect(obligations[0].payeeVpaSnapshot).toBe("demo@upi");
  });

  it("creates one full-payment obligation when no deposit is required", () => {
    const obligations = buildPaymentObligations({
      bookingId: "booking-2",
      method: "CASH",
      totalPricePaise: 10000,
      confirmationDepositPaise: 0,
      balanceDuePaise: 10000,
      reservationExpiresAt: new Date("2026-07-15T00:00:00Z"),
      balanceDueAt: new Date("2026-07-15T00:00:00Z"),
      upiRecipient: null,
    });
    expect(obligations).toHaveLength(1);
    expect(obligations[0]).toMatchObject({ purpose: "FULL_PAYMENT", amountPaise: 10000, method: "CASH" });
  });
});
