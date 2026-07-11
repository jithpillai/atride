import { getCurrentSession } from "@/server/auth/session";
import { assertSameOrigin, authErrorResponse, requestIp } from "@/server/auth/http";
import { AuthError } from "@/server/auth/auth-service";
import { startPhoneVerification } from "@/server/phone-verification/service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to verify your phone number.", 401);
    const body = await request.json() as { phone?: unknown };
    const result = await startPhoneVerification(
      session.userId,
      typeof body.phone === "string" ? body.phone : "",
      requestIp(request),
    );
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return authErrorResponse(error);
  }
}
