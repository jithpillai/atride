CREATE TABLE "community_payment_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "community_id" UUID NOT NULL,
  "upi_enabled" BOOLEAN NOT NULL DEFAULT false,
  "upi_vpa" VARCHAR(130),
  "upi_payee_name" VARCHAR(120),
  "participant_instructions" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "community_payment_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_payment_settings_community_id_key"
  ON "community_payment_settings"("community_id");

ALTER TABLE "community_payment_settings"
  ADD CONSTRAINT "community_payment_settings_community_id_fkey"
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_payments"
  ADD COLUMN "payee_vpa_snapshot" VARCHAR(130),
  ADD COLUMN "payee_name_snapshot" VARCHAR(120),
  ADD COLUMN "payee_instructions_snapshot" TEXT;

ALTER TABLE "community_payment_settings"
  ADD CONSTRAINT "community_payment_settings_enabled_recipient_check"
  CHECK (
    NOT "upi_enabled"
    OR (
      "upi_vpa" IS NOT NULL AND length(trim("upi_vpa")) >= 5
      AND "upi_payee_name" IS NOT NULL AND length(trim("upi_payee_name")) >= 2
    )
  );
