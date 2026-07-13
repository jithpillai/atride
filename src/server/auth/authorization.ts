import { redirect } from "next/navigation";

import { db } from "@/lib/db";
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

export async function requireGuildAdmin(slug: string) {
  const result = await requireGuildManager(slug);
  if (!result.membership.roles.some(({ role }) => role === "OWNER" || role === "ADMIN")) {
    redirect("/account?access=denied");
  }
  return result;
}

export async function requireRideManager(slug: string) {
  const result = await requireGuildManager(slug);
  if (!result.membership.roles.some(({ role }) => role === "OWNER" || role === "ADMIN" || role === "RIDE_MANAGER")) {
    redirect("/account?access=denied");
  }
  return result;
}

const RIDE_EDITOR_STAFF_ROLES = new Set(["LEAD_CAPTAIN", "CAPTAIN", "VICE_CAPTAIN"]);

export async function requireRideEditor(slug: string, rideId: string) {
  const session = await requireSession(`/guilds/${slug}/rides/${rideId}/edit`);
  const membership = session.user.communityMemberships.find(({ community }) => community.slug === slug);
  const managesGuildRides = membership?.roles.some(({ role }) => role === "OWNER" || role === "ADMIN" || role === "RIDE_MANAGER");
  if (managesGuildRides) return { session, membership, access: "GUILD" as const };

  const assignment = await db.rideStaffAssignment.findFirst({
    where: {
      rideId,
      userId: session.userId,
      role: { in: Array.from(RIDE_EDITOR_STAFF_ROLES) as Array<"LEAD_CAPTAIN" | "CAPTAIN" | "VICE_CAPTAIN"> },
      ride: { community: { slug } },
    },
    select: { id: true, role: true },
  });
  if (!assignment) redirect("/account?access=denied");
  return { session, membership, assignment, access: "RIDE_STAFF" as const };
}
