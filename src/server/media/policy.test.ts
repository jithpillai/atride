import { describe, expect, it } from "vitest";

import { ALLOWED_IMAGE_FORMATS, isSupportedMediaPurpose, MEDIA_POLICY } from "./policy";

describe("media policy", () => {
  it("accepts only the implemented Phase 3A purposes", () => {
    expect(isSupportedMediaPurpose("USER_AVATAR")).toBe(true);
    expect(isSupportedMediaPurpose("GUILD_GALLERY")).toBe(true);
    expect(isSupportedMediaPurpose("PAYMENT_PROOF")).toBe(false);
  });

  it("keeps avatars smaller than Guild cover and gallery images", () => {
    expect(MEDIA_POLICY.USER_AVATAR.maxBytes).toBe(5 * 1024 * 1024);
    expect(MEDIA_POLICY.GUILD_COVER.maxBytes).toBe(10 * 1024 * 1024);
  });

  it("rejects executable SVG uploads", () => {
    expect(ALLOWED_IMAGE_FORMATS.has("svg")).toBe(false);
    expect(ALLOWED_IMAGE_FORMATS.has("webp")).toBe(true);
  });
});
