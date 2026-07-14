export type UpiPaymentInput = {
  vpa: string;
  payeeName: string;
  amountPaise: number;
  transactionReference: string;
  note: string;
};

const VPA_PATTERN = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9.-]{2,64}$/;

export function normalizeUpiVpa(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUpiVpa(value: string) {
  const normalized = normalizeUpiVpa(value);
  return normalized.length <= 130 && VPA_PATTERN.test(normalized);
}

export function upiTransactionReference(paymentId: string) {
  const compact = paymentId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `ATR${compact.slice(0, 25)}`;
}

export function upiPaymentNote(participantName: string, rideTitle: string) {
  const rider = participantName.trim().replace(/\s+/g, " ").slice(0, 28) || "Rider";
  const ride = rideTitle.trim().replace(/\s+/g, " ");
  return `${rider} @Ride ${ride}`.slice(0, 80);
}

export function buildUpiPaymentUri(input: UpiPaymentInput) {
  const vpa = normalizeUpiVpa(input.vpa);
  const payeeName = input.payeeName.trim();
  if (!isValidUpiVpa(vpa) || payeeName.length < 2 || !Number.isInteger(input.amountPaise) || input.amountPaise < 1) {
    throw new Error("Invalid UPI payment details.");
  }
  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName.slice(0, 120),
    am: (input.amountPaise / 100).toFixed(2),
    cu: "INR",
    tr: input.transactionReference.replace(/[^a-zA-Z0-9]/g, "").slice(0, 35),
    tn: input.note.trim().slice(0, 80),
  });
  return `upi://pay?${params.toString()}`;
}
