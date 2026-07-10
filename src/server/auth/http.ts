import { AuthError } from "@/server/auth/auth-service";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new AuthError("INVALID_ORIGIN", "The request origin is invalid.", 403);
  }
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ ok: false, code: error.code, message: error.message }, { status: error.status });
  }
  console.error("Authentication request failed", error instanceof Error ? error.message : "Unknown error");
  return Response.json({ ok: false, code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable." }, { status: 500 });
}
