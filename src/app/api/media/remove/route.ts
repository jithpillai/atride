import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { removeMediaAsset } from "@/server/media/service";

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to remove an image.", 401);
    const body = await request.json() as { assetId?: unknown; communitySlug?: unknown; rideId?: unknown };
    if (typeof body.assetId !== "string") throw new AuthError("INVALID_MEDIA", "Select an image to remove.");
    await removeMediaAsset(session, body.assetId, typeof body.communitySlug === "string" ? body.communitySlug : undefined, typeof body.rideId === "string" ? body.rideId : undefined);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
