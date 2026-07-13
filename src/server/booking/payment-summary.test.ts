import { describe, expect, it } from "vitest";

import { summarizeBookingPayments } from "./payment-summary";

describe("booking payment summary", () => {
  const deposit = { id: "deposit", purpose: "CONFIRMATION_DEPOSIT" as const, amountPaise: 100_000, dueAt: new Date("2026-08-01T00:00:00Z") };
  const balance = { id: "balance", purpose: "BALANCE" as const, amountPaise: 289_900, dueAt: new Date("2026-08-20T00:00:00Z") };

  it("keeps balance locked behind an unconfirmed deposit", () => {
    const result = summarizeBookingPayments({ status: "RESERVED", totalPricePaise: 389_900, payments: [{ ...deposit, status: "PENDING" }, { ...balance, status: "PENDING" }] }, new Date("2026-07-01T00:00:00Z"));
    expect(result.activePayment?.id).toBe("deposit");
    expect(result.outstandingPaise).toBe(389_900);
  });

  it("opens the balance after the deposit confirms", () => {
    const result = summarizeBookingPayments({ status: "CONFIRMED", totalPricePaise: 389_900, payments: [{ ...deposit, status: "CONFIRMED" }, { ...balance, status: "PENDING" }] }, new Date("2026-08-21T00:00:00Z"));
    expect(result.activePayment?.id).toBe("balance");
    expect(result.paidPaise).toBe(100_000);
    expect(result.outstandingPaise).toBe(289_900);
    expect(result.overdue).toBe(true);
  });

  it("marks the booking fully paid only when every obligation is confirmed", () => {
    const result = summarizeBookingPayments({ status: "CONFIRMED", totalPricePaise: 389_900, payments: [{ ...deposit, status: "CONFIRMED" }, { ...balance, status: "CONFIRMED" }] });
    expect(result.fullyPaid).toBe(true);
    expect(result.outstandingPaise).toBe(0);
    expect(result.activePayment).toBeNull();
  });
});
