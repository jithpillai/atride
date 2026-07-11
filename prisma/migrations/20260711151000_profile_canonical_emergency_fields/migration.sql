-- Normalize existing free-text values before enforcing canonical choices.
UPDATE "participant_profiles"
SET "emergency_relationship" = CASE
    WHEN "emergency_relationship" IS NULL OR btrim("emergency_relationship") = '' THEN NULL
    WHEN lower(btrim("emergency_relationship")) IN ('spouse', 'partner', 'spouse / partner') THEN 'SPOUSE_PARTNER'
    WHEN lower(btrim("emergency_relationship")) = 'parent' THEN 'PARENT'
    WHEN lower(btrim("emergency_relationship")) = 'sibling' THEN 'SIBLING'
    WHEN lower(btrim("emergency_relationship")) = 'child' THEN 'CHILD'
    WHEN lower(btrim("emergency_relationship")) = 'guardian' THEN 'GUARDIAN'
    WHEN lower(btrim("emergency_relationship")) = 'friend' THEN 'FRIEND'
    WHEN lower(btrim("emergency_relationship")) = 'colleague' THEN 'COLLEAGUE'
    ELSE 'OTHER'
END;

UPDATE "participant_profiles"
SET "dietary_preference" = CASE
    WHEN "dietary_preference" IS NULL OR btrim("dietary_preference") = '' THEN NULL
    WHEN lower(regexp_replace(btrim("dietary_preference"), '[ -]', '', 'g')) = 'nopreference' THEN 'NO_PREFERENCE'
    WHEN lower(btrim("dietary_preference")) = 'vegetarian' THEN 'VEGETARIAN'
    WHEN lower(regexp_replace(btrim("dietary_preference"), '[ -]', '', 'g')) IN ('nonveg', 'nonvegetarian') THEN 'NON_VEGETARIAN'
    WHEN lower(btrim("dietary_preference")) = 'vegan' THEN 'VEGAN'
    WHEN lower(btrim("dietary_preference")) = 'eggetarian' THEN 'EGGETARIAN'
    WHEN lower(btrim("dietary_preference")) = 'jain' THEN 'JAIN'
    WHEN lower(regexp_replace(btrim("dietary_preference"), '[ -]', '', 'g')) = 'prefernottosay' THEN 'PREFER_NOT_TO_SAY'
    ELSE 'OTHER'
END;

-- AddColumn
ALTER TABLE "participant_profiles" ADD COLUMN "blood_group" VARCHAR(20);

ALTER TABLE "participant_profiles"
    ADD CONSTRAINT "participant_profiles_relationship_check" CHECK (
        "emergency_relationship" IS NULL OR "emergency_relationship" IN (
            'SPOUSE_PARTNER', 'PARENT', 'SIBLING', 'CHILD', 'GUARDIAN', 'FRIEND', 'COLLEAGUE', 'OTHER'
        )
    ),
    ADD CONSTRAINT "participant_profiles_dietary_check" CHECK (
        "dietary_preference" IS NULL OR "dietary_preference" IN (
            'NO_PREFERENCE', 'VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN', 'EGGETARIAN', 'JAIN', 'OTHER', 'PREFER_NOT_TO_SAY'
        )
    ),
    ADD CONSTRAINT "participant_profiles_blood_group_check" CHECK (
        "blood_group" IS NULL OR "blood_group" IN (
            'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
            'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE',
            'UNKNOWN', 'PREFER_NOT_TO_SAY'
        )
    );
