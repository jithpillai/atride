-- Payment obligations keep their own due and submission timestamps.
ALTER TABLE "booking_payments"
  ADD COLUMN "due_at" TIMESTAMPTZ(3),
  ADD COLUMN "submitted_at" TIMESTAMPTZ(3);

UPDATE "booking_payments"
SET "submitted_at" = "updated_at"
WHERE "status" = 'SUBMITTED';

UPDATE "booking_payments" AS payment
SET "due_at" = CASE
  WHEN payment."purpose" = 'BALANCE' THEN COALESCE(ride."balance_due_at", ride."registration_closes_at", ride."starts_at")
  ELSE COALESCE(booking."reservation_expires_at", ride."registration_closes_at", payment."created_at")
END
FROM "ride_bookings" AS booking
JOIN "rides" AS ride ON ride."id" = booking."ride_id"
WHERE payment."booking_id" = booking."id";

-- Existing Phase 5 bookings receive the balance obligation that was already
-- represented in their immutable monetary snapshot.
INSERT INTO "booking_payments" (
  "id", "booking_id", "purpose", "method", "status", "amount_paise",
  "due_at", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(), booking."id", 'BALANCE',
  COALESCE(source_payment."method", 'UPI'::"BookingPaymentMethod"),
  'PENDING', booking."balance_due_paise",
  COALESCE(ride."balance_due_at", ride."registration_closes_at", ride."starts_at"),
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "ride_bookings" AS booking
JOIN "rides" AS ride ON ride."id" = booking."ride_id"
LEFT JOIN LATERAL (
  SELECT payment."method"
  FROM "booking_payments" AS payment
  WHERE payment."booking_id" = booking."id"
  ORDER BY payment."created_at" ASC
  LIMIT 1
) AS source_payment ON TRUE
WHERE booking."balance_due_paise" > 0
  AND booking."status" IN ('RESERVED', 'CONFIRMED', 'PAYMENT_REJECTED', 'TRANSFER_PENDING')
  AND NOT EXISTS (
    SELECT 1 FROM "booking_payments" AS existing
    WHERE existing."booking_id" = booking."id" AND existing."purpose" = 'BALANCE'
  );

CREATE TYPE "NotificationEventType" AS ENUM (
  'BOOKING_PAYMENT_SUBMITTED',
  'BOOKING_PAYMENT_CONFIRMED',
  'BOOKING_PAYMENT_REJECTED'
);

CREATE TYPE "NotificationOutboxStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'DELIVERED',
  'FAILED'
);

CREATE TABLE "notification_outbox_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_type" "NotificationEventType" NOT NULL,
  "event_key" VARCHAR(240) NOT NULL,
  "community_id" UUID NOT NULL,
  "booking_payment_id" UUID NOT NULL,
  "recipient_user_id" UUID NOT NULL,
  "recipient_email" VARCHAR(320) NOT NULL,
  "recipient_name" VARCHAR(120) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locked_at" TIMESTAMPTZ(3),
  "delivered_at" TIMESTAMPTZ(3),
  "provider_message_id" VARCHAR(240),
  "last_error" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "notification_outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_outbox_events_event_key_key"
  ON "notification_outbox_events"("event_key");
CREATE INDEX "notification_outbox_events_status_available_at_created_at_idx"
  ON "notification_outbox_events"("status", "available_at", "created_at");
CREATE INDEX "notification_outbox_events_community_id_event_type_created_at_idx"
  ON "notification_outbox_events"("community_id", "event_type", "created_at");
CREATE INDEX "notification_outbox_events_booking_payment_id_event_type_idx"
  ON "notification_outbox_events"("booking_payment_id", "event_type");

ALTER TABLE "notification_outbox_events"
  ADD CONSTRAINT "notification_outbox_events_community_id_fkey"
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_outbox_events"
  ADD CONSTRAINT "notification_outbox_events_booking_payment_id_fkey"
  FOREIGN KEY ("booking_payment_id") REFERENCES "booking_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_outbox_events"
  ADD CONSTRAINT "notification_outbox_events_recipient_user_id_fkey"
  FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
