"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireSession } from "@/server/auth/authorization";
import { parseProfileInput, parseVehicleInput } from "@/server/profile/validation";

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

export async function completeOnboarding(formData: FormData) {
  const session = await requireSession("/onboarding");
  const input = parseProfileInput(formData);
  const acceptsTerms = formData.get("acceptTerms") === "on";
  const acceptsPrivacy = formData.get("acceptPrivacy") === "on";
  if (!input || !acceptsTerms || !acceptsPrivacy) redirect("/onboarding?error=invalid");

  const now = new Date();
  await db.$transaction([
    db.user.update({ where: { id: session.userId }, data: { displayName: input.displayName } }),
    db.participantProfile.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        ...input.profile,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        onboardingCompletedAt: now,
      },
      update: {
        ...input.profile,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        onboardingCompletedAt: now,
      },
    }),
  ]);

  revalidatePath("/account");
  redirect("/account?onboarding=complete");
}

export async function updateProfile(formData: FormData) {
  const session = await requireSession("/account/profile");
  const input = parseProfileInput(formData);
  if (!input) redirect("/account/profile?error=invalid");

  await db.$transaction([
    db.user.update({ where: { id: session.userId }, data: { displayName: input.displayName } }),
    db.participantProfile.update({ where: { userId: session.userId }, data: input.profile }),
  ]);

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
