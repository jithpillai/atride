export const RIDE_STATUS_TRANSITIONS = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["CLOSED", "POSTPONED", "CANCELLED", "COMPLETED"],
  CLOSED: ["PUBLISHED", "POSTPONED", "CANCELLED", "COMPLETED"],
  POSTPONED: ["DRAFT", "PUBLISHED", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
} as const;

export type RideStatusName = keyof typeof RIDE_STATUS_TRANSITIONS;

export function isRideStatusTransitionAllowed(from: RideStatusName, to: string) {
  return (RIDE_STATUS_TRANSITIONS[from] as readonly string[]).includes(to);
}
