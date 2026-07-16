import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { dispatchNotificationOutbox } from "@/server/notifications/dispatcher";
import { queueFinancePaymentSubmitted } from "@/server/notifications/payment-events";
import { cloudinaryConfig } from "./cloudinary";
import { ALLOWED_IMAGE_FORMATS, MEDIA_POLICY, type SupportedMediaPurpose } from "./policy";

const GUILD_MEDIA_ROLES = new Set(["OWNER", "ADMIN"]);
const RIDE_MEDIA_ROLES = new Set(["OWNER", "ADMIN", "RIDE_MANAGER"]);

type SessionShape = Awaited<ReturnType<typeof import("@/server/auth/session").getCurrentSession>>;

export async function resolveMediaContext(session: NonNullable<SessionShape>, purpose: SupportedMediaPurpose, communitySlug?: string, rideId?: string, bookingPaymentId?: string) {
  const { folderPrefix } = cloudinaryConfig();
  if (purpose === "USER_AVATAR") {
    return { communityId: null, rideId: null, bookingPaymentId: null, publicIdPrefix: `${folderPrefix}/users/${session.userId}/avatar` };
  }
  if (purpose === "PAYMENT_PROOF") {
    if (!bookingPaymentId) throw new AuthError("PAYMENT_REQUIRED", "Select the payment this proof belongs to.");
    const payment = await db.bookingPayment.findFirst({
      where: {
        id: bookingPaymentId,
        status: { in: ["PENDING", "REJECTED"] },
        booking: { userId: session.userId },
        OR: [
          { purpose: { in: ["CONFIRMATION_DEPOSIT", "FULL_PAYMENT"] }, booking: { status: "RESERVED" } },
          { purpose: "BALANCE", booking: { status: "CONFIRMED" } },
        ],
      },
      select: { id: true, booking: { select: { communityId: true, rideId: true } } },
    });
    if (!payment) throw new AuthError("MEDIA_FORBIDDEN", "This payment cannot accept proof from this account.", 403);
    return {
      communityId: payment.booking.communityId,
      rideId: payment.booking.rideId,
      bookingPaymentId: payment.id,
      publicIdPrefix: `${folderPrefix}/guilds/${payment.booking.communityId}/payments/${payment.id}`,
    };
  }
  if (!communitySlug) throw new AuthError("GUILD_REQUIRED", "Select a Guild for this upload.");
  const membership = session.user.communityMemberships.find(({ community }) => community.slug === communitySlug);
  const ridePurpose = purpose === "RIDE_COVER" || purpose === "RIDE_GALLERY";
  const allowedRoles = ridePurpose ? RIDE_MEDIA_ROLES : GUILD_MEDIA_ROLES;
  if (!membership) {
    throw new AuthError("MEDIA_FORBIDDEN", "You cannot manage media for this Guild.", 403);
  }
  if (ridePurpose) {
    if (!rideId) throw new AuthError("RIDE_REQUIRED", "Select a ride for this upload.");
    const managesAllGuildRides = membership.roles.some(({ role }) => allowedRoles.has(role));
    const ride = await db.ride.findFirst({
      where: {
        id: rideId,
        communityId: membership.communityId,
        ...(managesAllGuildRides ? {} : { staffAssignments: { some: { userId: session.userId, role: { in: ["LEAD_CAPTAIN", "CAPTAIN", "VICE_CAPTAIN"] } } } }),
      },
      select: { id: true },
    });
    if (!ride) throw new AuthError("MEDIA_FORBIDDEN", "You cannot manage media for this ride.", 403);
    return { communityId: membership.communityId, rideId: ride.id, bookingPaymentId: null, publicIdPrefix: `${folderPrefix}/guilds/${membership.communityId}/rides/${ride.id}/${purpose === "RIDE_COVER" ? "cover" : "gallery"}` };
  }
  if (!membership.roles.some(({ role }) => allowedRoles.has(role))) throw new AuthError("MEDIA_FORBIDDEN", "You cannot manage media for this Guild.", 403);
  const suffix = purpose === "GUILD_LOGO" ? "logo" : purpose === "GUILD_COVER" ? "cover" : "gallery";
  return {
    communityId: membership.communityId,
    rideId: null,
    bookingPaymentId: null,
    publicIdPrefix: `${folderPrefix}/guilds/${membership.communityId}/${suffix}`,
  };
}

export async function createUploadSignature(session: NonNullable<SessionShape>, purpose: SupportedMediaPurpose, communitySlug?: string, rideId?: string, bookingPaymentId?: string) {
  const context = await resolveMediaContext(session, purpose, communitySlug, rideId, bookingPaymentId);
  const { cloudinary, cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${context.publicIdPrefix}/${randomUUID()}`;
  const deliveryType = purpose === "USER_AVATAR" || purpose === "PAYMENT_PROOF" ? "authenticated" : "upload";
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

type CompleteInput = { purpose: SupportedMediaPurpose; communitySlug?: string; rideId?: string; bookingPaymentId?: string; publicId: string; payerReference?: string };

export async function completeMediaUpload(session: NonNullable<SessionShape>, input: CompleteInput) {
  const context = await resolveMediaContext(session, input.purpose, input.communitySlug, input.rideId, input.bookingPaymentId);
  if (!input.publicId.startsWith(`${context.publicIdPrefix}/`)) {
    throw new AuthError("INVALID_MEDIA", "The uploaded asset does not match this account or Guild.");
  }
  const { cloudinary } = cloudinaryConfig();
  const deliveryType = input.purpose === "USER_AVATAR" || input.purpose === "PAYMENT_PROOF" ? "authenticated" : "upload";
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
  const notificationEventKeys: string[] = [];
  const pathsToRevalidate = new Set<string>();
  let asset;
  try {
    asset = await db.$transaction(async (tx) => {
    if ((input.purpose === "GUILD_GALLERY" || input.purpose === "RIDE_GALLERY") && context.communityId) {
      const count = await tx.mediaAsset.count({ where: input.purpose === "RIDE_GALLERY" ? { rideId: context.rideId, purpose: "RIDE_GALLERY" } : { communityId: context.communityId, purpose: "GUILD_GALLERY" } });
      if (count >= 12) throw new AuthError("GALLERY_LIMIT", "A gallery can contain up to 12 images.", 409);
    }
    const created = await tx.mediaAsset.create({
      data: {
        uploaderUserId: session.userId,
        communityId: context.communityId,
        rideId: context.rideId,
        purpose: input.purpose,
        access: input.purpose === "PAYMENT_PROOF" ? "PRIVATE" : input.purpose === "USER_AVATAR" ? "AUTHENTICATED" : "PUBLIC",
        publicId: resource.public_id,
        version: resource.version,
        resourceType: resource.resource_type,
        deliveryType,
        format,
        width: resource.width,
        height: resource.height,
        bytes,
        sortOrder: (input.purpose === "GUILD_GALLERY" || input.purpose === "RIDE_GALLERY") && context.communityId
          ? await tx.mediaAsset.count({ where: input.purpose === "RIDE_GALLERY" ? { rideId: context.rideId, purpose: "RIDE_GALLERY" } : { communityId: context.communityId, purpose: "GUILD_GALLERY" } })
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
    } else if (input.purpose === "RIDE_COVER" && context.rideId) {
      const ride = await tx.ride.findUnique({ where: { id: context.rideId }, select: { coverAssetId: true } });
      await tx.ride.update({ where: { id: context.rideId }, data: { coverAssetId: created.id } });
      if (ride?.coverAssetId) {
        const old = await tx.mediaAsset.delete({ where: { id: ride.coverAssetId } });
        oldPublicIds.push(old.publicId);
      }
    } else if (input.purpose === "PAYMENT_PROOF" && context.bookingPaymentId) {
      const payerReference = input.payerReference?.trim().slice(0, 80) ?? "";
      if (payerReference.length < 6) throw new AuthError("PAYMENT_REFERENCE_REQUIRED", "Enter the UTR or UPI Transaction ID shown in your payment app.");
      const payment = await tx.bookingPayment.findUnique({
        where: { id: context.bookingPaymentId },
        select: {
          proofAssetId: true,
          bookingId: true,
          booking: {
            select: {
              community: { select: { slug: true } },
              ride: { select: { slug: true } },
            },
          },
        },
      });
      if (!payment) throw new AuthError("PAYMENT_REQUIRED", "This payment is unavailable.");
      await tx.bookingPayment.update({
        where: { id: context.bookingPaymentId },
        data: { proofAssetId: created.id, payerReference, status: "SUBMITTED", submittedAt: new Date(), reviewedById: null, reviewedAt: null, rejectionReason: null },
      });
      if (payment.proofAssetId) {
        const old = await tx.mediaAsset.delete({ where: { id: payment.proofAssetId } });
        oldPublicIds.push(old.publicId);
      }
      await tx.communityAuditEvent.create({ data: {
        communityId: context.communityId!, actorUserId: session.userId, action: "PAYMENT_PROOF_SUBMITTED",
        metadata: { bookingPaymentId: context.bookingPaymentId, bookingId: payment.bookingId, rideId: context.rideId },
      } });
      notificationEventKeys.push(...await queueFinancePaymentSubmitted(tx, context.bookingPaymentId, created.id));
      pathsToRevalidate.add(`/guilds/${payment.booking.community.slug}/manage`);
      pathsToRevalidate.add(`/guilds/${payment.booking.community.slug}`);
      pathsToRevalidate.add(`/rides/${payment.booking.ride.slug}`);
      pathsToRevalidate.add("/");
    }
    return created;
    });
  } catch (error) {
    await cloudinary.uploader.destroy(input.publicId, { resource_type: "image", type: deliveryType, invalidate: true }).catch(() => undefined);
    throw error;
  }

  await Promise.all(oldPublicIds.map((publicId) => cloudinary.uploader.destroy(publicId, { resource_type: "image", type: deliveryType, invalidate: true }).catch(() => undefined)));
  pathsToRevalidate.forEach((path) => revalidatePath(path));
  if (notificationEventKeys.length) {
    await dispatchNotificationOutbox({ eventKeys: notificationEventKeys }).catch((error) => {
      console.error("Immediate payment notification dispatch failed; the durable event remains queued", { error });
    });
  }
  return asset;
}

export async function removeMediaAsset(session: NonNullable<SessionShape>, assetId: string, communitySlug?: string, rideId?: string, bookingPaymentId?: string) {
  const asset = await db.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) return;
  const context = await resolveMediaContext(session, asset.purpose as SupportedMediaPurpose, communitySlug, rideId, bookingPaymentId);
  if (asset.uploaderUserId !== session.userId && !context.communityId) throw new AuthError("MEDIA_FORBIDDEN", "You cannot remove this image.", 403);
  if (asset.communityId !== context.communityId) throw new AuthError("MEDIA_FORBIDDEN", "You cannot remove this image.", 403);
  if (asset.rideId !== context.rideId) throw new AuthError("MEDIA_FORBIDDEN", "You cannot remove this ride image.", 403);
  await db.mediaAsset.delete({ where: { id: asset.id } });
  const { cloudinary } = cloudinaryConfig();
  await cloudinary.uploader.destroy(asset.publicId, { resource_type: "image", type: asset.deliveryType, invalidate: true }).catch(() => undefined);
}
