import { afterEach, describe, expect, it, vi } from "vitest";

import { decryptWhatsAppInviteUrl, encryptWhatsAppInviteUrl, normalizeWhatsAppInviteUrl } from "./whatsapp-invite";

afterEach(() => vi.unstubAllEnvs());

describe("WhatsApp ride invite URL", () => {
  it("normalizes a WhatsApp group invite and removes query tracking", () => {
    expect(normalizeWhatsAppInviteUrl("https://chat.whatsapp.com/AbCdEf1234567890?source=share")).toBe("https://chat.whatsapp.com/AbCdEf1234567890");
  });

  it("accepts an empty value for removal", () => {
    expect(normalizeWhatsAppInviteUrl("  ")).toBeNull();
  });

  it("rejects unrelated and insecure URLs", () => {
    expect(() => normalizeWhatsAppInviteUrl("https://example.com/group")).toThrow("invalid-whatsapp-invite");
    expect(() => normalizeWhatsAppInviteUrl("http://chat.whatsapp.com/AbCdEf1234567890")).toThrow("invalid-whatsapp-invite");
  });

  it("encrypts the bearer link with ride-bound authenticated encryption", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-with-at-least-thirty-two-characters");
    const url = "https://chat.whatsapp.com/AbCdEf1234567890";
    const encrypted = encryptWhatsAppInviteUrl(url, "ride-1");
    expect(encrypted).not.toContain("chat.whatsapp.com");
    expect(decryptWhatsAppInviteUrl(encrypted, "ride-1")).toBe(url);
    expect(decryptWhatsAppInviteUrl(encrypted, "ride-2")).toBeNull();
  });
});
