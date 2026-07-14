"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePlatformAdmin } from "@/server/auth/authorization";
import { processExpiredReservations } from "@/server/booking/expiry-service";
import { dispatchNotificationOutbox } from "@/server/notifications/dispatcher";

export async function runReservationExpiry() {
  await requirePlatformAdmin();
  const result = await processExpiredReservations({ limit: 100 });
  if (result.eventKeys.length) {
    await dispatchNotificationOutbox({ eventKeys: result.eventKeys, limit: 100 });
  }
  revalidatePath("/");
  revalidatePath("/admin");
  for (const slug of result.rideSlugs) revalidatePath(`/rides/${slug}`);
  redirect(`/admin?expiryProcessed=${result.expired}&waitlistPromoted=${result.promoted}`);
}
