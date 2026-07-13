-- Phase 4 ride cover and gallery media.
ALTER TABLE "rides" ADD COLUMN "cover_asset_id" UUID;
ALTER TABLE "media_assets" ADD COLUMN "ride_id" UUID;

CREATE UNIQUE INDEX "rides_cover_asset_id_key" ON "rides"("cover_asset_id");
CREATE INDEX "media_assets_ride_id_purpose_sort_order_idx" ON "media_assets"("ride_id", "purpose", "sort_order");

ALTER TABLE "rides" ADD CONSTRAINT "rides_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
