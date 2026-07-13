import { describe, expect, it } from "vitest";

import { isRideStatusTransitionAllowed } from "./status";

describe("ride status transitions", () => {
  it("allows the operational publication lifecycle", () => {
    expect(isRideStatusTransitionAllowed("DRAFT", "PUBLISHED")).toBe(true);
    expect(isRideStatusTransitionAllowed("PUBLISHED", "POSTPONED")).toBe(true);
    expect(isRideStatusTransitionAllowed("POSTPONED", "PUBLISHED")).toBe(true);
    expect(isRideStatusTransitionAllowed("CLOSED", "COMPLETED")).toBe(true);
  });

  it("keeps terminal states terminal and rejects arbitrary changes", () => {
    expect(isRideStatusTransitionAllowed("COMPLETED", "PUBLISHED")).toBe(false);
    expect(isRideStatusTransitionAllowed("CANCELLED", "DRAFT")).toBe(false);
    expect(isRideStatusTransitionAllowed("DRAFT", "COMPLETED")).toBe(false);
  });
});
