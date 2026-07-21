ALTER TABLE "rides"
  ADD COLUMN "whatsapp_invite_encrypted" TEXT,
  ADD COLUMN "whatsapp_invite_updated_at" TIMESTAMPTZ(3);

CREATE TABLE "user_notification_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "email_ride_reminders" BOOLEAN NOT NULL DEFAULT true,
  "email_routine_announcements" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_notification_preferences_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "user_notification_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
