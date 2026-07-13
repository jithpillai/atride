"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireSession } from "@/server/auth/authorization";
import { parseVehicleInput, validateProfileInput, type ProfileFormState } from "@/server/profile/validation";

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

export async function completeOnboarding(previousState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const session = await requireSession("/onboarding");
  const validation = validateProfileInput(formData);
  if (!validation.values.acceptTerms) validation.errors.acceptTerms = "Accept the account terms to continue.";
  if (!validation.values.acceptPrivacy) validation.errors.acceptPrivacy = "Acknowledge the profile privacy policy to continue.";
  if (!validation.data || Object.keys(validation.errors).length) {
    return {
      values: validation.values,
      errors: validation.errors,
      message: "Check the highlighted fields. Your entries have been preserved.",
      revision: previousState.revision + 1,
    };
  }

  const now = new Date();
  await db.$transaction([
    db.user.update({ where: { id: session.userId }, data: { displayName: validation.data.displayName } }),
    db.participantProfile.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        ...validation.data.profile,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        onboardingCompletedAt: now,
      },
      update: {
        ...validation.data.profile,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        onboardingCompletedAt: now,
      },
    }),
  ]);

  revalidatePath("/account");
  const requestedReturnTo = text(formData, "returnTo", 1000);
  const returnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : "/account?onboarding=complete";
  redirect(returnTo);
}

export async function updateProfile(previousState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const session = await requireSession("/account/profile");
  const validation = validateProfileInput(formData);
  if (!validation.data) {
    return {
      values: validation.values,
      errors: validation.errors,
      message: "Check the highlighted fields. Your entries have been preserved.",
      revision: previousState.revision + 1,
    };
  }
  const data = validation.data;

  await db.$transaction(async (tx) => {
    const existing = await tx.participantProfile.findUnique({
      where: { userId: session.userId },
      select: { operationalPhone: true },
    });
    const phoneChanged = existing?.operationalPhone !== data.profile.operationalPhone;
    await tx.user.update({ where: { id: session.userId }, data: { displayName: data.displayName } });
    await tx.participantProfile.update({
      where: { userId: session.userId },
      data: {
        ...data.profile,
        ...(phoneChanged ? { phoneVerifiedAt: null, phoneVerificationProvider: null } : {}),
      },
    });
    if (phoneChanged) {
      await tx.userContact.deleteMany({ where: { userId: session.userId, type: "PHONE" } });
      await tx.phoneVerificationChallenge.updateMany({
        where: { userId: session.userId, status: "PENDING" },
        data: { status: "FAILED", consumedAt: new Date() },
      });
    }
  });

  revalidatePath("/account");
  revalidatePath("/account/profile");
  redirect("/account/profile?saved=1");
}

export async function createVehicle(formData: FormData) {
  const session = await requireSession("/account/vehicles");
  const input = parseVehicleInput(formData);
  if (!input) redirect("/account/vehicles?error=invalid");

  await db.$transaction(async (tx) => {
    const vehicleCount = await tx.vehicle.count({ where: { userId: session.userId } });
    const isPrimary = vehicleCount === 0 || formData.get("isPrimary") === "on";
    if (isPrimary) await tx.vehicle.updateMany({ where: { userId: session.userId }, data: { isPrimary: false } });
    await tx.vehicle.create({ data: { userId: session.userId, ...input, isPrimary } });
  });

  revalidatePath("/account/vehicles");
  redirect("/account/vehicles?created=1");
}

export async function updateVehicle(formData: FormData) {
  const session = await requireSession("/account/vehicles");
  const id = text(formData, "id", 36);
  const input = parseVehicleInput(formData);
  if (!input) redirect(`/account/vehicles/${id}?error=invalid`);

  const existing = await db.vehicle.findFirst({ where: { id, userId: session.userId } });
  if (!existing) redirect("/account/vehicles?error=missing");
  const isPrimary = existing.isPrimary || formData.get("isPrimary") === "on";
  await db.$transaction(async (tx) => {
    if (isPrimary) await tx.vehicle.updateMany({ where: { userId: session.userId }, data: { isPrimary: false } });
    await tx.vehicle.update({ where: { id }, data: { ...input, isPrimary } });
  });

  revalidatePath("/account/vehicles");
  redirect("/account/vehicles?saved=1");
}

export async function makePrimaryVehicle(formData: FormData) {
  const session = await requireSession("/account/vehicles");
  const id = text(formData, "id", 36);
  const vehicle = await db.vehicle.findFirst({ where: { id, userId: session.userId } });
  if (!vehicle) redirect("/account/vehicles?error=missing");

  await db.$transaction([
    db.vehicle.updateMany({ where: { userId: session.userId }, data: { isPrimary: false } }),
    db.vehicle.update({ where: { id }, data: { isPrimary: true } }),
  ]);
  revalidatePath("/account/vehicles");
}

export async function deleteVehicle(formData: FormData) {
  const session = await requireSession("/account/vehicles");
  const id = text(formData, "id", 36);
  await db.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findFirst({ where: { id, userId: session.userId } });
    if (!vehicle) return;
    await tx.vehicle.delete({ where: { id } });
    if (vehicle.isPrimary) {
      const replacement = await tx.vehicle.findFirst({ where: { userId: session.userId }, orderBy: { createdAt: "asc" } });
      if (replacement) await tx.vehicle.update({ where: { id: replacement.id }, data: { isPrimary: true } });
    }
  });
  revalidatePath("/account/vehicles");
  redirect("/account/vehicles?deleted=1");
}
