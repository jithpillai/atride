"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRideManager } from "@/server/auth/authorization";
import { cancelBookingByStaff } from "./cancellation-service";
import { cleanBookingText } from "./validation";

export async function cancelRideBooking(formData: FormData) {
  const guildSlug = cleanBookingText(formData.get("guildSlug"), 80);
  const rideId = cleanBookingText(formData.get("rideId"), 36);
  const bookingId = cleanBookingText(formData.get("bookingId"), 36);
  const reason = cleanBookingText(formData.get("reason"), 1000);
  const acknowledged = formData.get("acknowledged") === "on";
  const { session } = await requireRideManager(guildSlug);
  const returnPath = `/guilds/${guildSlug}/rides/${rideId}/participants`;
  if (!rideId || !bookingId || reason.length < 8 || !acknowledged) {
    redirect(`${returnPath}?cancelError=details`);
  }

  let result: Awaited<ReturnType<typeof cancelBookingByStaff>>;
  try {
    result = await cancelBookingByStaff({ guildSlug, rideId, bookingId, actorUserId: session.userId, reason });
  } catch (error) {
    console.error("Staff booking cancellation failed", { guildSlug, rideId, bookingId, error });
    redirect(`${returnPath}?cancelError=unavailable`);
  }

  revalidatePath(returnPath);
  revalidatePath(`/guilds/${guildSlug}/manage`);
  revalidatePath(`/guilds/${guildSlug}`);
  revalidatePath(`/rides/${result.rideSlug}`);
  revalidatePath("/account/bookings");
  revalidatePath("/");
  const query = new URLSearchParams({ cancelled: "1", promoted: String(result.promotedSeats) });
  if (result.confirmedAmountPaise > 0) query.set("refundReview", "1");
  if (result.submittedAmountPaise > 0) query.set("proofReview", "1");
  redirect(`${returnPath}?${query}`);
}
