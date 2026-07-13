"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireRideManager } from "@/server/auth/authorization";
import { moneyToPaise, optionalDate, parseDayItems, parseItinerary, parseOrigins, parseSimpleItems, positiveInteger, requiredDate, validRideSlug } from "@/server/ride/validation";
import { DEFAULT_GUILD_RIDE_POLICIES } from "@/server/guild/default-ride-policies";

function value(formData: FormData, name: string, max = 5000) {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

function editor(slug: string, rideId: string, error?: string) {
  return `/guilds/${slug}/rides/${rideId}/edit${error ? `?error=${error}` : ""}`;
}

function rideEditorErrorCode(error: unknown) {
  if (!(error instanceof Error)) return "server";
  if (error.message === "capacity") return "capacity";
  if (error.message === "stay") return "stay";
  if (error.message === "policy") return "policy";
  if (error.message === "Invalid origin row") return "origins";
  if (error.message === "Invalid itinerary row") return "itinerary";
  if (error.message === "Invalid package row" || error.message === "Invalid day package row") return "package";
  if (error.message === "Invalid money value") return "money";
  if (error.message === "Invalid integer") return "number";
  if (error.message === "Invalid date") return "date";
  if (error.message === "invalid") return "required";
  return "server";
}

export type CreateRideDraftState = {
  error?: string;
  values?: { title: string; slug: string; summary: string; destination: string; originCity: string; startsAt: string; endsAt: string };
};

export async function createRideDraft(_previousState: CreateRideDraftState, formData: FormData): Promise<CreateRideDraftState> {
  const guildSlug = value(formData, "guildSlug", 80);
  const { session } = await requireRideManager(guildSlug);
  const slug = value(formData, "slug", 100).toLowerCase();
  const title = value(formData, "title", 180);
  const summary = value(formData, "summary", 1000);
  const destination = value(formData, "destination", 160);
  const originCity = value(formData, "originCity", 120);
  const startsAtValue = value(formData, "startsAt", 40);
  const endsAtValue = value(formData, "endsAt", 40);
  const values = { title, slug, summary, destination, originCity, startsAt: startsAtValue, endsAt: endsAtValue };
  if (!validRideSlug(slug)) return { error: "Use 3–100 lowercase letters, numbers, and single hyphens for the URL slug.", values };
  if (title.length < 5) return { error: "Ride title must contain at least 5 characters.", values };
  if (summary.length < 20) return { error: "Short summary must contain at least 20 characters.", values };
  if (destination.length < 2) return { error: "Enter the ride destination.", values };
  if (originCity.length < 2) return { error: "Enter the primary starting city.", values };
  let startsAt: Date;
  let endsAt: Date;
  try {
    startsAt = requiredDate(startsAtValue);
    endsAt = requiredDate(endsAtValue);
  } catch {
    return { error: "Enter valid start and end dates.", values };
  }
  if (endsAt <= startsAt) return { error: "The ride end must be after its start.", values };
  const community = await db.community.findUnique({ where: { slug: guildSlug }, select: { id: true, ridePolicyTemplates: true } });
  if (!community) return { error: "This Guild is unavailable.", values };
  if (await db.ride.findUnique({ where: { slug } })) return { error: `The URL slug “${slug}” is already in use. Choose another.`, values };
  const policyTemplates = community.ridePolicyTemplates.length ? community.ridePolicyTemplates : DEFAULT_GUILD_RIDE_POLICIES;
  let ride: { id: string };
  try {
    ride = await db.$transaction(async (tx) => {
      const created = await tx.ride.create({
        data: {
          communityId: community.id, slug, title, summary, description: summary,
          originCity, destination, startsAt, endsAt, pricePaise: 0, totalSlots: 1,
          vehicleType: "BIKE", difficulty: "MODERATE", status: "DRAFT", visibility: "PUBLIC",
          heroGradient: "linear-gradient(135deg, #17212b 0%, #7c2d12 55%, #101419 100%)", distanceKm: 1,
          origins: { create: { city: originCity, meetingPoint: "Meeting point to be confirmed", departureAt: startsAt } },
          policies: { create: policyTemplates.map((policy) => ({ type: policy.type, title: policy.title, content: policy.content, version: 1 })) },
        },
      });
      await tx.communityAuditEvent.create({ data: { communityId: community.id, actorUserId: session.userId, action: "RIDE_DRAFT_CREATED", metadata: { rideId: created.id, title } } });
      return created;
    });
  } catch (error) {
    console.error("Ride draft creation failed", { guildSlug, slug, error });
    return { error: "The draft could not be created. Your entries are preserved; please try again.", values };
  }
  revalidatePath(`/guilds/${guildSlug}/manage`);
  redirect(editor(guildSlug, ride.id));
}

export async function updateRidePackage(formData: FormData) {
  const guildSlug = value(formData, "guildSlug", 80);
  const rideId = value(formData, "rideId", 36);
  const { session } = await requireRideManager(guildSlug);
  const ride = await db.ride.findFirst({ where: { id: rideId, community: { slug: guildSlug } }, include: { policies: { orderBy: { version: "desc" } } } });
  if (!ride) redirect("/account?access=denied");
  try {
    const title = value(formData, "title", 180);
    const summary = value(formData, "summary", 1000);
    const description = value(formData, "description", 10000);
    const destination = value(formData, "destination", 160);
    const startsAt = requiredDate(value(formData, "startsAt", 40));
    const endsAt = requiredDate(value(formData, "endsAt", 40));
    const pricePaise = moneyToPaise(value(formData, "price", 20));
    const confirmationDepositPaise = moneyToPaise(value(formData, "confirmationDeposit", 20));
    const totalSlots = positiveInteger(value(formData, "totalSlots", 8), 1);
    const bufferSlots = positiveInteger(value(formData, "bufferSlots", 8));
    const distanceKm = positiveInteger(value(formData, "distanceKm", 8), 1);
    const vehicleType = value(formData, "vehicleType", 20);
    const difficulty = value(formData, "difficulty", 20);
    const visibility = value(formData, "visibility", 30);
    const origins = parseOrigins(value(formData, "origins"));
    const itineraryDays = parseItinerary(value(formData, "itinerary"));
    const inclusions = parseSimpleItems(value(formData, "inclusions"));
    const exclusions = parseSimpleItems(value(formData, "exclusions"));
    const addOns = parseSimpleItems(value(formData, "addOns"));
    const meals = parseDayItems(value(formData, "meals"));
    const activities = parseDayItems(value(formData, "activities"));
    if (title.length < 5 || summary.length < 20 || description.length < 20 || destination.length < 2 || endsAt <= startsAt || confirmationDepositPaise > pricePaise || origins.length < 1 || itineraryDays.length < 1) throw new Error("invalid");
    if (!new Set(["BIKE", "CAR", "SUV", "JEEP", "OTHER"]).has(vehicleType) || !new Set(["EASY", "MODERATE", "CHALLENGING"]).has(difficulty) || !new Set(["PUBLIC", "VERIFIED_USERS", "GUILD_MEMBERS", "INVITE_ONLY"]).has(visibility)) throw new Error("invalid");

    const propertyName = value(formData, "propertyName", 180);
    const locality = value(formData, "propertyLocality", 180);
    const checkInAt = propertyName ? requiredDate(value(formData, "checkInAt", 40)) : null;
    const checkOutAt = propertyName ? requiredDate(value(formData, "checkOutAt", 40)) : null;
    const roomSummary = value(formData, "roomSummary", 2000);
    const amenities = value(formData, "amenities", 1000).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 30);
    if (propertyName && (!locality || !checkInAt || !checkOutAt || checkOutAt <= checkInAt || roomSummary.length < 5)) throw new Error("stay");

    const policyInputs = [
      ["SAFETY", "Safety and ride rules", value(formData, "safetyPolicy", 15000)],
      ["PAYMENT", "Payment rules", value(formData, "paymentPolicy", 10000)],
      ["CANCELLATION", "Cancellation and refund policy", value(formData, "cancellationPolicy", 10000)],
      ["REPLACEMENT", "Replacement and transfer policy", value(formData, "replacementPolicy", 10000)],
      ["PROPERTY_CONDUCT", "Property conduct", value(formData, "propertyPolicy", 10000)],
    ] as const;
    if (policyInputs.some(([, , content]) => content.length < 10)) throw new Error("policy");

    await db.$transaction(async (tx) => {
      await tx.ride.update({ where: { id: ride.id }, data: {
        title, summary, description, originCity: origins[0].city, destination, startsAt, endsAt,
        pricePaise, confirmationDepositPaise, balanceDueAt: optionalDate(value(formData, "balanceDueAt", 40)),
        registrationClosesAt: optionalDate(value(formData, "registrationClosesAt", 40)), totalSlots, bufferSlots,
        vehicleType: vehicleType as "BIKE" | "CAR" | "SUV" | "JEEP" | "OTHER", difficulty: difficulty as "EASY" | "MODERATE" | "CHALLENGING",
        visibility: visibility as "PUBLIC" | "VERIFIED_USERS" | "GUILD_MEMBERS" | "INVITE_ONLY", distanceKm,
      } });
      await Promise.all([
        tx.rideOrigin.deleteMany({ where: { rideId: ride.id } }), tx.rideItineraryDay.deleteMany({ where: { rideId: ride.id } }),
        tx.rideAccommodation.deleteMany({ where: { rideId: ride.id } }), tx.ridePackageItem.deleteMany({ where: { rideId: ride.id } }),
      ]);
      await tx.rideOrigin.createMany({ data: origins.map((origin) => ({ ...origin, rideId: ride.id })) });
      await tx.rideItineraryDay.createMany({ data: itineraryDays.map((day) => ({ ...day, rideId: ride.id })) });
      if (propertyName && checkInAt && checkOutAt) await tx.rideAccommodation.create({ data: { rideId: ride.id, propertyName, locality, checkInAt, checkOutAt, roomSummary, amenities, participantNote: value(formData, "participantNote", 3000) || null, exactLocationRestricted: formData.get("exactLocationRestricted") === "on" } });
      const packageData = [
        ...inclusions.map((item) => ({ ...item, rideId: ride.id, type: "INCLUSION" as const })),
        ...exclusions.map((item) => ({ ...item, rideId: ride.id, type: "EXCLUSION" as const })),
        ...addOns.map((item) => ({ ...item, rideId: ride.id, type: "ADD_ON" as const })),
        ...meals.map((item) => ({ ...item, rideId: ride.id, type: "MEAL" as const })),
        ...activities.map((item) => ({ ...item, rideId: ride.id, type: "ACTIVITY" as const })),
      ];
      if (packageData.length) await tx.ridePackageItem.createMany({ data: packageData });
      for (const [type, policyTitle, content] of policyInputs) {
        const latest = ride.policies.find((policy) => policy.type === type);
        if (latest?.content !== content) await tx.ridePolicy.create({ data: { rideId: ride.id, type, title: policyTitle, content, version: (latest?.version ?? 0) + 1 } });
      }
      await tx.communityAuditEvent.create({ data: { communityId: ride.communityId, actorUserId: session.userId, action: "RIDE_PACKAGE_UPDATED", metadata: { rideId: ride.id, title } } });
    });
    revalidatePath(editor(guildSlug, ride.id));
    revalidatePath(`/rides/${ride.slug}`);
    redirect(`${editor(guildSlug, ride.id)}?saved=1`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    const errorCode = rideEditorErrorCode(error);
    if (errorCode === "server") console.error("Ride package update failed", { guildSlug, rideId: ride.id, error });
    redirect(editor(guildSlug, ride.id, errorCode));
  }
}

export async function setRideStatus(formData: FormData) {
  const guildSlug = value(formData, "guildSlug", 80);
  const rideId = value(formData, "rideId", 36);
  const requestedStatus = value(formData, "status", 20);
  const { session } = await requireRideManager(guildSlug);
  const ride = await db.ride.findFirst({ where: { id: rideId, community: { slug: guildSlug } }, include: { origins: true, itineraryDays: true, packageItems: true, policies: true } });
  if (!ride || !new Set(["DRAFT", "PUBLISHED", "CLOSED", "POSTPONED", "CANCELLED", "COMPLETED"]).has(requestedStatus)) redirect("/account?access=denied");
  if (requestedStatus === "PUBLISHED" && (ride.origins.length < 1 || ride.itineraryDays.length < 1 || ride.packageItems.length < 2 || new Set(ride.policies.map((policy) => policy.type)).size < 3 || ride.description.length < 20)) redirect(editor(guildSlug, ride.id, "incomplete"));
  if (ride.communityId && requestedStatus === "DRAFT" && ride.bookedSlots > 0) redirect(editor(guildSlug, ride.id, "bookings"));
  await db.$transaction([
    db.ride.update({ where: { id: ride.id }, data: { status: requestedStatus as "DRAFT" | "PUBLISHED" | "CLOSED" | "POSTPONED" | "CANCELLED" | "COMPLETED" } }),
    db.communityAuditEvent.create({ data: { communityId: ride.communityId, actorUserId: session.userId, action: "RIDE_STATUS_CHANGED", metadata: { rideId: ride.id, from: ride.status, to: requestedStatus } } }),
  ]);
  revalidatePath(`/guilds/${guildSlug}/manage`);
  revalidatePath(editor(guildSlug, ride.id));
  revalidatePath(`/rides/${ride.slug}`);
  revalidatePath("/");
  redirect(`${editor(guildSlug, ride.id)}?statusSaved=1`);
}

export async function assignRideStaff(formData: FormData) {
  const guildSlug = value(formData, "guildSlug", 80);
  const rideId = value(formData, "rideId", 36);
  const membershipId = value(formData, "membershipId", 36);
  const role = value(formData, "role", 30);
  const { session } = await requireRideManager(guildSlug);
  if (!new Set(["LEAD_CAPTAIN", "CAPTAIN", "VICE_CAPTAIN", "SWEEP", "MARSHAL", "VOLUNTEER"]).has(role)) redirect(editor(guildSlug, rideId, "staff"));
  const [ride, membership] = await Promise.all([
    db.ride.findFirst({ where: { id: rideId, community: { slug: guildSlug } } }),
    db.communityMembership.findFirst({ where: { id: membershipId, community: { slug: guildSlug }, status: "ACTIVE" } }),
  ]);
  if (!ride || !membership || ride.communityId !== membership.communityId) redirect("/account?access=denied");
  await db.$transaction([
    db.rideStaffAssignment.upsert({ where: { rideId_userId_role: { rideId, userId: membership.userId, role: role as "LEAD_CAPTAIN" | "CAPTAIN" | "VICE_CAPTAIN" | "SWEEP" | "MARSHAL" | "VOLUNTEER" } }, create: { rideId, communityId: ride.communityId, userId: membership.userId, role: role as "LEAD_CAPTAIN" | "CAPTAIN" | "VICE_CAPTAIN" | "SWEEP" | "MARSHAL" | "VOLUNTEER" }, update: {} }),
    db.communityAuditEvent.create({ data: { communityId: ride.communityId, actorUserId: session.userId, targetUserId: membership.userId, action: "RIDE_STAFF_ASSIGNED", metadata: { rideId, role } } }),
  ]);
  revalidatePath(editor(guildSlug, rideId));
  redirect(`${editor(guildSlug, rideId)}?staffSaved=1#staff`);
}

export async function removeRideStaff(formData: FormData) {
  const guildSlug = value(formData, "guildSlug", 80);
  const rideId = value(formData, "rideId", 36);
  const assignmentId = value(formData, "assignmentId", 36);
  const { session } = await requireRideManager(guildSlug);
  const assignment = await db.rideStaffAssignment.findFirst({ where: { id: assignmentId, rideId, ride: { community: { slug: guildSlug } } } });
  if (!assignment) redirect("/account?access=denied");
  await db.$transaction([
    db.rideStaffAssignment.delete({ where: { id: assignment.id } }),
    db.communityAuditEvent.create({ data: { communityId: assignment.communityId, actorUserId: session.userId, targetUserId: assignment.userId, action: "RIDE_STAFF_REMOVED", metadata: { rideId, role: assignment.role } } }),
  ]);
  revalidatePath(editor(guildSlug, rideId));
  redirect(`${editor(guildSlug, rideId)}?staffSaved=1#staff`);
}
