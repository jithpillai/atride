export const OCCUPANT_ROLES = ["RIDER", "PILLION", "DRIVER", "PASSENGER", "OTHER"] as const;
export type OccupantRole = typeof OCCUPANT_ROLES[number];
export const BOOKING_VEHICLE_MODES = ["SAVED_VEHICLE", "RIDE_ONLY_DETAILS", "PRIVATE_VEHICLE", "NO_VEHICLE"] as const;
export type BookingVehicleMode = typeof BOOKING_VEHICLE_MODES[number];
export const OFFLINE_PAYMENT_METHODS = ["UPI", "BANK_TRANSFER", "CASH"] as const;
export type OfflinePaymentMethod = typeof OFFLINE_PAYMENT_METHODS[number];

export function isOccupantRole(value: string): value is OccupantRole {
  return OCCUPANT_ROLES.includes(value as OccupantRole);
}

export function isBookingVehicleMode(value: string): value is BookingVehicleMode {
  return BOOKING_VEHICLE_MODES.includes(value as BookingVehicleMode);
}

export function isOfflinePaymentMethod(value: string): value is OfflinePaymentMethod {
  return OFFLINE_PAYMENT_METHODS.includes(value as OfflinePaymentMethod);
}

export function cleanBookingText(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export function reservationExpiry(now: Date, registrationClosesAt: Date | null) {
  const standard = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return registrationClosesAt && registrationClosesAt < standard ? registrationClosesAt : standard;
}
