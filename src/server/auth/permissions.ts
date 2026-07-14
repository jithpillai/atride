type RoleEntry = { role: string };
type MembershipWithRoles = { roles: RoleEntry[] } | null | undefined;
type RideStaffEntry = { userId: string; role: string };

const GUILD_MANAGEMENT_ROLES = new Set([
  "OWNER",
  "ADMIN",
  "RIDE_MANAGER",
  "FINANCE",
  "MEMBER_MANAGER",
]);

const GUILD_RIDE_MANAGEMENT_ROLES = new Set(["OWNER", "ADMIN", "RIDE_MANAGER"]);
const RIDE_EDITOR_STAFF_ROLES = new Set(["LEAD_CAPTAIN", "CAPTAIN", "VICE_CAPTAIN"]);

function hasAnyRole(membership: MembershipWithRoles, allowedRoles: Set<string>) {
  return Boolean(membership?.roles.some(({ role }) => allowedRoles.has(role)));
}

export function canManageGuild(membership: MembershipWithRoles) {
  return hasAnyRole(membership, GUILD_MANAGEMENT_ROLES);
}

export function canManageGuildRides(membership: MembershipWithRoles) {
  return hasAnyRole(membership, GUILD_RIDE_MANAGEMENT_ROLES);
}

export function canEditAssignedRide(
  assignments: RideStaffEntry[],
  userId: string | null | undefined,
) {
  if (!userId) return false;
  return assignments.some(
    (assignment) =>
      assignment.userId === userId && RIDE_EDITOR_STAFF_ROLES.has(assignment.role),
  );
}

export function canEditRide(
  membership: MembershipWithRoles,
  assignments: RideStaffEntry[],
  userId: string | null | undefined,
) {
  return canManageGuildRides(membership) || canEditAssignedRide(assignments, userId);
}

export function rideEditorStaffRoles() {
  return Array.from(RIDE_EDITOR_STAFF_ROLES) as Array<
    "LEAD_CAPTAIN" | "CAPTAIN" | "VICE_CAPTAIN"
  >;
}
