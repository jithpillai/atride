ALTER TABLE "ride_itinerary_days"
ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

WITH ordered_events AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "ride_id" ORDER BY "day_number", "id") - 1 AS "position"
  FROM "ride_itinerary_days"
)
UPDATE "ride_itinerary_days" AS event
SET "sort_order" = ordered_events."position"
FROM ordered_events
WHERE event."id" = ordered_events."id";

DROP INDEX IF EXISTS "ride_itinerary_days_ride_id_day_number_key";

CREATE UNIQUE INDEX IF NOT EXISTS "ride_itinerary_days_ride_id_sort_order_key"
ON "ride_itinerary_days"("ride_id", "sort_order");
