"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthError } from "@/server/auth/auth-service";
import { requireSession } from "@/server/auth/authorization";
import { reserveRide } from "./service";
import { cleanBookingText, isOccupantRole, isOfflinePaymentMethod } from "./validation";

export type ReserveRideState = { error?: string };

export async function reserveRideAction(_state: ReserveRideState, formData: FormData): Promise<ReserveRideState> {
  const rideId = cleanBookingText(formData.get("rideId"), 36);
  const rideSlug = cleanBookingText(formData.get("rideSlug"), 100);
  const session = await requireSession(`/rides/${rideSlug}#booking`);
  const occupantRole = cleanBookingText(formData.get("occupantRole"), 20);
  const paymentMethod = cleanBookingText(formData.get("paymentMethod"), 30);
  if (!isOccupantRole(occupantRole) || !isOfflinePaymentMethod(paymentMethod)) return { error: "Choose valid participant and payment options." };
  if (formData.get("waiverAccepted") !== "on" || formData.get("commercialTermsAccepted") !== "on") {
    return { error: "Accept the waiver, ride rules, and commercial policies before continuing." };
  }
  try {
    const result = await reserveRide({
      rideId,
      userId: session.userId,
      originId: cleanBookingText(formData.get("originId"), 36),
      vehicleId: cleanBookingText(formData.get("vehicleId"), 36) || null,
      occupantRole,
      dietaryPreference: cleanBookingText(formData.get("dietaryPreference"), 120) || null,
      accessibilityNotes: cleanBookingText(formData.get("accessibilityNotes"), 2000) || null,
      addOnIds: formData.getAll("addOnIds").map((item) => cleanBookingText(item, 36)).filter(Boolean),
      paymentMethod,
      joinWaitlistWhenFull: formData.get("joinWaitlistWhenFull") === "on",
      newcomerDisplayConsent: formData.get("newcomerDisplayConsent") === "on",
    });
    revalidatePath(`/rides/${rideSlug}`);
    revalidatePath("/");
    redirect(`/rides/${rideSlug}?booking=${result.outcome.toLowerCase()}#booking`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    if (error instanceof AuthError) return { error: error.message };
    console.error("Ride reservation failed", { rideId, userId: session.userId, error });
    return { error: "The reservation could not be completed. Your slot was not charged or confirmed; please try again." };
  }
}

