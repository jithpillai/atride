-- Preserve invitation history while allowing only one pending invitation per Guild/email/role.
DROP INDEX "community_invitations_community_id_invited_email_role_status_key";

CREATE INDEX "community_invitations_community_id_invited_email_role_status_idx"
  ON "community_invitations"("community_id", "invited_email", "role", "status");

CREATE UNIQUE INDEX "community_invitations_one_pending_per_role"
  ON "community_invitations"("community_id", "invited_email", "role")
  WHERE "status" = 'PENDING';
