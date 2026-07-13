export const DEFAULT_GUILD_RIDE_POLICIES = [
  {
    type: "SAFETY" as const,
    title: "Safety and ride rules",
    field: "safetyPolicy",
    content: "A full-face helmet and appropriate riding gear are mandatory. Participants must follow traffic rules, the assigned formation, hand signals, captains, and marshals. Racing, rash driving, illegal drugs, and drink-and-drive are prohibited.",
  },
  {
    type: "PAYMENT" as const,
    title: "Payment rules",
    field: "paymentPolicy",
    content: "A slot is confirmed only after the organizer verifies the required payment. Any remaining balance must be paid by the published due date through the approved payment channel.",
  },
  {
    type: "CANCELLATION" as const,
    title: "Cancellation and refund policy",
    field: "cancellationPolicy",
    content: "Cancellation and refund eligibility depends on the published deadline and organizer commitments already made for accommodation, meals, and activities. Confirmation payments may be non-refundable.",
  },
  {
    type: "REPLACEMENT" as const,
    title: "Replacement and transfer policy",
    field: "replacementPolicy",
    content: "Replacement or transfer of a confirmed slot requires prior organizer approval. The replacement participant must satisfy all ride requirements. Unauthorized slot transfers are not permitted.",
  },
  {
    type: "PROPERTY_CONDUCT" as const,
    title: "Property conduct",
    field: "propertyPolicy",
    content: "Participants must respect property rules, room allocations, fellow guests, and privacy. Smoking inside rooms, illegal substances, harassment, and disruptive conduct are prohibited.",
  },
] as const;

export function policyContent(formData: FormData, field: string, fallback: string) {
  const value = String(formData.get(field) ?? "").trim().slice(0, 15000);
  return value.length >= 10 ? value : fallback;
}
