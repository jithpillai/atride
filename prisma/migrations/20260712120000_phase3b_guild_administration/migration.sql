-- Phase 3B: Guild staff invitations, configurable presentation, and audit history.
CREATE TYPE "CommunityInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

ALTER TABLE "communities"
  ADD COLUMN "website_url" VARCHAR(500),
  ADD COLUMN "instagram_url" VARCHAR(500),
  ADD COLUMN "whatsapp_url" VARCHAR(500),
  ADD COLUMN "newcomer_display_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "awards_display_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "community_invitations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "community_id" UUID NOT NULL,
  "invited_email" VARCHAR(320) NOT NULL,
  "role" "CommunityRole" NOT NULL,
  "status" "CommunityInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "invited_by_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "accepted_at" TIMESTAMPTZ(3),
  "revoked_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "community_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_invitations_community_id_invited_email_role_status_key"
  ON "community_invitations"("community_id", "invited_email", "role", "status");
CREATE INDEX "community_invitations_invited_email_status_expires_at_idx"
  ON "community_invitations"("invited_email", "status", "expires_at");

CREATE TABLE "community_audit_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "community_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "action" VARCHAR(80) NOT NULL,
  "target_user_id" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "community_audit_events_community_id_created_at_idx"
  ON "community_audit_events"("community_id", "created_at");

ALTER TABLE "community_invitations"
  ADD CONSTRAINT "community_invitations_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "community_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "community_audit_events"
  ADD CONSTRAINT "community_audit_events_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "community_audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
