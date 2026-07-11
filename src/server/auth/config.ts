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

export function getGoogleFlowCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-atride_google_flow" : "atride_google_flow";
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const appUrlValue = process.env.APP_URL?.trim();
  if (!clientId || !clientSecret || !appUrlValue) {
    throw new Error("GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and APP_URL are required for Google sign-in.");
  }
  const appUrl = new URL(appUrlValue);
  const isLocal = appUrl.hostname === "localhost" || appUrl.hostname === "127.0.0.1";
  if (appUrl.protocol !== "https:" && !(isLocal && appUrl.protocol === "http:")) {
    throw new Error("APP_URL must use HTTPS except on localhost.");
  }
  appUrl.pathname = "";
  appUrl.search = "";
  appUrl.hash = "";
  return {
    clientId,
    clientSecret,
    appUrl: appUrl.toString().replace(/\/$/, ""),
    redirectUri: `${appUrl.toString().replace(/\/$/, "")}/api/auth/google/callback`,
  };
}
