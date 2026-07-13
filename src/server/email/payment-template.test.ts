import { describe, expect, it } from "vitest";

import { renderPaymentEventEmail } from "./payment-template";

const payload = {
  guildName: "Wild Gear Crew",
  rideTitle: "Agumbe Ride",
  participantName: "Demo Rider",
  amountPaise: 100_000,
  paymentPurpose: "CONFIRMATION_DEPOSIT",
  paymentMethod: "UPI",
  payerReference: "624518739201",
  submittedAt: "2026-07-13T18:00:00.000Z",
  reviewUrl: "https://atride.in/guilds/wild-gear/manage?section=finance",
};

describe("payment event email", () => {
  it("renders finance-review details without embedding payment proof", () => {
    const email = renderPaymentEventEmail("BOOKING_PAYMENT_SUBMITTED", "Finance Admin", payload);
    expect(email.subject).toContain("₹1,000.00");
    expect(email.text).toContain("Reference: 624518739201");
    expect(email.html).toContain("Review payment");
    expect(email.html).not.toContain("cloudinary");
  });

  it("includes the rejection reason for the participant", () => {
    const email = renderPaymentEventEmail("BOOKING_PAYMENT_REJECTED", "Demo Rider", { ...payload, rejectionReason: "Reference does not match the bank entry." });
    expect(email.text).toContain("Reference does not match");
    expect(email.subject).toContain("proof rejected");
  });
});
