CREATE TYPE "RideDisruptionType" AS ENUM ('POSTPONEMENT', 'CANCELLATION');
CREATE TYPE "RideDisruptionStatus" AS ENUM ('ACTIVE', 'RESOLVED');
CREATE TYPE "BookingRefundStatus" AS ENUM ('REVIEW_REQUIRED', 'PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED');

ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'RIDE_POSTPONED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'RIDE_CANCELLED';

CREATE TABLE "ride_disruptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "community_id" UUID NOT NULL,
  "ride_id" UUID NOT NULL,
  "type" "RideDisruptionType" NOT NULL,
  "status" "RideDisruptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "reason" TEXT NOT NULL,
  "proposed_resume_at" TIMESTAMPTZ(3),
  "created_by_id" UUID NOT NULL,
  "resolved_at" TIMESTAMPTZ(3),
  "resolution_note" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ride_disruptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ride_disruptions_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ride_disruptions_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ride_disruptions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ride_disruptions_ride_id_status_created_at_idx" ON "ride_disruptions"("ride_id", "status", "created_at");
CREATE INDEX "ride_disruptions_community_id_type_created_at_idx" ON "ride_disruptions"("community_id", "type", "created_at");

CREATE TABLE "booking_refunds" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL,
  "community_id" UUID NOT NULL,
  "ride_disruption_id" UUID,
  "status" "BookingRefundStatus" NOT NULL,
  "confirmed_amount_paise" INTEGER NOT NULL DEFAULT 0,
  "submitted_amount_paise" INTEGER NOT NULL DEFAULT 0,
  "refunded_amount_paise" INTEGER NOT NULL DEFAULT 0,
  "reference" VARCHAR(180),
  "note" TEXT,
  "reviewed_by_id" UUID,
  "reviewed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "booking_refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "booking_refunds_booking_id_key" UNIQUE ("booking_id"),
  CONSTRAINT "booking_refunds_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "ride_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "booking_refunds_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "booking_refunds_ride_disruption_id_fkey" FOREIGN KEY ("ride_disruption_id") REFERENCES "ride_disruptions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "booking_refunds_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "booking_refunds_amounts_check" CHECK ("confirmed_amount_paise" >= 0 AND "submitted_amount_paise" >= 0 AND "refunded_amount_paise" >= 0 AND "refunded_amount_paise" <= "confirmed_amount_paise")
);

CREATE INDEX "booking_refunds_community_id_status_created_at_idx" ON "booking_refunds"("community_id", "status", "created_at");
CREATE INDEX "booking_refunds_ride_disruption_id_status_idx" ON "booking_refunds"("ride_disruption_id", "status");
