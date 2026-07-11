import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";

import { GoogleOAuthError, validateGoogleIdToken, type GoogleIdentityClaims } from "./google-token";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" };

function token(overrides: Partial<GoogleIdentityClaims> = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "test-key" })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({
    iss: "https://accounts.google.com",
    aud: "google-client-id",
    sub: "google-subject-123",
    email: "rider@gmail.com",
    email_verified: true,
    name: "Test Rider",
    nonce: "expected-nonce",
    iat: now,
    exp: now + 600,
    ...overrides,
  })).toString("base64url");
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${claims}`, "ascii"), privateKey).toString("base64url");
  return `${header}.${claims}.${signature}`;
}

const keys = async () => [publicJwk];

describe("Google ID-token validation", () => {
  it("accepts a correctly signed token for the expected client and nonce", async () => {
    const claims = await validateGoogleIdToken(token(), { clientId: "google-client-id", nonce: "expected-nonce" }, keys);
    expect(claims).toMatchObject({ sub: "google-subject-123", email: "rider@gmail.com", email_verified: true });
  });

  it("rejects the wrong audience or nonce", async () => {
    await expect(validateGoogleIdToken(token(), { clientId: "other-client", nonce: "expected-nonce" }, keys)).rejects.toBeInstanceOf(GoogleOAuthError);
    await expect(validateGoogleIdToken(token(), { clientId: "google-client-id", nonce: "wrong" }, keys)).rejects.toBeInstanceOf(GoogleOAuthError);
  });

  it("rejects expired and unverified identities", async () => {
    await expect(validateGoogleIdToken(token({ exp: 1 }), { clientId: "google-client-id", nonce: "expected-nonce" }, keys)).rejects.toBeInstanceOf(GoogleOAuthError);
    await expect(validateGoogleIdToken(token({ email_verified: false }), { clientId: "google-client-id", nonce: "expected-nonce" }, keys)).rejects.toBeInstanceOf(GoogleOAuthError);
  });
});
