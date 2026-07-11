import { getCurrentSession } from "@/server/auth/session";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { AuthError } from "@/server/auth/auth-service";
import { confirmPhoneVerification } from "@/server/phone-verification/service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to verify your phone number.", 401);
    const body = await request.json() as { challengeToken?: unknown; idToken?: unknown };
    const result = await confirmPhoneVerification(
      session.userId,
      typeof body.challengeToken === "string" ? body.challengeToken : "",
      typeof body.idToken === "string" ? body.idToken : "",
    );
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return authErrorResponse(error);
  }
}
