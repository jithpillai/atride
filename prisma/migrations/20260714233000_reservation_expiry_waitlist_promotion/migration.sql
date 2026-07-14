ALTER TYPE "NotificationEventType" ADD VALUE 'BOOKING_RESERVATION_EXPIRED';
ALTER TYPE "NotificationEventType" ADD VALUE 'BOOKING_WAITLIST_PROMOTED';

ALTER TABLE "ride_bookings"
  ADD COLUMN "payment_method_preference" "BookingPaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER';

UPDATE "ride_bookings" AS booking
SET "payment_method_preference" = (
  SELECT payment."method"
  FROM "booking_payments" AS payment
  WHERE payment."booking_id" = booking."id"
  ORDER BY payment."created_at" ASC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM "booking_payments" AS payment
  WHERE payment."booking_id" = booking."id"
);

ALTER TABLE "notification_outbox_events"
  ALTER COLUMN "booking_payment_id" DROP NOT NULL,
  ADD COLUMN "booking_id" UUID;

CREATE INDEX "notification_outbox_events_booking_id_event_type_idx"
  ON "notification_outbox_events"("booking_id", "event_type");

ALTER TABLE "notification_outbox_events"
  ADD CONSTRAINT "notification_outbox_events_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "ride_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
