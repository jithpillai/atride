-- EnableExtension
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "CommunityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DirectoryVisibility" AS ENUM ('LISTED', 'UNLISTED');

-- CreateEnum
CREATE TYPE "GuildHallAccess" AS ENUM ('PUBLIC', 'VERIFIED_USERS', 'GUILD_MEMBERS', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "SearchIndexing" AS ENUM ('INDEXABLE', 'NOINDEX');

-- CreateEnum
CREATE TYPE "RideVisibility" AS ENUM ('PUBLIC', 'VERIFIED_USERS', 'GUILD_MEMBERS', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'POSTPONED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('BIKE', 'CAR', 'SUV', 'JEEP', 'OTHER');

-- CreateEnum
CREATE TYPE "RideDifficulty" AS ENUM ('EASY', 'MODERATE', 'CHALLENGING');

-- CreateTable
CREATE TABLE "communities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "short_name" VARCHAR(12) NOT NULL,
    "tagline" VARCHAR(240) NOT NULL,
    "description" TEXT NOT NULL,
    "founded_year" SMALLINT,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "completed_rides" INTEGER NOT NULL DEFAULT 0,
    "status" "CommunityStatus" NOT NULL DEFAULT 'DRAFT',
    "accent_color" VARCHAR(16) NOT NULL,
    "hero_gradient" TEXT NOT NULL,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "community_id" UUID NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "state" VARCHAR(120),
    "country_code" CHAR(2) NOT NULL DEFAULT 'IN',
    "is_home" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_visibility_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "community_id" UUID NOT NULL,
    "directory_visibility" "DirectoryVisibility" NOT NULL DEFAULT 'UNLISTED',
    "guild_hall_access" "GuildHallAccess" NOT NULL DEFAULT 'INVITE_ONLY',
    "search_indexing" "SearchIndexing" NOT NULL DEFAULT 'NOINDEX',
    "default_ride_visibility" "RideVisibility" NOT NULL DEFAULT 'INVITE_ONLY',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "community_visibility_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "community_id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "summary" TEXT NOT NULL,
    "origin_city" VARCHAR(120) NOT NULL,
    "destination" VARCHAR(160) NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "price_paise" INTEGER NOT NULL,
    "total_slots" INTEGER NOT NULL,
    "booked_slots" INTEGER NOT NULL DEFAULT 0,
    "vehicle_type" "VehicleType" NOT NULL DEFAULT 'BIKE',
    "difficulty" "RideDifficulty" NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "RideVisibility" NOT NULL DEFAULT 'PUBLIC',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "hero_gradient" TEXT NOT NULL,
    "distance_km" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "communities_slug_key" ON "communities"("slug");

-- Enforce valid aggregate values at the database boundary.
ALTER TABLE "communities"
    ADD CONSTRAINT "communities_founded_year_check" CHECK ("founded_year" IS NULL OR "founded_year" BETWEEN 1900 AND 9999),
    ADD CONSTRAINT "communities_member_count_check" CHECK ("member_count" >= 0),
    ADD CONSTRAINT "communities_completed_rides_check" CHECK ("completed_rides" >= 0);

-- CreateIndex
CREATE INDEX "community_locations_city_idx" ON "community_locations"("city");

-- A Guild can nominate at most one home city.
CREATE UNIQUE INDEX "community_locations_one_home_key" ON "community_locations"("community_id") WHERE "is_home" = true;

-- CreateIndex
CREATE UNIQUE INDEX "community_locations_community_id_city_state_country_code_key" ON "community_locations"("community_id", "city", "state", "country_code");

-- CreateIndex
CREATE UNIQUE INDEX "community_visibility_settings_community_id_key" ON "community_visibility_settings"("community_id");

-- CreateIndex
CREATE UNIQUE INDEX "rides_slug_key" ON "rides"("slug");

-- CreateIndex
CREATE INDEX "rides_community_id_status_starts_at_idx" ON "rides"("community_id", "status", "starts_at");

-- CreateIndex
CREATE INDEX "rides_origin_city_status_starts_at_idx" ON "rides"("origin_city", "status", "starts_at");

-- CreateIndex
CREATE INDEX "rides_featured_status_starts_at_idx" ON "rides"("featured", "status", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "rides_community_id_slug_key" ON "rides"("community_id", "slug");

-- Protect the core ride invariants even when a write bypasses the application.
ALTER TABLE "rides"
    ADD CONSTRAINT "rides_date_range_check" CHECK ("ends_at" > "starts_at"),
    ADD CONSTRAINT "rides_price_check" CHECK ("price_paise" >= 0),
    ADD CONSTRAINT "rides_capacity_check" CHECK ("total_slots" > 0 AND "booked_slots" >= 0 AND "booked_slots" <= "total_slots"),
    ADD CONSTRAINT "rides_distance_check" CHECK ("distance_km" > 0);

-- AddForeignKey
ALTER TABLE "community_locations" ADD CONSTRAINT "community_locations_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_visibility_settings" ADD CONSTRAINT "community_visibility_settings_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
