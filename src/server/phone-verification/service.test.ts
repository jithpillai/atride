import { describe, expect, it } from "vitest";

import { isSupportedIndianMobile, verifiedFirebasePhone } from "./claims";

describe("Firebase phone verification claims", () => {
  const now = 1_800_000_000;

  it("accepts a recent Firebase phone sign-in for an Indian mobile", () => {
    expect(verifiedFirebasePhone({
      phone_number: "+919000000001",
      auth_time: now - 30,
      firebase: { sign_in_provider: "phone" },
    }, now)).toBe("+919000000001");
  });

  it("rejects tokens from another Firebase provider", () => {
    expect(verifiedFirebasePhone({
      phone_number: "+919000000001",
      auth_time: now - 30,
      firebase: { sign_in_provider: "google.com" },
    }, now)).toBeNull();
  });

  it("rejects stale authentication and unsupported numbers", () => {
    expect(verifiedFirebasePhone({
      phone_number: "+919000000001",
      auth_time: now - 301,
      firebase: { sign_in_provider: "phone" },
    }, now)).toBeNull();
    expect(isSupportedIndianMobile("+14155552671")).toBe(false);
  });
});
