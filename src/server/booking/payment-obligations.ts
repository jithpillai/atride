import type { BookingPaymentMethod, Prisma } from "@/generated/prisma/client";

type PaymentRecipient = {
  payeeVpaSnapshot: string;
  payeeNameSnapshot: string;
  payeeInstructionsSnapshot: string | null;
} | null;

type ObligationInput = {
  bookingId: string;
  method: BookingPaymentMethod;
  totalPricePaise: number;
  confirmationDepositPaise: number;
  balanceDuePaise: number;
  reservationExpiresAt: Date | null;
  balanceDueAt: Date;
  upiRecipient: PaymentRecipient;
};

export function buildPaymentObligations(input: ObligationInput): Prisma.BookingPaymentCreateManyInput[] {
  const recipient = input.method === "UPI" && input.upiRecipient ? input.upiRecipient : {};
  if (input.confirmationDepositPaise > 0) {
    return [
      {
        bookingId: input.bookingId,
        purpose: "CONFIRMATION_DEPOSIT",
        method: input.method,
        amountPaise: input.confirmationDepositPaise,
        dueAt: input.reservationExpiresAt,
        ...recipient,
      },
      ...(input.balanceDuePaise > 0 ? [{
        bookingId: input.bookingId,
        purpose: "BALANCE" as const,
        method: input.method,
        amountPaise: input.balanceDuePaise,
        dueAt: input.balanceDueAt,
        ...recipient,
      }] : []),
    ];
  }
  return [{
    bookingId: input.bookingId,
    purpose: "FULL_PAYMENT",
    method: input.method,
    amountPaise: input.totalPricePaise,
    dueAt: input.reservationExpiresAt,
    ...recipient,
  }];
}
