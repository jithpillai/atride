CREATE TYPE "PhoneVerificationProvider" AS ENUM ('FIREBASE');

CREATE TYPE "PhoneVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

ALTER TABLE "participant_profiles"
ADD COLUMN "phone_verification_provider" "PhoneVerificationProvider";

CREATE TABLE "phone_verification_challenges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "provider" "PhoneVerificationProvider" NOT NULL DEFAULT 'FIREBASE',
  "status" "PhoneVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "normalized_phone" VARCHAR(24) NOT NULL,
  "token_hash" VARCHAR(128) NOT NULL,
  "request_ip_hash" VARCHAR(128),
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "consumed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "phone_verification_challenges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "phone_verification_challenges_token_hash_key"
ON "phone_verification_challenges"("token_hash");

CREATE INDEX "phone_verification_challenges_user_id_status_created_at_idx"
ON "phone_verification_challenges"("user_id", "status", "created_at");

CREATE INDEX "phone_verification_challenges_normalized_phone_created_at_idx"
ON "phone_verification_challenges"("normalized_phone", "created_at");

CREATE INDEX "phone_verification_challenges_expires_at_idx"
ON "phone_verification_challenges"("expires_at");

ALTER TABLE "phone_verification_challenges"
ADD CONSTRAINT "phone_verification_challenges_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
