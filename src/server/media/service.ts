import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { cloudinaryConfig } from "./cloudinary";
import { ALLOWED_IMAGE_FORMATS, MEDIA_POLICY, type SupportedMediaPurpose } from "./policy";

const GUILD_MEDIA_ROLES = new Set(["OWNER", "ADMIN"]);

type SessionShape = Awaited<ReturnType<typeof import("@/server/auth/session").getCurrentSession>>;

export async function resolveMediaContext(session: NonNullable<SessionShape>, purpose: SupportedMediaPurpose, communitySlug?: string) {
  const { folderPrefix } = cloudinaryConfig();
  if (purpose === "USER_AVATAR") {
    return { communityId: null, publicIdPrefix: `${folderPrefix}/users/${session.userId}/avatar` };
  }
  if (!communitySlug) throw new AuthError("GUILD_REQUIRED", "Select a Guild for this upload.");
  const membership = session.user.communityMemberships.find(({ community }) => community.slug === communitySlug);
  if (!membership || !membership.roles.some(({ role }) => GUILD_MEDIA_ROLES.has(role))) {
    throw new AuthError("MEDIA_FORBIDDEN", "You cannot manage media for this Guild.", 403);
  }
  const suffix = purpose === "GUILD_LOGO" ? "logo" : purpose === "GUILD_COVER" ? "cover" : "gallery";
  return {
    communityId: membership.communityId,
    publicIdPrefix: `${folderPrefix}/guilds/${membership.communityId}/${suffix}`,
  };
}

export async function createUploadSignature(session: NonNullable<SessionShape>, purpose: SupportedMediaPurpose, communitySlug?: string) {
  const context = await resolveMediaContext(session, purpose, communitySlug);
  const { cloudinary, cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${context.publicIdPrefix}/${randomUUID()}`;
  const deliveryType = purpose === "USER_AVATAR" ? "authenticated" : "upload";
  const uploadParams = { timestamp, public_id: publicId, overwrite: false, type: deliveryType };
  return {
    cloudName,
    apiKey,
    timestamp,
    publicId,
    overwrite: false,
    deliveryType,
    signature: cloudinary.utils.api_sign_request(uploadParams, apiSecret),
    maxBytes: MEDIA_POLICY[purpose].maxBytes,
  };
}

type CompleteInput = { purpose: SupportedMediaPurpose; communitySlug?: string; publicId: string };

export async function completeMediaUpload(session: NonNullable<SessionShape>, input: CompleteInput) {
  const context = await resolveMediaContext(session, input.purpose, input.communitySlug);
  if (!input.publicId.startsWith(`${context.publicIdPrefix}/`)) {
    throw new AuthError("INVALID_MEDIA", "The uploaded asset does not match this account or Guild.");
  }
  const { cloudinary } = cloudinaryConfig();
  const deliveryType = input.purpose === "USER_AVATAR" ? "authenticated" : "upload";
  const resource = await cloudinary.api.resource(input.publicId, { resource_type: "image", type: deliveryType }) as {
    public_id: string; version: number; format: string; width?: number; height?: number; bytes?: number; resource_type: string;
  };
  const format = resource.format.toLowerCase();
  const bytes = resource.bytes ?? 0;
  if (!ALLOWED_IMAGE_FORMATS.has(format) || bytes <= 0 || bytes > MEDIA_POLICY[input.purpose].maxBytes) {
    await cloudinary.uploader.destroy(input.publicId, { resource_type: "image", type: deliveryType, invalidate: true }).catch(() => undefined);
    throw new AuthError("INVALID_MEDIA", "Use a JPEG, PNG, or WebP image within the allowed size.");
  }

  const oldPublicIds: string[] = [];
  let asset;
  try {
    asset = await db.$transaction(async (tx) => {
    if (input.purpose === "GUILD_GALLERY" && context.communityId) {
      const count = await tx.mediaAsset.count({ where: { communityId: context.communityId, purpose: "GUILD_GALLERY" } });
      if (count >= 12) throw new AuthError("GALLERY_LIMIT", "A Guild gallery can contain up to 12 images.", 409);
    }
    const created = await tx.mediaAsset.create({
      data: {
        uploaderUserId: session.userId,
        communityId: context.communityId,
        purpose: input.purpose,
        access: input.purpose === "USER_AVATAR" ? "AUTHENTICATED" : "PUBLIC",
        publicId: resource.public_id,
        version: resource.version,
        resourceType: resource.resource_type,
        deliveryType,
        format,
        width: resource.width,
        height: resource.height,
        bytes,
        sortOrder: input.purpose === "GUILD_GALLERY" && context.communityId
          ? await tx.mediaAsset.count({ where: { communityId: context.communityId, purpose: "GUILD_GALLERY" } })
          : 0,
      },
    });

    if (input.purpose === "USER_AVATAR") {
      const profile = await tx.participantProfile.findUnique({ where: { userId: session.userId }, select: { avatarAssetId: true } });
      await tx.participantProfile.update({ where: { userId: session.userId }, data: { avatarAssetId: created.id } });
      if (profile?.avatarAssetId) {
        const old = await tx.mediaAsset.delete({ where: { id: profile.avatarAssetId } });
        oldPublicIds.push(old.publicId);
      }
    } else if ((input.purpose === "GUILD_LOGO" || input.purpose === "GUILD_COVER") && context.communityId) {
      const guild = await tx.community.findUnique({ where: { id: context.communityId }, select: { logoAssetId: true, coverAssetId: true } });
      const oldId = input.purpose === "GUILD_LOGO" ? guild?.logoAssetId : guild?.coverAssetId;
      await tx.community.update({
        where: { id: context.communityId },
        data: input.purpose === "GUILD_LOGO" ? { logoAssetId: created.id } : { coverAssetId: created.id },
      });
      if (oldId) {
        const old = await tx.mediaAsset.delete({ where: { id: oldId } });
        oldPublicIds.push(old.publicId);
      }
    }
    return created;
    });
  } catch (error) {
    await cloudinary.uploader.destroy(input.publicId, { resource_type: "image", type: deliveryType, invalidate: true }).catch(() => undefined);
    throw error;
  }

  await Promise.all(oldPublicIds.map((publicId) => cloudinary.uploader.destroy(publicId, { resource_type: "image", type: deliveryType, invalidate: true }).catch(() => undefined)));
  return asset;
}

export async function removeMediaAsset(session: NonNullable<SessionShape>, assetId: string, communitySlug?: string) {
  const asset = await db.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) return;
  const context = await resolveMediaContext(session, asset.purpose as SupportedMediaPurpose, communitySlug);
  if (asset.uploaderUserId !== session.userId && !context.communityId) throw new AuthError("MEDIA_FORBIDDEN", "You cannot remove this image.", 403);
  if (asset.communityId !== context.communityId) throw new AuthError("MEDIA_FORBIDDEN", "You cannot remove this image.", 403);
  await db.mediaAsset.delete({ where: { id: asset.id } });
  const { cloudinary } = cloudinaryConfig();
  await cloudinary.uploader.destroy(asset.publicId, { resource_type: "image", type: asset.deliveryType, invalidate: true }).catch(() => undefined);
}
