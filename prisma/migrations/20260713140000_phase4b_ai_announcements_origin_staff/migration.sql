ALTER TABLE "ride_staff_assignments"
ADD COLUMN "origin_id" UUID;

ALTER TABLE "rides"
ADD COLUMN "vehicle_requirements" TEXT NOT NULL DEFAULT '';

UPDATE "rides"
SET "vehicle_requirements" = CASE "vehicle_type"::text
  WHEN 'BIKE' THEN 'Road-legal motorcycle in safe touring condition; full-face helmet and required riding gear.'
  WHEN 'CAR' THEN 'Road-legal car in safe touring condition with valid documents and required safety equipment.'
  WHEN 'SUV' THEN 'Road-legal SUV in safe touring condition with valid documents and required safety equipment.'
  WHEN 'JEEP' THEN 'Road-legal jeep in safe touring condition with valid documents and required safety equipment.'
  ELSE 'A road-legal vehicle suitable for the published route and conditions.'
END;

ALTER TABLE "ride_origins"
ADD COLUMN "route_summary" TEXT;

CREATE INDEX "ride_staff_assignments_ride_id_origin_id_idx"
ON "ride_staff_assignments"("ride_id", "origin_id");

ALTER TABLE "ride_staff_assignments"
ADD CONSTRAINT "ride_staff_assignments_origin_id_fkey"
FOREIGN KEY ("origin_id") REFERENCES "ride_origins"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ride_ai_generations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ride_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "model" VARCHAR(120) NOT NULL,
  "status" VARCHAR(24) NOT NULL,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "sections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "error_code" VARCHAR(80),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ride_ai_generations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ride_ai_generations_ride_id_created_at_idx"
ON "ride_ai_generations"("ride_id", "created_at");

CREATE INDEX "ride_ai_generations_user_id_created_at_idx"
ON "ride_ai_generations"("user_id", "created_at");

ALTER TABLE "ride_ai_generations"
ADD CONSTRAINT "ride_ai_generations_ride_id_fkey"
FOREIGN KEY ("ride_id") REFERENCES "rides"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ride_ai_generations"
ADD CONSTRAINT "ride_ai_generations_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ride_announcements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ride_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "source_version" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ride_announcements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ride_announcements_ride_id_created_at_idx"
ON "ride_announcements"("ride_id", "created_at");

ALTER TABLE "ride_announcements"
ADD CONSTRAINT "ride_announcements_ride_id_fkey"
FOREIGN KEY ("ride_id") REFERENCES "rides"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ride_announcements"
ADD CONSTRAINT "ride_announcements_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "community_embed_origins" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "community_id" UUID NOT NULL,
  "origin" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_embed_origins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_embed_origins_community_id_origin_key"
ON "community_embed_origins"("community_id", "origin");

ALTER TABLE "community_embed_origins"
ADD CONSTRAINT "community_embed_origins_community_id_fkey"
FOREIGN KEY ("community_id") REFERENCES "communities"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
