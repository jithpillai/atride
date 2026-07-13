import { AuthError } from "@/server/auth/auth-service";
import { buildRideAssistantPrompt, normalizeStructuredDraft, type RideAssistantFormInput } from "@/server/ai/ride-assistant";

const responseSchema = {
  type: "OBJECT",
  required: ["description", "origins", "itinerary", "accommodation", "inclusions", "exclusions", "addOns", "meals", "activities", "missingFacts"],
  properties: {
    description: { type: "STRING" },
    origins: { type: "ARRAY", items: { type: "OBJECT", required: ["city", "meetingPoint", "departureAt", "capacity", "buffer", "mergePoint", "routeSummary"], properties: { city: { type: "STRING" }, meetingPoint: { type: "STRING" }, departureAt: { type: "STRING" }, capacity: { type: "STRING" }, buffer: { type: "STRING" }, mergePoint: { type: "STRING" }, routeSummary: { type: "STRING" } } } },
    itinerary: { type: "ARRAY", items: { type: "OBJECT", required: ["date", "title", "plan"], properties: { date: { type: "STRING" }, title: { type: "STRING" }, plan: { type: "STRING" } } } },
    accommodation: { type: "OBJECT", required: ["roomSummary", "amenities", "participantNote"], properties: { roomSummary: { type: "STRING" }, amenities: { type: "ARRAY", items: { type: "STRING" } }, participantNote: { type: "STRING" } } },
    inclusions: simpleItemSchema(), exclusions: simpleItemSchema(), addOns: simpleItemSchema(),
    meals: dayItemSchema(), activities: dayItemSchema(),
    missingFacts: { type: "ARRAY", items: { type: "STRING" } },
  },
};

function simpleItemSchema() {
  return { type: "ARRAY", items: { type: "OBJECT", required: ["title", "detail"], properties: { title: { type: "STRING" }, detail: { type: "STRING" } } } };
}

function dayItemSchema() {
  return { type: "ARRAY", items: { type: "OBJECT", required: ["dayNumber", "title", "detail"], properties: { dayNumber: { type: "INTEGER" }, title: { type: "STRING" }, detail: { type: "STRING" } } } };
}

export async function generateRideAssistantDraft(input: RideAssistantFormInput, sourceAnnouncement: string, guildPolicies: Array<{ type: string; title: string; content: string }>, requestedSections?: string[]) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
  if (process.env.AI_ASSIST_ENABLED !== "true" || !apiKey) throw new AuthError("AI_NOT_CONFIGURED", "The Ride Assistant is not configured yet.", 503);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildRideAssistantPrompt(input, sourceAnnouncement, guildPolicies, requestedSections) }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8_192, responseMimeType: "application/json", responseSchema },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    error?: { message?: string; status?: string };
  };
  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502;
    console.error("Gemini ride generation failed", { status: response.status, providerStatus: payload.error?.status, detail: payload.error?.message });
    throw new AuthError(response.status === 429 ? "AI_QUOTA_EXCEEDED" : "AI_PROVIDER_ERROR", response.status === 429 ? "The AI quota is temporarily exhausted. Use the external Gemini fallback or try later." : "Gemini could not generate the ride draft right now.", status);
  }
  const output = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!output) throw new AuthError("AI_EMPTY_RESPONSE", "Gemini returned an empty ride draft. Please try again.", 502);
  let parsed: unknown;
  try { parsed = JSON.parse(output); } catch { throw new AuthError("AI_INVALID_RESPONSE", "Gemini returned an invalid ride draft. Please try again.", 502); }
  return {
    model,
    draft: normalizeStructuredDraft(parsed && typeof parsed === "object" ? parsed : {}, input),
    inputTokens: payload.usageMetadata?.promptTokenCount,
    outputTokens: payload.usageMetadata?.candidatesTokenCount,
  };
}
