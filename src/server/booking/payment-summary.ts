type PaymentLike = {
  id: string;
  purpose: "CONFIRMATION_DEPOSIT" | "BALANCE" | "FULL_PAYMENT" | "OTHER";
  status: "PENDING" | "SUBMITTED" | "CONFIRMED" | "REJECTED";
  amountPaise: number;
  dueAt: Date | null;
};

export function summarizeBookingPayments(
  booking: { status: string; totalPricePaise: number; payments: PaymentLike[] },
  now = new Date(),
) {
  const paidPaise = booking.payments.filter(({ status }) => status === "CONFIRMED").reduce((total, payment) => total + payment.amountPaise, 0);
  const outstandingPaise = Math.max(0, booking.totalPricePaise - paidPaise);
  const depositOrFull = booking.payments.find(({ purpose }) => purpose === "CONFIRMATION_DEPOSIT" || purpose === "FULL_PAYMENT");
  const balance = booking.payments.find(({ purpose }) => purpose === "BALANCE");
  const activePayment = depositOrFull?.status !== "CONFIRMED"
    ? depositOrFull ?? null
    : booking.status === "CONFIRMED" && balance?.status !== "CONFIRMED"
      ? balance ?? null
      : null;
  return {
    paidPaise,
    outstandingPaise,
    activePayment,
    fullyPaid: outstandingPaise === 0,
    overdue: Boolean(activePayment?.dueAt && activePayment.dueAt < now && activePayment.status !== "CONFIRMED"),
  };
}
