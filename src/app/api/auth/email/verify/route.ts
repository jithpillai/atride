import { NextResponse } from "next/server";

import { verifyEmailOtp } from "@/server/auth/auth-service";
import { getSessionCookieName } from "@/server/auth/config";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as { email?: unknown; code?: unknown };
    const result = await verifyEmailOtp(
      typeof body.email === "string" ? body.email : "",
      typeof body.code === "string" ? body.code : "",
    );
    const response = NextResponse.json({ ok: true, user: { id: result.user.id, displayName: result.user.displayName } });
    response.cookies.set(getSessionCookieName(), result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: result.expiresAt,
    });
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
