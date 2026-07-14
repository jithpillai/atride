CREATE TYPE "AccommodationPricingMode" AS ENUM ('INCLUDED', 'PER_PERSON', 'PER_ROOM');

ALTER TABLE "ride_bookings"
  ADD COLUMN "accommodation_total_paise" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ride_accommodation_options" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "accommodation_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "pricing_mode" "AccommodationPricingMode" NOT NULL,
  "price_paise" INTEGER NOT NULL DEFAULT 0,
  "max_occupancy" SMALLINT NOT NULL DEFAULT 2,
  "available_rooms" SMALLINT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ride_accommodation_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ride_accommodation_options_accommodation_id_name_key"
  ON "ride_accommodation_options"("accommodation_id", "name");
CREATE INDEX "ride_accommodation_options_accommodation_id_sort_order_idx"
  ON "ride_accommodation_options"("accommodation_id", "sort_order");

ALTER TABLE "ride_accommodation_options"
  ADD CONSTRAINT "ride_accommodation_options_accommodation_id_fkey"
  FOREIGN KEY ("accommodation_id") REFERENCES "ride_accommodations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "booking_participants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL,
  "linked_user_id" UUID,
  "display_name" VARCHAR(120) NOT NULL,
  "role" "BookingOccupantRole" NOT NULL,
  "dietary_preference" VARCHAR(120),
  "accessibility_notes" TEXT,
  "emergency_contact_name" VARCHAR(120),
  "emergency_contact_phone" VARCHAR(32),
  "is_booking_lead" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booking_participants_booking_id_linked_user_id_key"
  ON "booking_participants"("booking_id", "linked_user_id");
CREATE INDEX "booking_participants_booking_id_sort_order_idx"
  ON "booking_participants"("booking_id", "sort_order");
CREATE INDEX "booking_participants_linked_user_id_created_at_idx"
  ON "booking_participants"("linked_user_id", "created_at");

ALTER TABLE "booking_participants"
  ADD CONSTRAINT "booking_participants_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "ride_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_participants"
  ADD CONSTRAINT "booking_participants_linked_user_id_fkey"
  FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "booking_participants" (
  "booking_id", "linked_user_id", "display_name", "role",
  "dietary_preference", "accessibility_notes", "is_booking_lead", "sort_order"
)
SELECT booking."id", booking."user_id", account."display_name", booking."occupant_role",
       booking."dietary_preference", booking."accessibility_notes", true, 0
FROM "ride_bookings" AS booking
JOIN "users" AS account ON account."id" = booking."user_id";

CREATE TABLE "booking_accommodation_selections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL,
  "accommodation_id" UUID NOT NULL,
  "option_id" UUID,
  "accommodation_name" VARCHAR(180) NOT NULL,
  "option_name" VARCHAR(160) NOT NULL,
  "pricing_mode_snapshot" "AccommodationPricingMode" NOT NULL,
  "unit_price_paise" INTEGER NOT NULL,
  "units" SMALLINT NOT NULL DEFAULT 1,
  "guest_count" SMALLINT NOT NULL,
  "total_price_paise" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_accommodation_selections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booking_accommodation_selections_booking_id_accommodation_id_key"
  ON "booking_accommodation_selections"("booking_id", "accommodation_id");
CREATE INDEX "booking_accommodation_selections_option_id_created_at_idx"
  ON "booking_accommodation_selections"("option_id", "created_at");

ALTER TABLE "booking_accommodation_selections"
  ADD CONSTRAINT "booking_accommodation_selections_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "ride_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_accommodation_selections"
  ADD CONSTRAINT "booking_accommodation_selections_option_id_fkey"
  FOREIGN KEY ("option_id") REFERENCES "ride_accommodation_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
