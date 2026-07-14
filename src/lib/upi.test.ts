import { describe, expect, it } from "vitest";

import { buildUpiPaymentUri, isValidUpiVpa, normalizeUpiVpa, upiPaymentNote, upiTransactionReference } from "./upi";

describe("UPI payment utilities", () => {
  it("normalizes and validates common Indian UPI IDs", () => {
    expect(normalizeUpiVpa("  Captain.Name@OKHDFCBANK ")).toBe("captain.name@okhdfcbank");
    expect(isValidUpiVpa("captain.name@okhdfcbank")).toBe(true);
    expect(isValidUpiVpa("not-an-address")).toBe(false);
  });

  it("builds a deterministic amount-locked UPI URI", () => {
    const uri = buildUpiPaymentUri({
      vpa: "guild@okaxis",
      payeeName: "Wild Gear Crew",
      amountPaise: 389_900,
      transactionReference: upiTransactionReference("55cbdc4a-dd21-47d6-a61f-3481f350202f"),
      note: "@Ride advance · Agumbe Ride",
    });
    const parsed = new URL(uri);
    expect(parsed.protocol).toBe("upi:");
    expect(parsed.searchParams.get("pa")).toBe("guild@okaxis");
    expect(parsed.searchParams.get("pn")).toBe("Wild Gear Crew");
    expect(parsed.searchParams.get("am")).toBe("3899.00");
    expect(parsed.searchParams.get("cu")).toBe("INR");
    expect(parsed.searchParams.get("tr")).toMatch(/^ATR[A-Z0-9]+$/);
  });

  it("rejects an invalid recipient or amount", () => {
    expect(() => buildUpiPaymentUri({ vpa: "bad", payeeName: "X", amountPaise: 0, transactionReference: "ATR1", note: "Test" })).toThrow();
  });

  it("puts the booked rider first in the bank-visible payment note", () => {
    const note = upiPaymentNote("  Aryan   Jith  ", "Nandi Hills Breakfast Ride");
    expect(note).toBe("Aryan Jith @Ride Nandi Hills Breakfast Ride");
    expect(note).not.toContain("confirmation advance");
    expect(upiPaymentNote("A very long participant name that banks may truncate", "A very long ride title that must also remain safe").length).toBeLessThanOrEqual(80);
  });
});
