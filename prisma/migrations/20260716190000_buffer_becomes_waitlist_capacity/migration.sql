-- The legacy buffer_slots column now limits queued participant seats; it is
-- no longer extra ride capacity. Preserve any historical over-capacity ride
-- before enforcing total_slots as the hard participant limit.
UPDATE "rides"
SET "total_slots" = "booked_slots"
WHERE "booked_slots" > "total_slots";

ALTER TABLE "rides"
  DROP CONSTRAINT IF EXISTS "rides_booking_within_capacity_check";

ALTER TABLE "rides"
  ADD CONSTRAINT "rides_booking_within_capacity_check"
  CHECK ("booked_slots" <= "total_slots");
