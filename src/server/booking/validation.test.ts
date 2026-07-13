import { describe, expect, it } from "vitest";

import { isOccupantRole, isOfflinePaymentMethod, reservationExpiry } from "./validation";

describe("booking validation", () => {
  it("accepts only supported participant and offline payment choices", () => {
    expect(isOccupantRole("RIDER")).toBe(true);
    expect(isOccupantRole("CAPTAIN")).toBe(false);
    expect(isOfflinePaymentMethod("UPI")).toBe(true);
    expect(isOfflinePaymentMethod("RAZORPAY")).toBe(false);
  });

  it("caps the payment hold at registration close", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");
    expect(reservationExpiry(now, null).toISOString()).toBe("2026-08-02T00:00:00.000Z");
    expect(reservationExpiry(now, new Date("2026-08-01T12:00:00.000Z")).toISOString()).toBe("2026-08-01T12:00:00.000Z");
  });
});
