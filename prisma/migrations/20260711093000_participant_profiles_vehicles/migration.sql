-- CreateTable
CREATE TABLE "participant_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "home_city" VARCHAR(120),
    "home_state" VARCHAR(120),
    "country_code" CHAR(2) NOT NULL DEFAULT 'IN',
    "operational_phone" VARCHAR(24),
    "phone_verified_at" TIMESTAMPTZ(3),
    "emergency_contact_name" VARCHAR(120),
    "emergency_contact_phone" VARCHAR(24),
    "emergency_relationship" VARCHAR(80),
    "dietary_preference" VARCHAR(120),
    "accessibility_notes" TEXT,
    "terms_accepted_at" TIMESTAMPTZ(3),
    "privacy_accepted_at" TIMESTAMPTZ(3),
    "onboarding_completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "participant_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "VehicleType" NOT NULL DEFAULT 'BIKE',
    "nickname" VARCHAR(80),
    "manufacturer" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "manufacture_year" SMALLINT,
    "color" VARCHAR(60),
    "registration_last4" VARCHAR(4),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participant_profiles_user_id_key" ON "participant_profiles"("user_id");

-- CreateIndex
CREATE INDEX "participant_profiles_home_city_idx" ON "participant_profiles"("home_city");

-- CreateIndex
CREATE INDEX "vehicles_user_id_type_idx" ON "vehicles"("user_id", "type");

-- A participant can identify only one primary vehicle.
CREATE UNIQUE INDEX "vehicles_one_primary_per_user_key" ON "vehicles"("user_id") WHERE "is_primary" = true;

ALTER TABLE "participant_profiles"
    ADD CONSTRAINT "participant_profiles_country_code_check" CHECK ("country_code" ~ '^[A-Z]{2}$'),
    ADD CONSTRAINT "participant_profiles_phone_check" CHECK ("operational_phone" IS NULL OR "operational_phone" ~ '^\+[1-9][0-9]{7,14}$'),
    ADD CONSTRAINT "participant_profiles_emergency_phone_check" CHECK ("emergency_contact_phone" IS NULL OR "emergency_contact_phone" ~ '^\+[1-9][0-9]{7,14}$'),
    ADD CONSTRAINT "participant_profiles_phone_verification_check" CHECK ("phone_verified_at" IS NULL OR "operational_phone" IS NOT NULL),
    ADD CONSTRAINT "participant_profiles_onboarding_check" CHECK (
        "onboarding_completed_at" IS NULL OR
        ("home_city" IS NOT NULL AND "terms_accepted_at" IS NOT NULL AND "privacy_accepted_at" IS NOT NULL)
    );

ALTER TABLE "vehicles"
    ADD CONSTRAINT "vehicles_manufacture_year_check" CHECK ("manufacture_year" IS NULL OR "manufacture_year" BETWEEN 1950 AND 2100),
    ADD CONSTRAINT "vehicles_registration_last4_check" CHECK ("registration_last4" IS NULL OR "registration_last4" ~ '^[A-Z0-9]{2,4}$');

-- AddForeignKey
ALTER TABLE "participant_profiles" ADD CONSTRAINT "participant_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
