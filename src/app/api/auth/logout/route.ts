import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getSessionCookieName } from "@/server/auth/config";
import { hashSessionToken } from "@/server/auth/crypto";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const token = request.headers.get("cookie")
      ?.split(";")
      .map((item) => item.trim().split("="))
      .find(([name]) => name === getSessionCookieName())?.[1];
    if (token) {
      await db.session.updateMany({
        where: { tokenHash: hashSessionToken(decodeURIComponent(token)), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(getSessionCookieName(), "", { httpOnly: true, expires: new Date(0), path: "/" });
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
