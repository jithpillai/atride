import { NextRequest, NextResponse } from "next/server";

import { getGoogleFlowCookieName } from "@/server/auth/config";
import {
  createGoogleOAuthFlow,
  encryptGoogleOAuthFlow,
  GOOGLE_FLOW_MAX_AGE_SECONDS,
} from "@/server/auth/google-flow";
import { googleAuthorizationUrl } from "@/server/auth/google-auth-service";

export async function GET(request: NextRequest) {
  try {
    const flow = createGoogleOAuthFlow(request.nextUrl.searchParams.get("returnTo"));
    const response = NextResponse.redirect(googleAuthorizationUrl(flow));
    response.cookies.set(getGoogleFlowCookieName(), encryptGoogleOAuthFlow(flow), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GOOGLE_FLOW_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", request.url));
  }
}
