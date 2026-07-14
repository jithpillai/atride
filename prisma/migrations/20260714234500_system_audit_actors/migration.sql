-- Automated maintenance events must not be falsely attributed to a participant.
ALTER TABLE "community_audit_events"
  ALTER COLUMN "actor_user_id" DROP NOT NULL;
