"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireRideEditor } from "@/server/auth/authorization";
import { encryptWhatsAppInviteUrl, normalizeWhatsAppInviteUrl } from "@/server/ride/whatsapp-invite";

function text(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

export async function updateRideWhatsAppInvite(formData: FormData) {
  const guildSlug = text(formData, "guildSlug", 80);
  const rideId = text(formData, "rideId", 36);
  const { session } = await requireRideEditor(guildSlug, rideId);
  let whatsappInviteUrl: string | null;
  try {
    whatsappInviteUrl = normalizeWhatsAppInviteUrl(text(formData, "whatsappInviteUrl", 500));
  } catch {
    redirect(`/guilds/${guildSlug}/rides/${rideId}/edit?error=whatsapp-invite#whatsapp-invite`);
  }
  const ride = await db.ride.findFirst({ where: { id: rideId, community: { slug: guildSlug } }, select: { id: true, slug: true, communityId: true, whatsappInviteEncrypted: true } });
  if (!ride) redirect("/account?access=denied");
  await db.$transaction([
    db.ride.update({ where: { id: ride.id }, data: { whatsappInviteEncrypted: whatsappInviteUrl ? encryptWhatsAppInviteUrl(whatsappInviteUrl, ride.id) : null, whatsappInviteUpdatedAt: new Date() } }),
    db.communityAuditEvent.create({ data: {
      communityId: ride.communityId,
      actorUserId: session.userId,
      action: whatsappInviteUrl ? "RIDE_WHATSAPP_INVITE_UPDATED" : "RIDE_WHATSAPP_INVITE_REMOVED",
      metadata: { rideId: ride.id, replacedExistingLink: Boolean(ride.whatsappInviteEncrypted), linkStored: Boolean(whatsappInviteUrl) },
    } }),
  ]);
  revalidatePath(`/guilds/${guildSlug}/rides/${ride.id}/edit`);
  revalidatePath(`/rides/${ride.slug}`);
  redirect(`/guilds/${guildSlug}/rides/${ride.id}/edit?whatsappSaved=1#whatsapp-invite`);
}
