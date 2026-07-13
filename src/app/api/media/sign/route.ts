import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { isSupportedMediaPurpose } from "@/server/media/policy";
import { createUploadSignature } from "@/server/media/service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to upload an image.", 401);
    const body = await request.json() as { purpose?: unknown; communitySlug?: unknown; rideId?: unknown };
    const purpose = typeof body.purpose === "string" ? body.purpose : "";
    if (!isSupportedMediaPurpose(purpose)) throw new AuthError("INVALID_MEDIA_PURPOSE", "This upload type is not supported.");
    const result = await createUploadSignature(session, purpose, typeof body.communitySlug === "string" ? body.communitySlug : undefined, typeof body.rideId === "string" ? body.rideId : undefined);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return authErrorResponse(error);
  }
}
