import { afterEach, describe, expect, it, vi } from "vitest";

import {
  codeChallenge,
  createGoogleOAuthFlow,
  decryptGoogleOAuthFlow,
  encryptGoogleOAuthFlow,
  googleFlowStateMatches,
  sanitizeReturnTo,
} from "./google-flow";

afterEach(() => vi.unstubAllEnvs());

describe("Google OAuth flow protection", () => {
  it("encrypts and restores short-lived state without exposing the verifier", () => {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret-containing-at-least-thirty-two-characters");
    const flow = createGoogleOAuthFlow("/guilds/wild-gear/manage");
    const encrypted = encryptGoogleOAuthFlow(flow);

    expect(encrypted).not.toContain(flow.codeVerifier);
    expect(decryptGoogleOAuthFlow(encrypted)).toEqual(flow);
    expect(googleFlowStateMatches(flow.state, flow.state)).toBe(true);
    expect(googleFlowStateMatches("different", flow.state)).toBe(false);
  });

  it("rejects tampering and unsafe return paths", () => {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret-containing-at-least-thirty-two-characters");
    const encrypted = encryptGoogleOAuthFlow(createGoogleOAuthFlow("/account"));

    expect(decryptGoogleOAuthFlow(`${encrypted.slice(0, -1)}x`)).toBeNull();
    expect(sanitizeReturnTo("//attacker.example")).toBe("/account");
    expect(sanitizeReturnTo("https://attacker.example")).toBe("/account");
  });

  it("creates an S256 PKCE challenge", () => {
    expect(codeChallenge("test-verifier")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(codeChallenge("test-verifier")).not.toBe("test-verifier");
  });
});
