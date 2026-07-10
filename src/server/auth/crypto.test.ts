import { describe, expect, it } from "vitest";

import {
  createOtpCode,
  createSessionToken,
  hashesMatch,
  hashOtp,
  hashSessionToken,
  normalizeEmail,
} from "./crypto";

describe("authentication cryptography", () => {
  it("normalizes email identity consistently", () => {
    expect(normalizeEmail("  Rider.Name@Example.COM ")).toBe("rider.name@example.com");
  });

  it("creates six-digit OTP codes", () => {
    for (let index = 0; index < 20; index += 1) {
      expect(createOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it("binds an OTP hash to its challenge and destination", () => {
    const secret = "test-secret-with-more-than-thirty-two-characters";
    const expected = hashOtp("challenge-a", "rider@example.com", "123456", secret);

    expect(hashesMatch(expected, hashOtp("challenge-a", "rider@example.com", "123456", secret))).toBe(true);
    expect(hashesMatch(expected, hashOtp("challenge-b", "rider@example.com", "123456", secret))).toBe(false);
    expect(hashesMatch(expected, hashOtp("challenge-a", "other@example.com", "123456", secret))).toBe(false);
  });

  it("stores only a one-way digest of a high-entropy session token", () => {
    const token = createSessionToken();
    expect(token.length).toBeGreaterThan(40);
    expect(hashSessionToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSessionToken(token)).not.toContain(token);
  });
});
