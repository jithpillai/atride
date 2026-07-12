import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { isSupportedMediaPurpose } from "@/server/media/policy";
import { completeMediaUpload } from "@/server/media/service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to complete an upload.", 401);
    const body = await request.json() as { purpose?: unknown; communitySlug?: unknown; publicId?: unknown };
    const purpose = typeof body.purpose === "string" ? body.purpose : "";
    if (!isSupportedMediaPurpose(purpose) || typeof body.publicId !== "string") {
      throw new AuthError("INVALID_MEDIA", "The uploaded image is invalid.");
    }
    const asset = await completeMediaUpload(session, {
      purpose,
      publicId: body.publicId,
      communitySlug: typeof body.communitySlug === "string" ? body.communitySlug : undefined,
    });
    return Response.json({ ok: true, assetId: asset.id });
  } catch (error) {
    return authErrorResponse(error);
  }
}
