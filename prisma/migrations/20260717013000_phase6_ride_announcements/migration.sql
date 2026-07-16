ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'RIDE_ANNOUNCEMENT';

CREATE TYPE "RideAnnouncementUrgency" AS ENUM ('NORMAL', 'IMPORTANT', 'CRITICAL');

ALTER TABLE "ride_announcements"
  ADD COLUMN "title" VARCHAR(180),
  ADD COLUMN "urgency" "RideAnnouncementUrgency" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "requires_acknowledgement" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "published_at" TIMESTAMPTZ(3);

DROP INDEX IF EXISTS "ride_announcements_ride_id_created_at_idx";
CREATE INDEX "ride_announcements_ride_id_published_at_created_at_idx"
  ON "ride_announcements"("ride_id", "published_at", "created_at");

CREATE TABLE "ride_announcement_acknowledgements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "announcement_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "acknowledged_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ride_announcement_acknowledgements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ride_announcement_acknowledgements_announcement_id_user_id_key" UNIQUE ("announcement_id", "user_id"),
  CONSTRAINT "ride_announcement_acknowledgements_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "ride_announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ride_announcement_acknowledgements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ride_announcement_acknowledgements_user_id_acknowledged_at_idx"
  ON "ride_announcement_acknowledgements"("user_id", "acknowledged_at");
