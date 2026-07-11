import { createPublicKey, verify } from "node:crypto";

type GoogleTokenHeader = { alg?: string; kid?: string; typ?: string };
export type GoogleIdentityClaims = {
  iss: string;
  aud: string | string[];
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  nonce: string;
  iat: number;
  exp: number;
};

type GoogleJwk = JsonWebKey & { kid: string; alg?: string; use?: string };
let keyCache: { keys: GoogleJwk[]; expiresAt: number } | null = null;

export class GoogleOAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleOAuthError";
  }
}

function decodeSegment<T>(value: string): T {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    throw new GoogleOAuthError("Google returned a malformed identity token.");
  }
}

async function googleKeys() {
  if (keyCache && keyCache.expiresAt > Date.now()) return keyCache.keys;
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!response.ok) throw new GoogleOAuthError("Google signing keys are unavailable.");
  const body = await response.json() as { keys?: GoogleJwk[] };
  if (!body.keys?.length) throw new GoogleOAuthError("Google signing keys are unavailable.");
  const maxAge = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? 300);
  keyCache = { keys: body.keys, expiresAt: Date.now() + Math.max(60, maxAge) * 1000 };
  return body.keys;
}

export async function validateGoogleIdToken(
  idToken: string,
  expected: { clientId: string; nonce: string },
  resolveKeys: () => Promise<GoogleJwk[]> = googleKeys,
) {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new GoogleOAuthError("Google returned a malformed identity token.");
  const [encodedHeader, encodedClaims, encodedSignature] = parts;
  const header = decodeSegment<GoogleTokenHeader>(encodedHeader);
  if (header.alg !== "RS256" || !header.kid) throw new GoogleOAuthError("Google returned an unsupported identity token.");
  const jwk = (await resolveKeys()).find((key) => key.kid === header.kid && (!key.alg || key.alg === "RS256"));
  if (!jwk) throw new GoogleOAuthError("Google identity signing key was not found.");
  const validSignature = verify(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedClaims}`, "ascii"),
    createPublicKey({ key: jwk, format: "jwk" }),
    Buffer.from(encodedSignature, "base64url"),
  );
  if (!validSignature) throw new GoogleOAuthError("Google identity signature was invalid.");

  const claims = decodeSegment<GoogleIdentityClaims>(encodedClaims);
  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!["accounts.google.com", "https://accounts.google.com"].includes(claims.iss)) throw new GoogleOAuthError("Google identity issuer was invalid.");
  if (!audience.includes(expected.clientId)) throw new GoogleOAuthError("Google identity audience was invalid.");
  if (!claims.sub || !claims.email || claims.email_verified !== true) throw new GoogleOAuthError("Google did not provide a verified email identity.");
  if (claims.nonce !== expected.nonce) throw new GoogleOAuthError("Google identity nonce was invalid.");
  if (!Number.isFinite(claims.exp) || claims.exp <= now || !Number.isFinite(claims.iat) || claims.iat > now + 60) {
    throw new GoogleOAuthError("Google identity token was expired or not yet valid.");
  }
  return claims;
}
