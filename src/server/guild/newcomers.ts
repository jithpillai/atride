import "server-only";

import { db } from "@/lib/db";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";

const NEWCOMER_WINDOW_DAYS = 60;
const NEWCOMER_LIMIT = 12;

function firstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] || "New rider";
}

export async function listGuildNewcomersForMember(
  guildSlug: string,
  viewerUserId: string,
  now = new Date(),
) {
  const joinedAfter = new Date(now);
  joinedAfter.setUTCDate(joinedAfter.getUTCDate() - NEWCOMER_WINDOW_DAYS);

  const guild = await db.community.findFirst({
    where: {
      slug: guildSlug,
      status: "ACTIVE",
      newcomerDisplayEnabled: true,
      memberships: { some: { userId: viewerUserId, status: "ACTIVE" } },
    },
    select: {
      memberships: {
        where: {
          status: "ACTIVE",
          joinedAt: { gte: joinedAfter },
          welcomeConsent: { is: { revokedAt: null } },
          user: { status: "ACTIVE" },
        },
        orderBy: [{ joinedAt: "desc" }, { createdAt: "desc" }],
        take: NEWCOMER_LIMIT,
        select: {
          id: true,
          joinedAt: true,
          user: {
            select: {
              displayName: true,
              profile: {
                select: {
                  homeCity: true,
                  avatarAsset: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return (guild?.memberships ?? []).map((membership) => ({
    membershipId: membership.id,
    firstName: firstName(membership.user.displayName),
    homeCity: membership.user.profile?.homeCity ?? null,
    joinedAt: membership.joinedAt!,
    avatarUrl: membership.user.profile?.avatarAsset
      ? cloudinaryImageUrl(membership.user.profile.avatarAsset)
      : null,
  }));
}
