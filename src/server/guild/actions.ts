"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireGuildAdmin, requirePlatformAdmin, requireSession } from "@/server/auth/authorization";
import { isEmail, normalizeEmail } from "@/server/auth/crypto";
import { isStaffRole, normalizeOptionalHttpsUrl, parseOperatingCities, type StaffRole } from "@/server/guild/validation";
import { DEFAULT_GUILD_RIDE_POLICIES, policyContent } from "@/server/guild/default-ride-policies";
import { isValidUpiVpa, normalizeUpiVpa } from "@/lib/upi";

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

function optionalUrl(formData: FormData, name: string) {
  return normalizeOptionalHttpsUrl(value(formData, name, 500));
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
      ridePolicyTemplates: {
        create: DEFAULT_GUILD_RIDE_POLICIES.map((policy) => ({ type: policy.type, title: policy.title, content: policyContent(formData, policy.field, policy.content) })),
      },
    },
  });
  revalidatePath("/admin");
  redirect("/admin?guildCreated=1");
}

export async function updateGuildRidePolicyTemplates(formData: FormData) {
  const slug = value(formData, "slug", 80);
  const { session } = await requireGuildAdmin(slug);
  const guild = await db.community.findUnique({ where: { slug }, select: { id: true } });
  if (!guild) redirect("/account?access=denied");
  const policies = DEFAULT_GUILD_RIDE_POLICIES.map((policy) => ({ ...policy, content: policyContent(formData, policy.field, policy.content) }));
  await db.$transaction(async (tx) => {
    for (const policy of policies) {
      await tx.communityRidePolicyTemplate.upsert({
        where: { communityId_type: { communityId: guild.id, type: policy.type } },
        create: { communityId: guild.id, type: policy.type, title: policy.title, content: policy.content },
        update: { title: policy.title, content: policy.content },
      });
    }
    await tx.communityAuditEvent.create({ data: { communityId: guild.id, actorUserId: session.userId, action: "GUILD_RIDE_POLICY_TEMPLATES_UPDATED" } });
  });
  revalidatePath(`/guilds/${slug}/manage`);
  redirect(`/guilds/${slug}/manage?section=settings&policySaved=1#ride-policy-defaults`);
}

export async function updateGuildEmbedOrigins(formData: FormData) {
  const slug = value(formData, "slug", 80);
  const { session } = await requireGuildAdmin(slug);
  const guild = await db.community.findUnique({ where: { slug }, select: { id: true } });
  if (!guild) redirect("/account?access=denied");
  let origins: string[];
  try {
    origins = Array.from(new Set(value(formData, "embedOrigins", 3000).split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean).map((entry) => {
      const url = new URL(entry);
      if (url.origin !== entry.replace(/\/$/, "") || (url.protocol !== "https:" && url.hostname !== "localhost")) throw new Error("invalid");
      return url.origin;
    }))).slice(0, 10);
  } catch { redirect(`/guilds/${slug}/manage?section=settings&embedError=invalid#embed-origins`); }
  await db.$transaction([
    db.communityEmbedOrigin.deleteMany({ where: { communityId: guild.id } }),
    ...origins.map((origin) => db.communityEmbedOrigin.create({ data: { communityId: guild.id, origin } })),
    db.communityAuditEvent.create({ data: { communityId: guild.id, actorUserId: session.userId, action: "GUILD_EMBED_ORIGINS_UPDATED", metadata: { origins } } }),
  ]);
  revalidatePath(`/guilds/${slug}/manage`);
  redirect(`/guilds/${slug}/manage?section=settings&embedSaved=1#embed-origins`);
}

export async function updateGuildPaymentSettings(formData: FormData) {
  const slug = value(formData, "slug", 80);
  const { session } = await requireGuildAdmin(slug);
  const upiEnabled = formData.get("upiEnabled") === "on";
  const upiVpa = normalizeUpiVpa(value(formData, "upiVpa", 130));
  const upiPayeeName = value(formData, "upiPayeeName", 120);
  const participantInstructions = value(formData, "participantInstructions", 2000) || null;
  if (upiEnabled && (!isValidUpiVpa(upiVpa) || upiPayeeName.length < 2)) {
    redirect(`/guilds/${slug}/manage?section=finance&upiError=invalid#upi-settings`);
  }
  const guild = await db.community.findUnique({ where: { slug }, select: { id: true } });
  if (!guild) redirect("/account?access=denied");
  await db.$transaction(async (tx) => {
    await tx.communityPaymentSettings.upsert({
      where: { communityId: guild.id },
      create: {
        communityId: guild.id,
        upiEnabled,
        upiVpa: upiVpa || null,
        upiPayeeName: upiPayeeName || null,
        participantInstructions,
      },
      update: {
        upiEnabled,
        upiVpa: upiVpa || null,
        upiPayeeName: upiPayeeName || null,
        participantInstructions,
      },
    });
    if (upiEnabled) {
      await tx.bookingPayment.updateMany({
        where: {
          method: "UPI",
          status: { in: ["PENDING", "REJECTED"] },
          payeeVpaSnapshot: null,
          booking: { communityId: guild.id },
        },
        data: {
          payeeVpaSnapshot: upiVpa,
          payeeNameSnapshot: upiPayeeName,
          payeeInstructionsSnapshot: participantInstructions,
        },
      });
    }
    await tx.communityAuditEvent.create({
      data: {
        communityId: guild.id,
        actorUserId: session.userId,
        action: "GUILD_UPI_SETTINGS_UPDATED",
        metadata: { upiEnabled, configured: Boolean(upiVpa && upiPayeeName) },
      },
    });
  });
  revalidatePath(`/guilds/${slug}/manage`);
  revalidatePath("/");
  redirect(`/guilds/${slug}/manage?section=finance&upiSaved=1#upi-settings`);
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
  const { session } = await requireGuildAdmin(slug);
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
  const operatingCities = parseOperatingCities(value(formData, "operatingCities", 1000), homeCity);
  let websiteUrl: string | null;
  let instagramUrl: string | null;
  let whatsappUrl: string | null;
  try {
    websiteUrl = optionalUrl(formData, "websiteUrl");
    instagramUrl = optionalUrl(formData, "instagramUrl");
    whatsappUrl = optionalUrl(formData, "whatsappUrl");
  } catch {
    redirect(`/guilds/${slug}/manage?section=profile&error=invalid`);
  }
  const newcomerDisplayEnabled = formData.get("newcomerDisplayEnabled") === "on";
  const awardsDisplayEnabled = formData.get("awardsDisplayEnabled") === "on";
  if (name.length < 3 || shortName.length < 2 || tagline.length < 5 || description.length < 20 || homeCity.length < 2 || !/^#[0-9a-f]{6}$/i.test(accentColor)) redirect(`/guilds/${slug}/manage?section=profile&error=invalid`);
  if (foundedYear !== null && (!Number.isInteger(foundedYear) || foundedYear < 1900 || foundedYear > new Date().getFullYear())) redirect(`/guilds/${slug}/manage?section=profile&error=invalid`);
  if (!new Set(["LISTED", "UNLISTED"]).has(directoryVisibility) || !new Set(["PUBLIC", "VERIFIED_USERS", "GUILD_MEMBERS", "INVITE_ONLY"]).has(guildHallAccess)) redirect(`/guilds/${slug}/manage?section=profile&error=invalid`);

  const community = await db.community.findUnique({ where: { slug }, select: { id: true, locations: { where: { isHome: true }, take: 1, select: { id: true } } } });
  if (!community) redirect("/account?access=denied");
  await db.$transaction([
    db.community.update({
      where: { id: community.id },
      data: { name, shortName, tagline, description, foundedYear, accentColor, heroGradient: gradient(accentColor), specialties, websiteUrl, instagramUrl, whatsappUrl, newcomerDisplayEnabled, awardsDisplayEnabled },
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
    db.communityLocation.deleteMany({ where: { communityId: community.id, isHome: false } }),
    ...operatingCities.filter((city) => city.toLowerCase() !== homeCity.toLowerCase()).map((city) => db.communityLocation.create({ data: { communityId: community.id, city, countryCode: "IN", isHome: false } })),
    db.communityAuditEvent.create({ data: { communityId: community.id, actorUserId: session.userId, action: "GUILD_PROFILE_UPDATED", metadata: { directoryVisibility, guildHallAccess } } }),
  ]);
  revalidatePath(`/guilds/${slug}`);
  revalidatePath(`/guilds/${slug}/manage`);
  revalidatePath("/");
  redirect(`/guilds/${slug}/manage?section=profile&saved=1`);
}

export async function inviteGuildStaff(formData: FormData) {
  const slug = value(formData, "slug", 80);
  const { session } = await requireGuildAdmin(slug);
  const invitedEmail = normalizeEmail(value(formData, "email", 320));
  const role = value(formData, "role", 30);
  if (!isEmail(invitedEmail) || !isStaffRole(role)) redirect(`/guilds/${slug}/manage?section=operations&staffError=invalid#staff`);
  const guild = await db.community.findUnique({ where: { slug }, select: { id: true } });
  if (!guild) redirect("/account?access=denied");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pending = await db.communityInvitation.findFirst({ where: { communityId: guild.id, invitedEmail, role, status: "PENDING" } });
  await db.$transaction(async (tx) => {
    if (pending) await tx.communityInvitation.update({ where: { id: pending.id }, data: { expiresAt, invitedById: session.userId } });
    else await tx.communityInvitation.create({ data: { communityId: guild.id, invitedEmail, role, invitedById: session.userId, expiresAt } });
    await tx.communityAuditEvent.create({ data: { communityId: guild.id, actorUserId: session.userId, action: "STAFF_INVITED", metadata: { invitedEmail, role } } });
  });
  revalidatePath(`/guilds/${slug}/manage`);
  redirect(`/guilds/${slug}/manage?section=operations&staffSaved=invited#staff`);
}

export async function revokeGuildInvitation(formData: FormData) {
  const slug = value(formData, "slug", 80);
  const { session } = await requireGuildAdmin(slug);
  const invitationId = value(formData, "invitationId", 36);
  const invitation = await db.communityInvitation.findFirst({ where: { id: invitationId, community: { slug }, status: "PENDING" }, select: { id: true, communityId: true, invitedEmail: true, role: true } });
  if (!invitation) redirect(`/guilds/${slug}/manage?section=operations&staffError=missing#staff`);
  await db.$transaction([
    db.communityInvitation.update({ where: { id: invitation.id }, data: { status: "REVOKED", revokedAt: new Date() } }),
    db.communityAuditEvent.create({ data: { communityId: invitation.communityId, actorUserId: session.userId, action: "INVITATION_REVOKED", metadata: { invitedEmail: invitation.invitedEmail, role: invitation.role } } }),
  ]);
  revalidatePath(`/guilds/${slug}/manage`);
  redirect(`/guilds/${slug}/manage?section=operations&staffSaved=revoked#staff`);
}

export async function createGuildJoinLink(formData: FormData) {
  const slug = value(formData, "slug", 80);
  const { session } = await requireGuildAdmin(slug);
  const label = value(formData, "label", 120) || "Guild member invitation";
  const expiryDays = Number(value(formData, "expiryDays", 4));
  const maxUsesText = value(formData, "maxUses", 6);
  const maxUses = maxUsesText ? Number(maxUsesText) : null;
  if (![7, 30, 90, 365].includes(expiryDays) || (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 10000))) {
    redirect(`/guilds/${slug}/manage?section=operations&joinError=invalid#join-links`);
  }
  const guild = await db.community.findUnique({ where: { slug }, select: { id: true } });
  if (!guild) redirect("/account?access=denied");
  await db.$transaction([
    db.communityJoinLink.create({
      data: {
        communityId: guild.id,
        createdById: session.userId,
        label,
        maxUses,
        expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
      },
    }),
    db.communityAuditEvent.create({
      data: { communityId: guild.id, actorUserId: session.userId, action: "GUILD_JOIN_LINK_CREATED", metadata: { label, expiryDays, maxUses } },
    }),
  ]);
  revalidatePath(`/guilds/${slug}/manage`);
  redirect(`/guilds/${slug}/manage?section=operations&joinSaved=created#join-links`);
}

export async function revokeGuildJoinLink(formData: FormData) {
  const slug = value(formData, "slug", 80);
  const { session } = await requireGuildAdmin(slug);
  const linkId = value(formData, "linkId", 36);
  const link = await db.communityJoinLink.findFirst({ where: { id: linkId, community: { slug }, revokedAt: null }, select: { id: true, communityId: true, label: true } });
  if (!link) redirect(`/guilds/${slug}/manage?section=operations&joinError=missing#join-links`);
  await db.$transaction([
    db.communityJoinLink.update({ where: { id: link.id }, data: { revokedAt: new Date() } }),
    db.communityAuditEvent.create({ data: { communityId: link.communityId, actorUserId: session.userId, action: "GUILD_JOIN_LINK_REVOKED", metadata: { label: link.label } } }),
  ]);
  revalidatePath(`/guilds/${slug}/manage`);
  redirect(`/guilds/${slug}/manage?section=operations&joinSaved=revoked#join-links`);
}

export async function acceptGuildJoinLink(formData: FormData) {
  const linkId = value(formData, "linkId", 36);
  const returnTo = `/join/${linkId}`;
  const session = await requireSession(returnTo);
  if (!session.user.profile?.onboardingCompletedAt) redirect(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
  const now = new Date();
  const link = await db.communityJoinLink.findFirst({
    where: { id: linkId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    include: { community: { select: { id: true, slug: true } } },
  });
  if (!link || (link.maxUses !== null && link.useCount >= link.maxUses)) redirect(`${returnTo}?error=invalid`);
  const existing = await db.communityMembership.findUnique({ where: { communityId_userId: { communityId: link.communityId, userId: session.userId } } });
  if (existing?.status === "ACTIVE") redirect(`/guilds/${link.community.slug}?joined=existing`);

  try {
    await db.$transaction(async (tx) => {
      const consumed = await tx.communityJoinLink.updateMany({
        where: {
          id: link.id,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          ...(link.maxUses === null ? {} : { useCount: { lt: link.maxUses } }),
        },
        data: { useCount: { increment: 1 } },
      });
      if (consumed.count !== 1) throw new Error("JOIN_LINK_UNAVAILABLE");
      await tx.communityMembership.upsert({
        where: { communityId_userId: { communityId: link.communityId, userId: session.userId } },
        create: { communityId: link.communityId, userId: session.userId, status: "ACTIVE", joinedAt: now },
        update: { status: "ACTIVE", joinedAt: now },
      });
      await tx.communityAuditEvent.create({ data: { communityId: link.communityId, actorUserId: session.userId, targetUserId: session.userId, action: "GUILD_JOIN_LINK_ACCEPTED", metadata: { linkId: link.id, label: link.label } } });
    });
  } catch {
    redirect(`${returnTo}?error=invalid`);
  }
  revalidatePath("/account");
  revalidatePath(`/guilds/${link.community.slug}`);
  revalidatePath(`/guilds/${link.community.slug}/manage`);
  redirect(`/guilds/${link.community.slug}?joined=1`);
}

export async function acceptGuildInvitation(formData: FormData) {
  const session = await requireSession("/account");
  const invitationId = value(formData, "invitationId", 36);
  const email = session.user.contacts.find((contact) => contact.type === "EMAIL" && contact.verifiedAt)?.normalizedValue;
  if (!email) redirect("/account?inviteError=identity#invitations");
  const invitation = await db.communityInvitation.findFirst({ where: { id: invitationId, invitedEmail: email, status: "PENDING", expiresAt: { gt: new Date() } }, include: { community: { select: { id: true, slug: true } } } });
  if (!invitation) redirect("/account?inviteError=invalid#invitations");
  await db.$transaction(async (tx) => {
    const membership = await tx.communityMembership.upsert({
      where: { communityId_userId: { communityId: invitation.communityId, userId: session.userId } },
      create: { communityId: invitation.communityId, userId: session.userId, status: "ACTIVE", joinedAt: new Date() },
      update: { status: "ACTIVE", joinedAt: new Date() },
    });
    await tx.communityRoleAssignment.upsert({ where: { membershipId_role: { membershipId: membership.id, role: invitation.role } }, create: { membershipId: membership.id, role: invitation.role }, update: {} });
    await tx.communityInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    await tx.communityAuditEvent.create({ data: { communityId: invitation.communityId, actorUserId: session.userId, targetUserId: session.userId, action: "STAFF_INVITATION_ACCEPTED", metadata: { role: invitation.role } } });
  });
  revalidatePath("/account");
  redirect(`/account?inviteAccepted=${encodeURIComponent(invitation.community.slug)}#invitations`);
}

export async function updateGuildMemberRole(formData: FormData) {
  const slug = value(formData, "slug", 80);
  const { session } = await requireGuildAdmin(slug);
  const membershipId = value(formData, "membershipId", 36);
  const role = value(formData, "role", 30);
  const operation = value(formData, "operation", 10);
  if (!isStaffRole(role) || !new Set(["grant", "revoke"]).has(operation)) redirect(`/guilds/${slug}/manage?section=operations&staffError=invalid#staff`);
  const membership = await db.communityMembership.findFirst({ where: { id: membershipId, community: { slug }, status: "ACTIVE" }, include: { roles: true } });
  if (!membership) redirect(`/guilds/${slug}/manage?section=operations&staffError=missing#staff`);
  const typedRole: StaffRole = role;
  await db.$transaction(async (tx) => {
    if (operation === "grant") await tx.communityRoleAssignment.upsert({ where: { membershipId_role: { membershipId, role: typedRole } }, create: { membershipId, role: typedRole }, update: {} });
    else await tx.communityRoleAssignment.deleteMany({ where: { membershipId, role: typedRole } });
    await tx.communityAuditEvent.create({ data: { communityId: membership.communityId, actorUserId: session.userId, targetUserId: membership.userId, action: operation === "grant" ? "STAFF_ROLE_GRANTED" : "STAFF_ROLE_REVOKED", metadata: { role } } });
  });
  revalidatePath(`/guilds/${slug}/manage`);
  revalidatePath("/account");
  redirect(`/guilds/${slug}/manage?section=operations&staffSaved=role#staff`);
}

export async function updateGuildMemberStatus(formData: FormData) {
  const slug = value(formData, "slug", 80);
  const { session } = await requireGuildAdmin(slug);
  const membershipId = value(formData, "membershipId", 36);
  const status = value(formData, "status", 20);
  if (!new Set(["ACTIVE", "SUSPENDED"]).has(status)) redirect(`/guilds/${slug}/manage?section=operations&staffError=invalid#staff`);
  const membership = await db.communityMembership.findFirst({ where: { id: membershipId, community: { slug } }, include: { roles: true } });
  if (!membership || membership.userId === session.userId || membership.roles.some(({ role }) => role === "OWNER")) redirect(`/guilds/${slug}/manage?section=operations&staffError=protected#staff`);
  await db.$transaction([
    db.communityMembership.update({ where: { id: membership.id }, data: { status: status as "ACTIVE" | "SUSPENDED" } }),
    db.communityAuditEvent.create({ data: { communityId: membership.communityId, actorUserId: session.userId, targetUserId: membership.userId, action: status === "ACTIVE" ? "MEMBER_REACTIVATED" : "MEMBER_SUSPENDED" } }),
  ]);
  revalidatePath(`/guilds/${slug}/manage`);
  revalidatePath("/account");
  redirect(`/guilds/${slug}/manage?section=operations&staffSaved=status#staff`);
}
