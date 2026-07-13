-- Guild-level reusable ride policies and optional origin capacity planning.
ALTER TABLE "ride_origins" ALTER COLUMN "capacity" DROP NOT NULL;
ALTER TABLE "ride_origins" DROP CONSTRAINT "ride_origins_capacity_check";
ALTER TABLE "ride_origins" ADD CONSTRAINT "ride_origins_capacity_check"
  CHECK (("capacity" IS NULL OR "capacity" >= 1) AND "buffer_capacity" >= 0);

CREATE TABLE "community_ride_policy_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "community_id" UUID NOT NULL,
  "type" "RidePolicyType" NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "content" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_ride_policy_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_ride_policy_templates_community_id_type_key"
  ON "community_ride_policy_templates"("community_id", "type");

ALTER TABLE "community_ride_policy_templates"
  ADD CONSTRAINT "community_ride_policy_templates_community_id_fkey"
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
