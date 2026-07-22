export const NOTIFICATION_RETENTION_DAYS = {
  readInbox: 30,
  unreadInbox: 90,
  rideAfterEnd: 30,
  resolvedCritical: 90,
  deliveredOutbox: 14,
  deadLetterOutbox: 30,
  providerEvents: 30,
} as const;

export function daysBefore(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60_000);
}

export function canDeleteInboxItem(input: {
  now: Date;
  createdAt: Date;
  readAt: Date | null;
  rideEndsAt?: Date | null;
  requiresAcknowledgement?: boolean;
  acknowledgedAt?: Date | null;
}) {
  const ordinaryCutoff = daysBefore(
    input.now,
    input.readAt ? NOTIFICATION_RETENTION_DAYS.readInbox : NOTIFICATION_RETENTION_DAYS.unreadInbox,
  );
  if (input.createdAt > ordinaryCutoff) return false;
  if (input.rideEndsAt && input.rideEndsAt > daysBefore(input.now, NOTIFICATION_RETENTION_DAYS.rideAfterEnd)) return false;
  if (!input.requiresAcknowledgement) return true;
  return Boolean(
    input.acknowledgedAt
    && input.acknowledgedAt <= daysBefore(input.now, NOTIFICATION_RETENTION_DAYS.resolvedCritical),
  );
}

export function isAcknowledgementProtectedPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const value = payload as Record<string, unknown>;
  return value.urgency === "CRITICAL" || value.requiresAcknowledgement === true;
}

export function announcementIdFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>).announcementId;
  return typeof value === "string" && value.length <= 36 ? value : null;
}
