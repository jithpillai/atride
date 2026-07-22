CREATE TYPE "EmailDeliveryStatus" AS ENUM (
  'NOT_TRACKED',
  'ACCEPTED',
  'DELIVERED',
  'DELAYED',
  'BOUNCED',
  'COMPLAINED',
  'REJECTED',
  'SUPPRESSED'
);

ALTER TABLE "notification_outbox_events"
  ADD COLUMN "provider_delivery_status" "EmailDeliveryStatus" NOT NULL DEFAULT 'NOT_TRACKED',
  ADD COLUMN "provider_status_updated_at" TIMESTAMPTZ(3);

UPDATE "notification_outbox_events"
SET "provider_delivery_status" = CASE
  WHEN "provider_message_id" LIKE 'suppressed:%' THEN 'SUPPRESSED'::"EmailDeliveryStatus"
  WHEN "provider_message_id" LIKE 'preference:%' THEN 'NOT_TRACKED'::"EmailDeliveryStatus"
  WHEN "provider_message_id" IS NOT NULL THEN 'ACCEPTED'::"EmailDeliveryStatus"
  ELSE 'NOT_TRACKED'::"EmailDeliveryStatus"
END,
"provider_status_updated_at" = COALESCE("delivered_at", "updated_at")
WHERE "status" = 'DELIVERED';

CREATE INDEX "notification_outbox_events_provider_message_id_idx"
  ON "notification_outbox_events"("provider_message_id");
CREATE INDEX "notification_outbox_events_provider_delivery_status_provider_status_updated_at_idx"
  ON "notification_outbox_events"("provider_delivery_status", "provider_status_updated_at");

CREATE TABLE "email_provider_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" VARCHAR(24) NOT NULL,
  "provider_event_id" VARCHAR(240) NOT NULL,
  "provider_message_id" VARCHAR(240),
  "event_type" VARCHAR(40) NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "processed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_provider_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_provider_events_provider_event_id_key"
  ON "email_provider_events"("provider_event_id");
CREATE INDEX "email_provider_events_provider_message_id_occurred_at_idx"
  ON "email_provider_events"("provider_message_id", "occurred_at");
CREATE INDEX "email_provider_events_created_at_idx"
  ON "email_provider_events"("created_at");

CREATE TABLE "email_suppressions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "normalized_email" VARCHAR(320) NOT NULL,
  "reason" VARCHAR(40) NOT NULL,
  "provider" VARCHAR(24) NOT NULL,
  "provider_event_id" VARCHAR(240) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_suppressions_normalized_email_key"
  ON "email_suppressions"("normalized_email");
CREATE INDEX "email_suppressions_reason_created_at_idx"
  ON "email_suppressions"("reason", "created_at");
