"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireRideEditor, requireSession } from "@/server/auth/authorization";
import { dispatchNotificationOutbox } from "@/server/notifications/dispatcher";
import { queueRideAnnouncementEvents } from "@/server/notifications/announcement-events";

function input(formData: FormData, name: string, max: number) {
  return String(formData.get(name) || "").trim().slice(0, max);
}

export async function publishRideAnnouncement(formData: FormData) {
  const guildSlug = input(formData, "guildSlug", 80);
  const rideId = input(formData, "rideId", 36);
  const title = input(formData, "title", 180);
  const content = input(formData, "content", 5000);
  const urgencyInput = input(formData, "urgency", 20);
  const urgency = ["NORMAL", "IMPORTANT", "CRITICAL"].includes(urgencyInput) ? urgencyInput as "NORMAL" | "IMPORTANT" | "CRITICAL" : "NORMAL";
  const requiresAcknowledgement = urgency === "CRITICAL" || formData.get("requiresAcknowledgement") === "on";
  const { session } = await requireRideEditor(guildSlug, rideId);
  if (title.length < 5 || content.length < 10) redirect(`/guilds/${guildSlug}/rides/${rideId}/edit?error=announcement-details#official-announcements`);

  const result = await db.$transaction(async (tx) => {
    const ride = await tx.ride.findFirst({ where: { id: rideId, community: { slug: guildSlug } }, select: { id: true, communityId: true, updatedAt: true, status: true } });
    if (!ride || !["PUBLISHED", "CLOSED", "POSTPONED"].includes(ride.status)) return null;
    const announcement = await tx.rideAnnouncement.create({ data: {
      rideId: ride.id,
      createdById: session.userId,
      title,
      content,
      urgency,
      requiresAcknowledgement,
      sourceVersion: ride.updatedAt,
      publishedAt: new Date(),
    } });
    const eventKeys = await queueRideAnnouncementEvents(tx, announcement.id);
    await tx.communityAuditEvent.create({ data: {
      communityId: ride.communityId,
      actorUserId: session.userId,
      action: "RIDE_ANNOUNCEMENT_PUBLISHED",
      metadata: { rideId, announcementId: announcement.id, urgency, requiresAcknowledgement, recipientCount: eventKeys.length },
    } });
    return { announcement, eventKeys };
  });
  if (!result) redirect(`/guilds/${guildSlug}/rides/${rideId}/edit?error=announcement-status#official-announcements`);
  if (result.eventKeys.length) await dispatchNotificationOutbox({ eventKeys: result.eventKeys, limit: 100 }).catch((error) => console.error("Immediate ride-announcement delivery failed; durable events remain queued", { announcementId: result.announcement.id, error }));
  revalidatePath(`/guilds/${guildSlug}/rides/${rideId}/edit`);
  redirect(`/guilds/${guildSlug}/rides/${rideId}/edit?officialAnnouncementSaved=1#official-announcements`);
}

export async function acknowledgeRideAnnouncement(formData: FormData) {
  const announcementId = input(formData, "announcementId", 36);
  const rideSlug = input(formData, "rideSlug", 120);
  const session = await requireSession(`/rides/${rideSlug}#ride-updates`);
  const announcement = await db.rideAnnouncement.findFirst({
    where: {
      id: announcementId,
      publishedAt: { not: null },
      requiresAcknowledgement: true,
      ride: { slug: rideSlug, bookings: { some: { userId: session.userId, status: { in: ["RESERVED", "CONFIRMED"] } } } },
    },
    select: { id: true },
  });
  if (!announcement) redirect(`/rides/${rideSlug}#ride-updates`);
  await db.rideAnnouncementAcknowledgement.upsert({
    where: { announcementId_userId: { announcementId, userId: session.userId } },
    create: { announcementId, userId: session.userId },
    update: {},
  });
  revalidatePath(`/rides/${rideSlug}`);
  redirect(`/rides/${rideSlug}?announcementAcknowledged=1#ride-updates`);
}
