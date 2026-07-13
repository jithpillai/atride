import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { db } from "@/lib/db";
import { generateRideAssistantDraft } from "@/server/ai/gemini-provider";
import { parseRideAssistantInput, RIDE_ASSISTANT_SECTIONS, sanitizeAiSource } from "@/server/ai/ride-assistant";

const RIDE_ROLES = new Set(["OWNER", "ADMIN", "RIDE_MANAGER"]);
const DAILY_USER_LIMIT = 20;
const DAILY_RIDE_LIMIT = 10;

export async function POST(request: Request) {
  let generationId: string | undefined;
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to use the Ride Assistant.", 401);
    if (process.env.AI_ASSIST_ENABLED !== "true") throw new AuthError("AI_DISABLED", "The Ride Assistant is currently disabled.", 503);
    const body = await request.json() as { guildSlug?: unknown; rideId?: unknown; ride?: unknown; sourceAnnouncement?: unknown; requestedSections?: unknown };
    const guildSlug = typeof body.guildSlug === "string" ? body.guildSlug.slice(0, 80) : "";
    const rideId = typeof body.rideId === "string" ? body.rideId.slice(0, 36) : "";
    const membership = session.user.communityMemberships.find(({ community }) => community.slug === guildSlug);
    const managesGuildRides = membership?.roles.some(({ role }) => RIDE_ROLES.has(role));
    const assignedRideEditor = managesGuildRides ? null : await db.rideStaffAssignment.findFirst({ where: { rideId, userId: session.userId, role: { in: ["LEAD_CAPTAIN", "CAPTAIN", "VICE_CAPTAIN"] }, ride: { community: { slug: guildSlug } } }, select: { id: true } });
    if (!managesGuildRides && !assignedRideEditor) throw new AuthError("ACCESS_DENIED", "You cannot generate content for this ride.", 403);

    const ride = await db.ride.findFirst({
      where: { id: rideId, community: { slug: guildSlug } },
      select: { id: true, communityId: true, policies: { orderBy: [{ type: "asc" }, { version: "desc" }], select: { type: true, title: true, content: true } } },
    });
    if (!ride) throw new AuthError("RIDE_NOT_FOUND", "This ride is unavailable.", 404);

    const since = new Date(Date.now() - 86_400_000);
    const [userUsage, rideUsage] = await Promise.all([
      db.rideAiGeneration.count({ where: { userId: session.userId, createdAt: { gte: since } } }),
      db.rideAiGeneration.count({ where: { rideId: ride.id, createdAt: { gte: since } } }),
    ]);
    if (userUsage >= DAILY_USER_LIMIT || rideUsage >= DAILY_RIDE_LIMIT) throw new AuthError("AI_RATE_LIMIT", "This Ride Assistant has reached its daily generation limit. Use the external Gemini fallback or try tomorrow.", 429);

    const requestedSections = Array.isArray(body.requestedSections) ? body.requestedSections.filter((section): section is string => typeof section === "string" && RIDE_ASSISTANT_SECTIONS.includes(section)).slice(0, RIDE_ASSISTANT_SECTIONS.length) : RIDE_ASSISTANT_SECTIONS;
    const sections = requestedSections.length ? requestedSections : RIDE_ASSISTANT_SECTIONS;
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
    const generation = await db.rideAiGeneration.create({ data: { rideId: ride.id, userId: session.userId, model, status: "STARTED", sections } });
    generationId = generation.id;
    const latestPolicies = ride.policies.filter((policy, index, policies) => policies.findIndex((candidate) => candidate.type === policy.type) === index);
    const result = await generateRideAssistantDraft(parseRideAssistantInput(body.ride), sanitizeAiSource(typeof body.sourceAnnouncement === "string" ? body.sourceAnnouncement : ""), latestPolicies, sections);
    await db.$transaction([
      db.rideAiGeneration.update({ where: { id: generation.id }, data: { status: "SUCCEEDED", model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens } }),
      db.communityAuditEvent.create({ data: { communityId: ride.communityId, actorUserId: session.userId, action: "RIDE_AI_DRAFT_GENERATED", metadata: { rideId: ride.id, generationId: generation.id, model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens } } }),
    ]);
    return Response.json({ ok: true, draft: result.draft, usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens }, remaining: { user: Math.max(0, DAILY_USER_LIMIT - userUsage - 1), ride: Math.max(0, DAILY_RIDE_LIMIT - rideUsage - 1) } });
  } catch (error) {
    if (generationId) {
      await db.rideAiGeneration.update({ where: { id: generationId }, data: { status: "FAILED", errorCode: error instanceof AuthError ? error.code : "AI_UNAVAILABLE" } }).catch(() => undefined);
    }
    if (error instanceof AuthError) return authErrorResponse(error);
    console.error("Ride Assistant request failed", error);
    return Response.json({ ok: false, code: "AI_UNAVAILABLE", message: "The Ride Assistant is temporarily unavailable. Your ride form has not been changed." }, { status: 503 });
  }
}
