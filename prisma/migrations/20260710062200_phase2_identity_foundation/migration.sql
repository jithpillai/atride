-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('SIGN_IN', 'ACCOUNT_RECOVERY', 'CONTACT_VERIFICATION');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_ADMIN', 'SUPPORT', 'MODERATOR');

-- CreateEnum
CREATE TYPE "CommunityMembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'LEFT');

-- CreateEnum
CREATE TYPE "CommunityRole" AS ENUM ('OWNER', 'ADMIN', 'RIDE_MANAGER', 'FINANCE', 'MEMBER_MANAGER');

-- CreateEnum
CREATE TYPE "RideStaffRole" AS ENUM ('LEAD_CAPTAIN', 'CAPTAIN', 'VICE_CAPTAIN', 'SWEEP', 'MARSHAL', 'VOLUNTEER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "display_name" VARCHAR(120) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "ContactType" NOT NULL,
    "normalized_value" VARCHAR(320) NOT NULL,
    "display_value" VARCHAR(320) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contact_type" "ContactType" NOT NULL,
    "normalized_destination" VARCHAR(320) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" VARCHAR(128) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "resend_available_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "request_ip_hash" VARCHAR(128),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_role_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "community_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "CommunityMembershipStatus" NOT NULL DEFAULT 'INVITED',
    "joined_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "community_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_role_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "membership_id" UUID NOT NULL,
    "role" "CommunityRole" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_staff_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "community_id" UUID NOT NULL,
    "ride_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "RideStaffRole" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_contacts_user_id_type_idx" ON "user_contacts"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "user_contacts_type_normalized_value_key" ON "user_contacts"("type", "normalized_value");

-- A user has at most one primary contact of each type.
CREATE UNIQUE INDEX "user_contacts_one_primary_per_type_key" ON "user_contacts"("user_id", "type") WHERE "is_primary" = true;

-- CreateIndex
CREATE INDEX "otp_challenges_contact_type_normalized_destination_purpose__idx" ON "otp_challenges"("contact_type", "normalized_destination", "purpose", "created_at");

-- CreateIndex
CREATE INDEX "otp_challenges_expires_at_idx" ON "otp_challenges"("expires_at");

ALTER TABLE "otp_challenges"
    ADD CONSTRAINT "otp_challenges_attempts_check" CHECK ("max_attempts" BETWEEN 1 AND 10 AND "attempt_count" >= 0 AND "attempt_count" <= "max_attempts"),
    ADD CONSTRAINT "otp_challenges_expiry_check" CHECK ("expires_at" > "created_at"),
    ADD CONSTRAINT "otp_challenges_resend_check" CHECK ("resend_available_at" >= "created_at"),
    ADD CONSTRAINT "otp_challenges_consumed_check" CHECK ("consumed_at" IS NULL OR "consumed_at" >= "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "sessions_expires_at_revoked_at_idx" ON "sessions"("expires_at", "revoked_at");

ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_expiry_check" CHECK ("expires_at" > "created_at"),
    ADD CONSTRAINT "sessions_last_seen_check" CHECK ("last_seen_at" >= "created_at"),
    ADD CONSTRAINT "sessions_revoked_check" CHECK ("revoked_at" IS NULL OR "revoked_at" >= "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "platform_role_assignments_user_id_role_key" ON "platform_role_assignments"("user_id", "role");

-- CreateIndex
CREATE INDEX "community_memberships_user_id_status_idx" ON "community_memberships"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "community_memberships_community_id_user_id_key" ON "community_memberships"("community_id", "user_id");

ALTER TABLE "community_memberships"
    ADD CONSTRAINT "community_memberships_joined_check" CHECK ("status" <> 'ACTIVE' OR "joined_at" IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "community_role_assignments_membership_id_role_key" ON "community_role_assignments"("membership_id", "role");

-- CreateIndex
CREATE INDEX "ride_staff_assignments_community_id_user_id_idx" ON "ride_staff_assignments"("community_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ride_staff_assignments_ride_id_user_id_role_key" ON "ride_staff_assignments"("ride_id", "user_id", "role");

-- The composite key makes the tenant carried by a staff assignment match its ride.
CREATE UNIQUE INDEX "rides_id_community_id_key" ON "rides"("id", "community_id");

-- AddForeignKey
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_role_assignments" ADD CONSTRAINT "platform_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_role_assignments" ADD CONSTRAINT "community_role_assignments_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "community_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_staff_assignments" ADD CONSTRAINT "ride_staff_assignments_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_staff_assignments" ADD CONSTRAINT "ride_staff_assignments_ride_id_community_id_fkey" FOREIGN KEY ("ride_id", "community_id") REFERENCES "rides"("id", "community_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_staff_assignments" ADD CONSTRAINT "ride_staff_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
