-- Phase 4A: canonical ride package, multi-origin plan, accommodation, and policies.
CREATE TYPE "RidePackageItemType" AS ENUM ('INCLUSION', 'EXCLUSION', 'ADD_ON', 'MEAL', 'ACTIVITY');
CREATE TYPE "RidePolicyType" AS ENUM ('SAFETY', 'PAYMENT', 'CANCELLATION', 'REPLACEMENT', 'PROPERTY_CONDUCT', 'WAIVER');

ALTER TABLE "rides"
  ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "confirmation_deposit_paise" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "balance_due_at" TIMESTAMPTZ(3),
  ADD COLUMN "registration_closes_at" TIMESTAMPTZ(3),
  ADD COLUMN "buffer_slots" INTEGER NOT NULL DEFAULT 0;

UPDATE "rides" SET "description" = "summary" WHERE "description" = '';

ALTER TABLE "rides"
  ADD CONSTRAINT "rides_nonnegative_capacity_check" CHECK ("total_slots" >= 1 AND "booked_slots" >= 0 AND "buffer_slots" >= 0),
  ADD CONSTRAINT "rides_booking_within_capacity_check" CHECK ("booked_slots" <= "total_slots" + "buffer_slots"),
  ADD CONSTRAINT "rides_nonnegative_price_check" CHECK ("price_paise" >= 0 AND "confirmation_deposit_paise" >= 0 AND "confirmation_deposit_paise" <= "price_paise"),
  ADD CONSTRAINT "rides_valid_dates_check" CHECK ("ends_at" > "starts_at");

CREATE TABLE "ride_origins" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "ride_id" UUID NOT NULL,
  "city" VARCHAR(120) NOT NULL, "meeting_point" VARCHAR(240) NOT NULL,
  "departure_at" TIMESTAMPTZ(3) NOT NULL, "capacity" INTEGER NOT NULL,
  "buffer_capacity" INTEGER NOT NULL DEFAULT 0, "merge_point" VARCHAR(240),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ride_origins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ride_origins_capacity_check" CHECK ("capacity" >= 1 AND "buffer_capacity" >= 0)
);
CREATE INDEX "ride_origins_ride_id_sort_order_idx" ON "ride_origins"("ride_id", "sort_order");

CREATE TABLE "ride_itinerary_days" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "ride_id" UUID NOT NULL,
  "day_number" INTEGER NOT NULL, "date" DATE NOT NULL,
  "title" VARCHAR(180) NOT NULL, "summary" TEXT NOT NULL,
  CONSTRAINT "ride_itinerary_days_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ride_itinerary_days_day_check" CHECK ("day_number" >= 1)
);
CREATE UNIQUE INDEX "ride_itinerary_days_ride_id_day_number_key" ON "ride_itinerary_days"("ride_id", "day_number");

CREATE TABLE "ride_accommodations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "ride_id" UUID NOT NULL,
  "property_name" VARCHAR(180) NOT NULL, "locality" VARCHAR(180) NOT NULL,
  "check_in_at" TIMESTAMPTZ(3) NOT NULL, "check_out_at" TIMESTAMPTZ(3) NOT NULL,
  "room_summary" TEXT NOT NULL, "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "participant_note" TEXT, "exact_location_restricted" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ride_accommodations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ride_accommodations_dates_check" CHECK ("check_out_at" > "check_in_at")
);
CREATE INDEX "ride_accommodations_ride_id_check_in_at_idx" ON "ride_accommodations"("ride_id", "check_in_at");

CREATE TABLE "ride_package_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "ride_id" UUID NOT NULL,
  "type" "RidePackageItemType" NOT NULL, "day_number" INTEGER,
  "title" VARCHAR(180) NOT NULL, "description" TEXT, "price_paise" INTEGER,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ride_package_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ride_package_items_day_check" CHECK ("day_number" IS NULL OR "day_number" >= 1),
  CONSTRAINT "ride_package_items_price_check" CHECK ("price_paise" IS NULL OR "price_paise" >= 0)
);
CREATE INDEX "ride_package_items_ride_id_type_sort_order_idx" ON "ride_package_items"("ride_id", "type", "sort_order");

CREATE TABLE "ride_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "ride_id" UUID NOT NULL,
  "type" "RidePolicyType" NOT NULL, "title" VARCHAR(180) NOT NULL,
  "content" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ride_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ride_policies_version_check" CHECK ("version" >= 1)
);
CREATE UNIQUE INDEX "ride_policies_ride_id_type_version_key" ON "ride_policies"("ride_id", "type", "version");

ALTER TABLE "ride_origins" ADD CONSTRAINT "ride_origins_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ride_itinerary_days" ADD CONSTRAINT "ride_itinerary_days_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ride_accommodations" ADD CONSTRAINT "ride_accommodations_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ride_package_items" ADD CONSTRAINT "ride_package_items_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ride_policies" ADD CONSTRAINT "ride_policies_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
