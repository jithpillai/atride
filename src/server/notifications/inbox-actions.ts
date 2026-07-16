"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { getCurrentSession } from "@/server/auth/session";

async function currentUserId() {
  const session = await getCurrentSession();
  if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to manage notifications.", 401);
  return session.userId;
}

export async function markNotificationRead(formData: FormData) {
  const userId = await currentUserId();
  const notificationId = String(formData.get("notificationId") || "");
  if (!notificationId) return;
  await db.notificationInboxItem.updateMany({
    where: { id: notificationId, recipientUserId: userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/account/notifications");
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const userId = await currentUserId();
  await db.notificationInboxItem.updateMany({
    where: { recipientUserId: userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/account/notifications");
  revalidatePath("/", "layout");
}
