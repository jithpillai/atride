ALTER TABLE "ride_itinerary_days"
ADD COLUMN "scheduled_at" TIMESTAMPTZ(3);

COMMENT ON COLUMN "ride_itinerary_days"."date" IS 'Timezone-invariant local calendar date for the itinerary entry.';
COMMENT ON COLUMN "ride_itinerary_days"."scheduled_at" IS 'Optional exact local event time normalized to an instant; null when only the calendar date is known.';
