"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireSession } from "@/server/auth/authorization";

export async function setGuildWelcomeConsent(formData: FormData) {
  const session = await requireSession("/account");
  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const enabled = formData.get("enabled") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(membershipId)) redirect("/account?welcomeError=invalid");

  const membership = await db.communityMembership.findFirst({
    where: { id: membershipId, userId: session.userId, status: "ACTIVE" },
    select: { id: true, communityId: true, community: { select: { slug: true } } },
  });
  if (!membership) redirect("/account?welcomeError=access");

  const now = new Date();
  await db.$transaction(async (tx) => {
    if (enabled) {
      await tx.guildWelcomeConsent.upsert({
        where: { membershipId: membership.id },
        create: { membershipId: membership.id, consentedAt: now },
        update: { consentedAt: now, revokedAt: null },
      });
    } else {
      await tx.guildWelcomeConsent.updateMany({
        where: { membershipId: membership.id, revokedAt: null },
        data: { revokedAt: now },
      });
    }
    await tx.communityAuditEvent.create({
      data: {
        communityId: membership.communityId,
        actorUserId: session.userId,
        targetUserId: session.userId,
        action: enabled ? "GUILD_WELCOME_CONSENT_GRANTED" : "GUILD_WELCOME_CONSENT_REVOKED",
      },
    });
  });

  revalidatePath("/account");
  revalidatePath(`/guilds/${membership.community.slug}`);
}
