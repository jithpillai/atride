import { requestEmailOtp } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse, requestIp } from "@/server/auth/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as { email?: unknown };
    const result = await requestEmailOtp(typeof body.email === "string" ? body.email : "", requestIp(request));
    return Response.json({ ok: true, email: result.email, developmentCode: result.developmentCode });
  } catch (error) {
    return authErrorResponse(error);
  }
}
