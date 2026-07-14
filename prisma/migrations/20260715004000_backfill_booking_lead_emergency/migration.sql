UPDATE "booking_participants" AS participant
SET
  "emergency_contact_name" = profile."emergency_contact_name",
  "emergency_contact_phone" = profile."emergency_contact_phone"
FROM "ride_bookings" AS booking
JOIN "participant_profiles" AS profile ON profile."user_id" = booking."user_id"
WHERE participant."booking_id" = booking."id"
  AND participant."is_booking_lead" = true;
