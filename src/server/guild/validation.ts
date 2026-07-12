export const STAFF_ROLE_VALUES = ["ADMIN", "RIDE_MANAGER", "FINANCE", "MEMBER_MANAGER"] as const;
export type StaffRole = typeof STAFF_ROLE_VALUES[number];

export function isStaffRole(value: string): value is StaffRole {
  return STAFF_ROLE_VALUES.includes(value as StaffRole);
}

export function parseOperatingCities(value: string, homeCity: string) {
  const seen = new Set([homeCity.trim().toLocaleLowerCase("en-IN")]);
  return value.split(",").map((city) => city.trim()).filter((city) => {
    const key = city.toLocaleLowerCase("en-IN");
    if (!city || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

export function normalizeOptionalHttpsUrl(value: string) {
  const candidate = value.trim();
  if (!candidate) return null;
  const parsed = new URL(candidate);
  if (parsed.protocol !== "https:") throw new Error("Only HTTPS links are allowed.");
  return parsed.toString();
}
