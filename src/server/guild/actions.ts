"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireGuildAdmin, requirePlatformAdmin } from "@/server/auth/authorization";
import { normalizeEmail } from "@/server/auth/crypto";

const RESERVED_SLUGS = new Set(["admin", "api", "account", "login", "onboarding", "rides", "guilds", "www", "support"]);

function value(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

function validSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && !RESERVED_SLUGS.has(slug);
}

function gradient(accent: string) {
  return `linear-gradient(135deg, #101419 0%, ${accent} 58%, #0b0e12 100%)`;
}

export async function createGuild(formData: FormData) {
  await requirePlatformAdmin();
  const name = value(formData, "name", 160);
  const slug = value(formData, "slug", 80).toLowerCase();
  const ownerEmail = normalizeEmail(value(formData, "ownerEmail", 320));
  const homeCity = value(formData, "homeCity", 120);
  if (name.length < 3 || !validSlug(slug) || homeCity.length < 2 || !ownerEmail) redirect("/admin?guildError=invalid");

  const ownerContact = await db.userContact.findUnique({
    where: { type_normalizedValue: { type: "EMAIL", normalizedValue: ownerEmail } },
    include: { user: true },
  });
  if (!ownerContact?.verifiedAt || ownerContact.user.status !== "ACTIVE") redirect("/admin?guildError=owner");
  if (await db.community.findUnique({ where: { slug } })) redirect("/admin?guildError=duplicate");

  await db.community.create({
    data: {
      name,
      slug,
      shortName: name.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase(),
      tagline: "A new riders' Guild on AtRide.",
      description: "This Guild Hall is being prepared by its administrators.",
      accentColor: "#f97316",
      heroGradient: gradient("#7c2d12"),
      specialties: [],
      status: "DRAFT",
      locations: { create: { city: homeCity, countryCode: "IN", isHome: true } },
      visibility: { create: { directoryVisibility: "UNLISTED", guildHallAccess: "INVITE_ONLY", searchIndexing: "NOINDEX", defaultRideVisibility: "INVITE_ONLY" } },
      memberships: {
        create: {
          userId: ownerContact.userId,
          status: "ACTIVE",
          joinedAt: new Date(),
          roles: { create: { role: "OWNER" } },
        },
      },
    },
  });
  revalidatePath("/admin");
  redirect("/admin?guildCreated=1");
}

export async function setGuildStatus(formData: FormData) {
  await requirePlatformAdmin();
  const id = value(formData, "id", 36);
  const status = value(formData, "status", 20);
  if (!new Set(["ACTIVE", "SUSPENDED"]).has(status)) redirect("/admin?guildError=invalid");
  const guild = await db.community.findUnique({ where: { id }, select: { slug: true } });
  if (!guild) redirect("/admin?guildError=missing");
  await db.community.update({ where: { id }, data: { status: status as "ACTIVE" | "SUSPENDED" } });
  revalidatePath("/admin");
  revalidatePath(`/guilds/${guild.slug}`);
}

export async function updateGuildProfile(formData: FormData) {
  const slug = value(formData, "slug", 80);
  await requireGuildAdmin(slug);
  const name = value(formData, "name", 160);
  const shortName = value(formData, "shortName", 12).toUpperCase();
  const tagline = value(formData, "tagline", 240);
  const description = value(formData, "description", 5000);
  const homeCity = value(formData, "homeCity", 120);
  const accentColor = value(formData, "accentColor", 16);
  const foundedText = value(formData, "foundedYear", 4);
  const foundedYear = foundedText ? Number(foundedText) : null;
  const specialties = value(formData, "specialties", 500).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8);
  const directoryVisibility = value(formData, "directoryVisibility", 20);
  const guildHallAccess = value(formData, "guildHallAccess", 30);
  if (name.length < 3 || shortName.length < 2 || tagline.length < 5 || description.length < 20 || homeCity.length < 2 || !/^#[0-9a-f]{6}$/i.test(accentColor)) redirect(`/guilds/${slug}/manage?error=invalid`);
  if (foundedYear !== null && (!Number.isInteger(foundedYear) || foundedYear < 1900 || foundedYear > new Date().getFullYear())) redirect(`/guilds/${slug}/manage?error=invalid`);
  if (!new Set(["LISTED", "UNLISTED"]).has(directoryVisibility) || !new Set(["PUBLIC", "VERIFIED_USERS", "GUILD_MEMBERS", "INVITE_ONLY"]).has(guildHallAccess)) redirect(`/guilds/${slug}/manage?error=invalid`);

  const community = await db.community.findUnique({ where: { slug }, select: { id: true, locations: { where: { isHome: true }, take: 1, select: { id: true } } } });
  if (!community) redirect("/account?access=denied");
  await db.$transaction([
    db.community.update({
      where: { id: community.id },
      data: { name, shortName, tagline, description, foundedYear, accentColor, heroGradient: gradient(accentColor), specialties },
    }),
    community.locations[0]
      ? db.communityLocation.update({ where: { id: community.locations[0].id }, data: { city: homeCity, countryCode: "IN", isHome: true } })
      : db.communityLocation.create({ data: { communityId: community.id, city: homeCity, countryCode: "IN", isHome: true } }),
    db.communityVisibility.update({
      where: { communityId: community.id },
      data: {
        directoryVisibility: directoryVisibility as "LISTED" | "UNLISTED",
        guildHallAccess: guildHallAccess as "PUBLIC" | "VERIFIED_USERS" | "GUILD_MEMBERS" | "INVITE_ONLY",
        searchIndexing: directoryVisibility === "LISTED" && guildHallAccess === "PUBLIC" ? "INDEXABLE" : "NOINDEX",
      },
    }),
  ]);
  revalidatePath(`/guilds/${slug}`);
  revalidatePath(`/guilds/${slug}/manage`);
  revalidatePath("/");
  redirect(`/guilds/${slug}/manage?saved=1`);
}
