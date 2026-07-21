import type { NotificationEventType } from "@/generated/prisma/enums";

export type EmailNotificationPreference = {
  emailRideReminders: boolean;
  emailRoutineAnnouncements: boolean;
} | null | undefined;

type Payload = Record<string, unknown> | null | undefined;

export function shouldSendNotificationEmail(
  eventType: NotificationEventType,
  payload: Payload,
  preference: EmailNotificationPreference,
) {
  if (!preference) return true;
  if (eventType === "RIDE_START_REMINDER") return preference.emailRideReminders;
  if (eventType === "RIDE_ANNOUNCEMENT") {
    const urgency = typeof payload?.urgency === "string" ? payload.urgency : "NORMAL";
    return urgency !== "NORMAL" || preference.emailRoutineAnnouncements;
  }
  return true;
}
