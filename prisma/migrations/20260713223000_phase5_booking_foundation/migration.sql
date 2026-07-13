-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'WAITLISTED', 'EXPIRED', 'CANCELLED', 'PAYMENT_REJECTED', 'TRANSFER_PENDING', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "BookingOccupantRole" AS ENUM ('RIDER', 'PILLION', 'DRIVER', 'PASSENGER', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingPaymentMethod" AS ENUM ('UPI', 'BANK_TRANSFER', 'CASH');

-- CreateEnum
CREATE TYPE "BookingPaymentPurpose" AS ENUM ('CONFIRMATION_DEPOSIT', 'BALANCE', 'FULL_PAYMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "ride_bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ride_id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "origin_id" UUID,
    "vehicle_id" UUID,
    "status" "BookingStatus" NOT NULL DEFAULT 'RESERVED',
    "occupant_role" "BookingOccupantRole" NOT NULL DEFAULT 'RIDER',
    "dietary_preference" VARCHAR(120),
    "accessibility_notes" TEXT,
    "accommodation_selection" VARCHAR(240),
    "seat_count" SMALLINT NOT NULL DEFAULT 1,
    "base_price_paise" INTEGER NOT NULL,
    "add_on_total_paise" INTEGER NOT NULL DEFAULT 0,
    "total_price_paise" INTEGER NOT NULL,
    "confirmation_deposit_paise" INTEGER NOT NULL DEFAULT 0,
    "balance_due_paise" INTEGER NOT NULL DEFAULT 0,
    "reservation_expires_at" TIMESTAMPTZ(3),
    "waiver_accepted_at" TIMESTAMPTZ(3) NOT NULL,
    "commercial_terms_accepted_at" TIMESTAMPTZ(3) NOT NULL,
    "newcomer_display_consent_at" TIMESTAMPTZ(3),
    "package_snapshot" JSONB NOT NULL,
    "confirmed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ride_bookings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ride_bookings_one_seat_check" CHECK ("seat_count" = 1),
    CONSTRAINT "ride_bookings_price_check" CHECK (
      "base_price_paise" >= 0 AND "add_on_total_paise" >= 0 AND
      "total_price_paise" = "base_price_paise" + "add_on_total_paise" AND
      "confirmation_deposit_paise" >= 0 AND "balance_due_paise" >= 0 AND
      "confirmation_deposit_paise" + "balance_due_paise" = "total_price_paise"
    )
);

-- CreateTable
CREATE TABLE "booking_add_ons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "package_item_id" UUID NOT NULL,
    "title_snapshot" VARCHAR(180) NOT NULL,
    "description_snapshot" TEXT,
    "price_paise" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_add_ons_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_add_ons_price_check" CHECK ("price_paise" >= 0)
);

-- CreateTable
CREATE TABLE "booking_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "purpose" "BookingPaymentPurpose" NOT NULL,
    "method" "BookingPaymentMethod" NOT NULL,
    "status" "BookingPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount_paise" INTEGER NOT NULL,
    "payer_reference" VARCHAR(180),
    "participant_note" TEXT,
    "proof_asset_id" UUID,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "booking_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_payments_amount_check" CHECK ("amount_paise" > 0)
);

-- CreateIndex
CREATE INDEX "ride_bookings_ride_id_status_reservation_expires_at_idx" ON "ride_bookings"("ride_id", "status", "reservation_expires_at");
CREATE INDEX "ride_bookings_community_id_status_created_at_idx" ON "ride_bookings"("community_id", "status", "created_at");
CREATE INDEX "ride_bookings_user_id_status_created_at_idx" ON "ride_bookings"("user_id", "status", "created_at");
CREATE UNIQUE INDEX "ride_bookings_ride_id_user_id_key" ON "ride_bookings"("ride_id", "user_id");
CREATE UNIQUE INDEX "booking_add_ons_booking_id_package_item_id_key" ON "booking_add_ons"("booking_id", "package_item_id");
CREATE UNIQUE INDEX "booking_payments_proof_asset_id_key" ON "booking_payments"("proof_asset_id");
CREATE INDEX "booking_payments_booking_id_status_created_at_idx" ON "booking_payments"("booking_id", "status", "created_at");
CREATE INDEX "booking_payments_status_created_at_idx" ON "booking_payments"("status", "created_at");

-- AddForeignKey
ALTER TABLE "ride_bookings" ADD CONSTRAINT "ride_bookings_ride_id_community_id_fkey" FOREIGN KEY ("ride_id", "community_id") REFERENCES "rides"("id", "community_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ride_bookings" ADD CONSTRAINT "ride_bookings_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ride_bookings" ADD CONSTRAINT "ride_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ride_bookings" ADD CONSTRAINT "ride_bookings_origin_id_fkey" FOREIGN KEY ("origin_id") REFERENCES "ride_origins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ride_bookings" ADD CONSTRAINT "ride_bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking_add_ons" ADD CONSTRAINT "booking_add_ons_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "ride_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_add_ons" ADD CONSTRAINT "booking_add_ons_package_item_id_fkey" FOREIGN KEY ("package_item_id") REFERENCES "ride_package_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "ride_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_proof_asset_id_fkey" FOREIGN KEY ("proof_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
