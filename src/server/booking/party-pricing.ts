import type { AccommodationPricingMode } from "@/generated/prisma/client";

export function accommodationCharge(
  option: { pricingMode: AccommodationPricingMode; pricePaise: number; maxOccupancy: number },
  partySize: number,
) {
  if (!Number.isInteger(partySize) || partySize < 1) throw new Error("Party size must be a positive whole number.");
  if (!Number.isInteger(option.maxOccupancy) || option.maxOccupancy < 1) throw new Error("Room occupancy must be a positive whole number.");

  const units = Math.ceil(partySize / option.maxOccupancy);
  const totalPricePaise = option.pricingMode === "INCLUDED"
    ? 0
    : option.pricingMode === "PER_PERSON"
      ? option.pricePaise * partySize
      : option.pricePaise * units;

  return { units, totalPricePaise };
}

export function partyBookingPrice(input: {
  partySize: number;
  ridePricePaise: number;
  confirmationDepositPaise: number;
  addOnUnitPricesPaise: number[];
  accommodationTotalPaise: number;
}) {
  const basePricePaise = input.ridePricePaise * input.partySize;
  const addOnTotalPaise = input.addOnUnitPricesPaise.reduce((total, price) => total + price, 0) * input.partySize;
  const totalPricePaise = basePricePaise + addOnTotalPaise + input.accommodationTotalPaise;
  const requestedDepositPaise = input.confirmationDepositPaise > 0
    ? input.confirmationDepositPaise * input.partySize
    : totalPricePaise;
  const confirmationDepositPaise = Math.min(requestedDepositPaise, totalPricePaise);

  return {
    basePricePaise,
    addOnTotalPaise,
    totalPricePaise,
    confirmationDepositPaise,
    balanceDuePaise: totalPricePaise - confirmationDepositPaise,
  };
}
