"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireSession } from "@/server/auth/authorization";

export async function updateNotificationPreferences(formData: FormData) {
  const session = await requireSession("/account/notifications/preferences");
  await db.userNotificationPreference.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      emailRideReminders: formData.get("emailRideReminders") === "on",
      emailRoutineAnnouncements: formData.get("emailRoutineAnnouncements") === "on",
    },
    update: {
      emailRideReminders: formData.get("emailRideReminders") === "on",
      emailRoutineAnnouncements: formData.get("emailRoutineAnnouncements") === "on",
    },
  });
  revalidatePath("/account/notifications/preferences");
  redirect("/account/notifications/preferences?saved=1");
}
