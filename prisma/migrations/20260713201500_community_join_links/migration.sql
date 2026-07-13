CREATE TABLE "community_join_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "community_id" UUID NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "created_by_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3),
    "max_uses" INTEGER,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "community_join_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "community_join_links_community_id_revoked_at_expires_at_idx"
ON "community_join_links"("community_id", "revoked_at", "expires_at");

ALTER TABLE "community_join_links" ADD CONSTRAINT "community_join_links_community_id_fkey"
FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_join_links" ADD CONSTRAINT "community_join_links_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
