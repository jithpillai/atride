ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'BOOKING_RESERVED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'BOOKING_WAITLISTED';

CREATE TABLE "notification_inbox_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_key" VARCHAR(240) NOT NULL,
  "event_type" "NotificationEventType" NOT NULL,
  "community_id" UUID NOT NULL,
  "booking_id" UUID,
  "recipient_user_id" UUID NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "body" VARCHAR(500) NOT NULL,
  "action_url" VARCHAR(500),
  "read_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notification_inbox_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_inbox_items_event_key_key" UNIQUE ("event_key"),
  CONSTRAINT "notification_inbox_items_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notification_inbox_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "ride_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notification_inbox_items_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notification_inbox_items_recipient_user_id_read_at_created_at_idx"
  ON "notification_inbox_items"("recipient_user_id", "read_at", "created_at");

CREATE INDEX "notification_inbox_items_community_id_created_at_idx"
  ON "notification_inbox_items"("community_id", "created_at");
