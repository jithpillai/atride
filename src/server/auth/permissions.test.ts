import { describe, expect, it } from "vitest";

import {
  canEditAssignedRide,
  canEditRide,
  canManageGuild,
  canManageGuildRides,
} from "./permissions";

const membership = (...roles: string[]) => ({ roles: roles.map((role) => ({ role })) });

describe("role-aware management shortcuts", () => {
  it("allows all Guild workspace management roles", () => {
    expect(canManageGuild(membership("OWNER"))).toBe(true);
    expect(canManageGuild(membership("FINANCE"))).toBe(true);
    expect(canManageGuild(membership("MEMBER"))).toBe(false);
    expect(canManageGuild(undefined)).toBe(false);
  });

  it("limits Guild-wide ride editing to ride management roles", () => {
    expect(canManageGuildRides(membership("ADMIN"))).toBe(true);
    expect(canManageGuildRides(membership("RIDE_MANAGER"))).toBe(true);
    expect(canManageGuildRides(membership("FINANCE"))).toBe(false);
  });

  it("allows assigned ride leaders but not operational support roles", () => {
    const assignments = [
      { userId: "captain", role: "CAPTAIN" },
      { userId: "sweep", role: "SWEEP" },
    ];

    expect(canEditAssignedRide(assignments, "captain")).toBe(true);
    expect(canEditAssignedRide(assignments, "sweep")).toBe(false);
    expect(canEditAssignedRide(assignments, "someone-else")).toBe(false);
  });

  it("combines Guild and ride-specific editor access", () => {
    expect(canEditRide(membership("RIDE_MANAGER"), [], "manager")).toBe(true);
    expect(
      canEditRide(membership("MEMBER"), [{ userId: "vice", role: "VICE_CAPTAIN" }], "vice"),
    ).toBe(true);
    expect(canEditRide(membership("MEMBER"), [], "member")).toBe(false);
  });
});
