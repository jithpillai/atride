ALTER TABLE "ride_bookings"
  DROP CONSTRAINT IF EXISTS "ride_bookings_one_seat_check",
  DROP CONSTRAINT IF EXISTS "ride_bookings_price_check";

ALTER TABLE "ride_bookings"
  ADD CONSTRAINT "ride_bookings_party_size_check"
    CHECK ("seat_count" BETWEEN 1 AND 6),
  ADD CONSTRAINT "ride_bookings_price_check"
    CHECK (
      "base_price_paise" >= 0 AND
      "add_on_total_paise" >= 0 AND
      "accommodation_total_paise" >= 0 AND
      "total_price_paise" = "base_price_paise" + "add_on_total_paise" + "accommodation_total_paise" AND
      "confirmation_deposit_paise" >= 0 AND
      "balance_due_paise" >= 0 AND
      "confirmation_deposit_paise" + "balance_due_paise" = "total_price_paise"
    );
