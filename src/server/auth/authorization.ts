import { redirect } from "next/navigation";

import { getCurrentSession } from "@/server/auth/session";

const GUILD_MANAGEMENT_ROLES = new Set([
  "OWNER",
  "ADMIN",
  "RIDE_MANAGER",
  "FINANCE",
  "MEMBER_MANAGER",
]);

export async function requireSession(returnTo = "/account") {
  const session = await getCurrentSession();
  if (!session) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  return session;
}

export async function requirePlatformAdmin() {
  const session = await requireSession("/admin");
  if (!session.user.platformRoles.some(({ role }) => role === "PLATFORM_ADMIN")) {
    redirect("/account?access=denied");
  }
  return session;
}

export async function requireGuildManager(slug: string) {
  const session = await requireSession(`/guilds/${slug}/manage`);
  const membership = session.user.communityMemberships.find(
    ({ community }) => community.slug === slug,
  );
  if (!membership || !membership.roles.some(({ role }) => GUILD_MANAGEMENT_ROLES.has(role))) {
    redirect("/account?access=denied");
  }
  return { session, membership };
}
