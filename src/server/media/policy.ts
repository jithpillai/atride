export const MEDIA_PURPOSES = ["USER_AVATAR", "GUILD_LOGO", "GUILD_COVER", "GUILD_GALLERY", "RIDE_COVER", "RIDE_GALLERY", "PAYMENT_PROOF"] as const;
export type SupportedMediaPurpose = typeof MEDIA_PURPOSES[number];

export const MEDIA_POLICY: Record<SupportedMediaPurpose, { maxBytes: number; label: string }> = {
  USER_AVATAR: { maxBytes: 5 * 1024 * 1024, label: "profile image" },
  GUILD_LOGO: { maxBytes: 5 * 1024 * 1024, label: "Guild logo" },
  GUILD_COVER: { maxBytes: 10 * 1024 * 1024, label: "Guild cover" },
  GUILD_GALLERY: { maxBytes: 10 * 1024 * 1024, label: "Guild gallery image" },
  RIDE_COVER: { maxBytes: 10 * 1024 * 1024, label: "ride cover" },
  RIDE_GALLERY: { maxBytes: 10 * 1024 * 1024, label: "ride gallery image" },
  PAYMENT_PROOF: { maxBytes: 5 * 1024 * 1024, label: "payment proof" },
};

export const ALLOWED_IMAGE_FORMATS = new Set(["jpg", "jpeg", "png", "webp"]);

export function isSupportedMediaPurpose(value: string): value is SupportedMediaPurpose {
  return MEDIA_PURPOSES.includes(value as SupportedMediaPurpose);
}
