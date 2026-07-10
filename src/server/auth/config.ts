export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_RESEND_SECONDS = 60;

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  return secret;
}

export function getSessionCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-atride_session" : "atride_session";
}
