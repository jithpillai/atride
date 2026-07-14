import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { getSessionCookieName } from "@/server/auth/config";
import { hashSessionToken } from "@/server/auth/crypto";

export async function getSessionByToken(token?: string) {
  if (!token) return null;
  return db.session.findFirst({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: { status: "ACTIVE" },
    },
    include: {
      user: {
        include: {
          contacts: { where: { isPrimary: true } },
          profile: { include: { avatarAsset: true } },
          vehicles: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
          platformRoles: true,
          communityMemberships: {
            where: { status: "ACTIVE" },
            include: {
              community: {
                select: {
                  slug: true,
                  name: true,
                  logoAsset: {
                    select: { publicId: true, version: true, format: true, deliveryType: true },
                  },
                },
              },
              roles: true,
              welcomeConsent: true,
            },
          },
        },
      },
    },
  });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return getSessionByToken(cookieStore.get(getSessionCookieName())?.value);
}
