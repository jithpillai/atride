CREATE TABLE "guild_welcome_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "membership_id" UUID NOT NULL,
    "consented_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "guild_welcome_consents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guild_welcome_consents_membership_id_key"
ON "guild_welcome_consents"("membership_id");

CREATE INDEX "guild_welcome_consents_revoked_at_consented_at_idx"
ON "guild_welcome_consents"("revoked_at", "consented_at");

ALTER TABLE "guild_welcome_consents"
ADD CONSTRAINT "guild_welcome_consents_membership_id_fkey"
FOREIGN KEY ("membership_id") REFERENCES "community_memberships"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve consent already captured on confirmed bookings. One durable consent
-- per Guild membership replaces ride-by-ride display state going forward.
INSERT INTO "guild_welcome_consents" (
    "id",
    "membership_id",
    "consented_at",
    "revoked_at",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    membership."id",
    MIN(booking."newcomer_display_consent_at"),
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ride_bookings" AS booking
INNER JOIN "community_memberships" AS membership
    ON membership."community_id" = booking."community_id"
   AND membership."user_id" = booking."user_id"
WHERE booking."status" = 'CONFIRMED'
  AND booking."newcomer_display_consent_at" IS NOT NULL
  AND membership."status" = 'ACTIVE'
GROUP BY membership."id"
ON CONFLICT ("membership_id") DO NOTHING;
