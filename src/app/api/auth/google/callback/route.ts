import { NextRequest, NextResponse } from "next/server";

import {
  getGoogleFlowCookieName,
  getGoogleOAuthConfig,
  getSessionCookieName,
} from "@/server/auth/config";
import {
  decryptGoogleOAuthFlow,
  googleFlowStateMatches,
} from "@/server/auth/google-flow";
import { completeGoogleSignIn } from "@/server/auth/google-auth-service";

function clearFlowCookie(response: NextResponse) {
  response.cookies.set(getGoogleFlowCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

function loginError(code: string) {
  const { appUrl } = getGoogleOAuthConfig();
  return clearFlowCookie(NextResponse.redirect(new URL(`/login?error=${code}`, appUrl)));
}

export async function GET(request: NextRequest) {
  const flow = decryptGoogleOAuthFlow(request.cookies.get(getGoogleFlowCookieName())?.value);
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const providerError = request.nextUrl.searchParams.get("error");

  try {
    if (!flow || !state || !googleFlowStateMatches(state, flow.state)) return loginError("google_invalid_flow");
    if (providerError) return loginError(providerError === "access_denied" ? "google_cancelled" : "google_failed");
    if (!code) return loginError("google_invalid_flow");

    const result = await completeGoogleSignIn(code, flow);
    const { appUrl } = getGoogleOAuthConfig();
    const destination = result.onboardingRequired ? "/onboarding" : flow.returnTo;
    const response = NextResponse.redirect(new URL(destination, appUrl));
    response.cookies.set(getSessionCookieName(), result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: result.expiresAt,
    });
    return clearFlowCookie(response);
  } catch {
    return loginError("google_failed");
  }
}
