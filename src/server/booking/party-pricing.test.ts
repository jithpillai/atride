import { describe, expect, it } from "vitest";

import { accommodationCharge, partyBookingPrice } from "./party-pricing";

describe("party booking pricing", () => {
  it("charges per-person rooms for every member of the party", () => {
    expect(accommodationCharge({ pricingMode: "PER_PERSON", pricePaise: 50_000, maxOccupancy: 4 }, 3)).toEqual({
      units: 1,
      totalPricePaise: 150_000,
    });
  });

  it("rounds per-room inventory up to the rooms required", () => {
    expect(accommodationCharge({ pricingMode: "PER_ROOM", pricePaise: 180_000, maxOccupancy: 2 }, 3)).toEqual({
      units: 2,
      totalPricePaise: 360_000,
    });
  });

  it("multiplies the ride, deposit, and selected add-ons by party size", () => {
    expect(partyBookingPrice({
      partySize: 2,
      ridePricePaise: 389_900,
      confirmationDepositPaise: 50_000,
      addOnUnitPricesPaise: [25_000],
      accommodationTotalPaise: 180_000,
    })).toEqual({
      basePricePaise: 779_800,
      addOnTotalPaise: 50_000,
      totalPricePaise: 1_009_800,
      confirmationDepositPaise: 100_000,
      balanceDuePaise: 909_800,
    });
  });
});
