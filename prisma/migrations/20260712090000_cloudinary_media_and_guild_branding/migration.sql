CREATE TYPE "MediaPurpose" AS ENUM ('USER_AVATAR', 'GUILD_LOGO', 'GUILD_COVER', 'GUILD_GALLERY', 'RIDE_COVER', 'RIDE_GALLERY', 'PAYMENT_PROOF');

CREATE TYPE "MediaAccess" AS ENUM ('PUBLIC', 'AUTHENTICATED', 'PRIVATE');

CREATE TABLE "media_assets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "uploader_user_id" UUID NOT NULL,
  "community_id" UUID,
  "purpose" "MediaPurpose" NOT NULL,
  "access" "MediaAccess" NOT NULL DEFAULT 'PUBLIC',
  "provider" VARCHAR(32) NOT NULL DEFAULT 'CLOUDINARY',
  "public_id" VARCHAR(500) NOT NULL,
  "version" INTEGER NOT NULL,
  "resource_type" VARCHAR(32) NOT NULL DEFAULT 'image',
  "delivery_type" VARCHAR(32) NOT NULL DEFAULT 'upload',
  "format" VARCHAR(24) NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "bytes" INTEGER,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "participant_profiles" ADD COLUMN "avatar_asset_id" UUID;
ALTER TABLE "communities" ADD COLUMN "logo_asset_id" UUID;
ALTER TABLE "communities" ADD COLUMN "cover_asset_id" UUID;

CREATE UNIQUE INDEX "media_assets_public_id_key" ON "media_assets"("public_id");
CREATE INDEX "media_assets_community_id_purpose_sort_order_idx" ON "media_assets"("community_id", "purpose", "sort_order");
CREATE INDEX "media_assets_uploader_user_id_purpose_idx" ON "media_assets"("uploader_user_id", "purpose");
CREATE UNIQUE INDEX "participant_profiles_avatar_asset_id_key" ON "participant_profiles"("avatar_asset_id");
CREATE UNIQUE INDEX "communities_logo_asset_id_key" ON "communities"("logo_asset_id");
CREATE UNIQUE INDEX "communities_cover_asset_id_key" ON "communities"("cover_asset_id");

ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploader_user_id_fkey" FOREIGN KEY ("uploader_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "participant_profiles" ADD CONSTRAINT "participant_profiles_avatar_asset_id_fkey" FOREIGN KEY ("avatar_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communities" ADD CONSTRAINT "communities_logo_asset_id_fkey" FOREIGN KEY ("logo_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communities" ADD CONSTRAINT "communities_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
