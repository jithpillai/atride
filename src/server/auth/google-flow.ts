import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { getAuthSecret } from "./config";

export const GOOGLE_FLOW_MAX_AGE_SECONDS = 10 * 60;

export type GoogleOAuthFlow = {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  expiresAt: number;
};

function key() {
  return createHash("sha256").update(`atride-google-flow:${getAuthSecret()}`, "utf8").digest();
}

export function sanitizeReturnTo(value?: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export function createGoogleOAuthFlow(returnTo?: string | null): GoogleOAuthFlow {
  return {
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    codeVerifier: randomBytes(64).toString("base64url"),
    returnTo: sanitizeReturnTo(returnTo),
    expiresAt: Date.now() + GOOGLE_FLOW_MAX_AGE_SECONDS * 1000,
  };
}

export function codeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier, "ascii").digest("base64url");
}

export function googleFlowStateMatches(actual: string, expected: string) {
  const actualHash = createHash("sha256").update(actual, "utf8").digest();
  const expectedHash = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(actualHash, expectedHash);
}

export function encryptGoogleOAuthFlow(flow: GoogleOAuthFlow) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(flow), "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptGoogleOAuthFlow(value?: string): GoogleOAuthFlow | null {
  if (!value) return null;
  try {
    const [ivValue, tagValue, encryptedValue] = value.split(".");
    if (!ivValue || !tagValue || !encryptedValue) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decoded = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const flow = JSON.parse(decoded) as GoogleOAuthFlow;
    if (!flow.state || !flow.nonce || !flow.codeVerifier || flow.expiresAt <= Date.now()) return null;
    return { ...flow, returnTo: sanitizeReturnTo(flow.returnTo) };
  } catch {
    return null;
  }
}
