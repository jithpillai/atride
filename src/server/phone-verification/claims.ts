function normalizePhone(value: string) {
  const normalized = value.replace(/[\s()-]/g, "");
  if (!normalized) return null;
  if (/^\d{10}$/.test(normalized)) return `+91${normalized}`;
  if (/^91\d{10}$/.test(normalized)) return `+${normalized}`;
  return normalized;
}

export function isSupportedIndianMobile(phone: string | null): phone is string {
  return Boolean(phone && /^\+91[6-9]\d{9}$/.test(phone));
}

export function verifiedFirebasePhone(claims: {
  phone_number?: string;
  auth_time?: number;
  firebase?: { sign_in_provider?: string };
}, nowSeconds = Math.floor(Date.now() / 1000)) {
  const phone = normalizePhone(claims.phone_number ?? "");
  if (claims.firebase?.sign_in_provider !== "phone") return null;
  if (!claims.auth_time || nowSeconds - claims.auth_time > 5 * 60 || claims.auth_time > nowSeconds + 30) return null;
  return isSupportedIndianMobile(phone) ? phone : null;
}
