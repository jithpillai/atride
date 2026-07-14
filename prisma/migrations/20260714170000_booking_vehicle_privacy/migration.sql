CREATE TYPE "BookingVehicleMode" AS ENUM (
  'SAVED_VEHICLE',
  'RIDE_ONLY_DETAILS',
  'PRIVATE_VEHICLE',
  'NO_VEHICLE'
);

ALTER TABLE "ride_bookings"
  ADD COLUMN "vehicle_mode" "BookingVehicleMode" NOT NULL DEFAULT 'NO_VEHICLE',
  ADD COLUMN "vehicle_snapshot" JSONB;

UPDATE "ride_bookings" AS booking
SET
  "vehicle_mode" = 'SAVED_VEHICLE',
  "vehicle_snapshot" = jsonb_strip_nulls(jsonb_build_object(
    'source', 'SAVED_VEHICLE',
    'type', vehicle."type",
    'manufacturer', vehicle."manufacturer",
    'model', vehicle."model",
    'nickname', vehicle."nickname",
    'registrationLast4', vehicle."registration_last4"
  ))
FROM "vehicles" AS vehicle
WHERE booking."vehicle_id" = vehicle."id";
