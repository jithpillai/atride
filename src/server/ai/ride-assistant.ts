export type RideAssistantFormInput = {
  title: string;
  summary: string;
  description: string;
  destination: string;
  startsAt: string;
  endsAt: string;
  price: string;
  confirmationDeposit: string;
  totalSlots: string;
  bufferSlots: string;
  distanceKm: string;
  vehicleType: string;
  vehicleRequirements: string;
  difficulty: string;
  origins: string;
  itinerary: string;
  propertyName: string;
  propertyLocality: string;
  checkInAt: string;
  checkOutAt: string;
  roomSummary: string;
  amenities: string;
  participantNote: string;
  inclusions: string;
  exclusions: string;
  addOns: string;
  meals: string;
  activities: string;
};

export type RideAssistantDraft = {
  description: string;
  origins: string;
  itinerary: string;
  roomSummary: string;
  amenities: string;
  participantNote: string;
  inclusions: string;
  exclusions: string;
  addOns: string;
  meals: string;
  activities: string;
  missingFacts: string[];
};

const PHONE = /(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL = /https?:\/\/\S+|(?:chat\.)?whatsapp\.com\/\S+/gi;
const UPI = /\b[\w.-]{2,}@[a-z][a-z0-9.-]{2,}\b/gi;
const PARTICIPANT_ROW = /^\s*\d{1,3}[.)-]\s+.*\b(?:rider|pillion|non[ -]?veg|vegetarian|veg)\b.*$/i;

export function sanitizeAiSource(value: string, maximum = 20_000) {
  return value
    .slice(0, maximum)
    .split(/\r?\n/)
    .filter((line) => !PARTICIPANT_ROW.test(line))
    .join("\n")
    .replace(PHONE, "[phone removed]")
    .replace(EMAIL, "[email removed]")
    .replace(URL, "[private link removed]")
    .replace(UPI, "[payment identifier removed]")
    .trim();
}

function text(value: unknown, maximum: number) {
  return sanitizeAiSource(typeof value === "string" ? value : "", maximum);
}

export function parseRideAssistantInput(value: unknown): RideAssistantFormInput {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    title: text(input.title, 180), summary: text(input.summary, 1_000), description: text(input.description, 10_000),
    destination: text(input.destination, 160), startsAt: text(input.startsAt, 40), endsAt: text(input.endsAt, 40),
    price: text(input.price, 20), confirmationDeposit: text(input.confirmationDeposit, 20), totalSlots: text(input.totalSlots, 8),
    bufferSlots: text(input.bufferSlots, 8), distanceKm: text(input.distanceKm, 8), vehicleType: text(input.vehicleType, 20), vehicleRequirements: text(input.vehicleRequirements, 3_000),
    difficulty: text(input.difficulty, 20), origins: text(input.origins, 8_000), itinerary: text(input.itinerary, 15_000),
    propertyName: text(input.propertyName, 180), propertyLocality: text(input.propertyLocality, 180), checkInAt: text(input.checkInAt, 40),
    checkOutAt: text(input.checkOutAt, 40), roomSummary: text(input.roomSummary, 2_000), amenities: text(input.amenities, 1_000),
    participantNote: text(input.participantNote, 3_000), inclusions: text(input.inclusions, 8_000), exclusions: text(input.exclusions, 8_000),
    addOns: text(input.addOns, 8_000), meals: text(input.meals, 8_000), activities: text(input.activities, 8_000),
  };
}

type StructuredDraft = {
  description?: unknown;
  origins?: unknown;
  itinerary?: unknown;
  accommodation?: unknown;
  inclusions?: unknown;
  exclusions?: unknown;
  addOns?: unknown;
  meals?: unknown;
  activities?: unknown;
  missingFacts?: unknown;
};

function rows(value: unknown, formatter: (row: Record<string, unknown>) => string | null) {
  if (!Array.isArray(value)) return "";
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const formatted = formatter(item as Record<string, unknown>);
    return formatted ? [formatted] : [];
  }).join("\n");
}

function clean(value: unknown, maximum = 5_000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function optionalWholeNumber(value: unknown, minimum: number) {
  const text = typeof value === "number" || typeof value === "string" ? String(value).trim() : "";
  if (!/^\d+$/.test(text)) return "";
  const number = Number(text);
  return Number.isSafeInteger(number) && number >= minimum ? String(number) : "";
}

export function requiredItineraryDates(input: Pick<RideAssistantFormInput, "startsAt" | "endsAt">) {
  const startText = input.startsAt.slice(0, 10);
  const endText = input.endsAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startText) || !/^\d{4}-\d{2}-\d{2}$/.test(endText)) return [];
  const start = new Date(`${startText}T00:00:00Z`);
  const end = new Date(`${endText}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const dates: string[] = [];
  for (let date = start; date <= end && dates.length < 60; date = new Date(date.getTime() + 86_400_000)) dates.push(date.toISOString().slice(0, 10));
  return dates;
}

function completeItinerary(generated: string, input: RideAssistantFormInput) {
  const requiredDates = requiredItineraryDates(input);
  if (!requiredDates.length) return { itinerary: generated, missingDates: [] as string[] };
  const generatedRows = new Map(generated.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => [line.slice(0, 10), line]));
  const origin = input.origins.split("\n")[0]?.split("|")[0]?.trim() || "Starting point";
  const missingDates: string[] = [];
  const itinerary = requiredDates.map((date, index) => {
    const existing = generatedRows.get(date);
    if (existing) return existing;
    missingDates.push(date);
    const last = index === requiredDates.length - 1;
    const title = index === 0 ? `${origin} to ${input.destination || "destination"}` : last ? `${input.destination || "Destination"} to ${origin}` : `${input.destination || "Destination"} ride plan`;
    return `${date} | ${title} | Organizer to confirm planned stops, meals, activities, and timing for Day ${index + 1}.`;
  }).join("\n");
  return { itinerary, missingDates };
}

export function normalizeStructuredDraft(value: StructuredDraft, input?: RideAssistantFormInput): RideAssistantDraft {
  const accommodation = value.accommodation && typeof value.accommodation === "object" ? value.accommodation as Record<string, unknown> : {};
  const simple = (items: unknown) => rows(items, (row) => {
    const title = clean(row.title, 180);
    if (!title) return null;
    const detail = clean(row.detail, 2_000);
    return `${title}${detail ? ` | ${detail}` : ""}`;
  });
  const dayItems = (items: unknown) => rows(items, (row) => {
    const day = Number(row.dayNumber);
    const title = clean(row.title, 180);
    if (!Number.isInteger(day) || day < 1 || !title) return null;
    const detail = clean(row.detail, 2_000);
    return `${day} | ${title}${detail ? ` | ${detail}` : ""}`;
  });
  const generatedItinerary = rows(value.itinerary, (row) => {
    const date = clean(row.date, 20); const title = clean(row.title, 180); const plan = clean(row.plan, 4_000);
    return date && title && plan ? `${date} | ${title} | ${plan}` : null;
  });
  const completedItinerary = input ? completeItinerary(generatedItinerary, input) : { itinerary: generatedItinerary, missingDates: [] as string[] };
  const reportedMissingFacts = Array.isArray(value.missingFacts) ? value.missingFacts.map((item) => clean(item, 300)).filter(Boolean).slice(0, 30) : [];
  const missingFacts = [...reportedMissingFacts, ...completedItinerary.missingDates.map((date) => `Confirm the detailed itinerary, stops, meals, activities, and timing for ${date}.`)].filter((fact, index, facts) => facts.indexOf(fact) === index).slice(0, 30);
  return {
    description: clean(value.description, 10_000),
    origins: rows(value.origins, (row) => {
      const city = clean(row.city, 120); const meetingPoint = clean(row.meetingPoint, 240); const departureAt = clean(row.departureAt, 40);
      if (!city || !meetingPoint || !departureAt) return null;
      return [city, meetingPoint, departureAt, optionalWholeNumber(row.capacity, 1), optionalWholeNumber(row.buffer, 0), clean(row.mergePoint, 240), clean(row.routeSummary, 1_000)].join(" | ");
    }),
    itinerary: completedItinerary.itinerary,
    roomSummary: clean(accommodation.roomSummary, 2_000),
    amenities: Array.isArray(accommodation.amenities) ? accommodation.amenities.map((item) => clean(item, 100)).filter(Boolean).slice(0, 30).join(", ") : "",
    participantNote: clean(accommodation.participantNote, 3_000),
    inclusions: simple(value.inclusions), exclusions: simple(value.exclusions), addOns: simple(value.addOns),
    meals: dayItems(value.meals), activities: dayItems(value.activities),
    missingFacts,
  };
}

export const RIDE_ASSISTANT_SECTIONS = ["description", "origins", "itinerary", "accommodation", "inclusions", "exclusions", "addOns", "meals", "activities"];

export function buildRideAssistantPrompt(input: RideAssistantFormInput, sourceAnnouncement: string, guildPolicies: Array<{ type: string; title: string; content: string }>, requestedSections: string[] = RIDE_ASSISTANT_SECTIONS) {
  const itineraryDates = requiredItineraryDates(input);
  return `You are the AtRide Ride Studio assistant. Convert the organizer's factual ride information into complete, concise structured ride content for an Indian adventure-travel community platform.

Rules:
- Treat SAVED_RIDE_INPUT as authoritative. OPTIONAL_SOURCE may add facts only when it does not conflict.
- Never invent a hotel, price, meal, amenity, activity, meeting point, time, capacity, policy, or inclusion.
- Use "To be confirmed" only where a required structured field cannot be omitted. Also list every unresolved factual gap in missingFacts.
- Do not include participant names, phone numbers, email addresses, payment handles, payment evidence, private invite links, or medical information.
- Do not rewrite or weaken Guild policies. They are context only and are saved separately.
- Keep destination capacity independent from optional starting-group allocations.
- Return dates as YYYY-MM-DD, and local date-times as YYYY-MM-DDTHH:mm without timezone suffix.
- Produce useful factual copy, not exaggerated marketing claims.
- Give primary attention to these requested sections: ${requestedSections.join(", ")}. Return the complete schema, using empty values for unrequested sections when appropriate.
- For itinerary, return exactly one chronological row for every REQUIRED_ITINERARY_DATE. Never omit arrival, intermediate, exploration, rest, or return days.
- Enrich each itinerary day from the organizer's summary, description, activities, meals, accommodation facts, and OPTIONAL_SOURCE. Do not merely repeat a generic example when confirmed details exist.
- Place each concrete route, attraction, activity, meal, or stay detail from the authoritative inputs into the most relevant itinerary day exactly once. If its day is not confirmed, describe the assignment as proposed and add that scheduling decision to missingFacts.
- Accommodation checkInAt/checkOutAt values are property windows, not ride deadlines. Never mention their exact times in itinerary plans unless OPTIONAL_SOURCE explicitly repeats them as operational ride timing.
- startsAt and endsAt bound the ride record; startsAt may be used as the initial departure when an origin matches it, but never promise arrival by endsAt unless the organizer explicitly supplied that arrival deadline.
- When a day's detailed plan is genuinely unknown, write a concise confirmation-needed plan and add the specific gap to missingFacts rather than omitting the day or inventing places/times.

REQUIRED_ITINERARY_DATES:
${JSON.stringify(itineraryDates)}

SAVED_RIDE_INPUT:
${JSON.stringify(input, null, 2)}

GUILD_POLICY_CONTEXT:
${JSON.stringify(guildPolicies, null, 2)}

OPTIONAL_SOURCE:
${sourceAnnouncement || "Not supplied"}`;
}

export function buildExternalRideAssistantPrompt(input: RideAssistantFormInput, sourceAnnouncement: string) {
  return `${buildRideAssistantPrompt(input, sanitizeAiSource(sourceAnnouncement), [])}

Return only these labelled sections, using the exact line formats shown:
[DESCRIPTION]\nA clear public description
[STARTING_GROUPS]\nCity | Meeting point | YYYY-MM-DDTHH:mm | optional Capacity | optional Buffer | Merge point | Route summary
[ITINERARY]\nYYYY-MM-DD | Day title | Plan and places covered
[ACCOMMODATION]\nRoom summary: ...\nAmenities: comma-separated values\nParticipant note: ...
[INCLUSIONS]\nTitle | detail
[EXCLUSIONS]\nTitle | detail
[ADD_ONS]\nTitle | detail
[MEALS]\nDay number | Meal | Menu or detail
[ACTIVITIES]\nDay number | Activity | Detail
[MISSING_FACTS]\nOne unresolved fact per line

Do not use markdown tables or code fences.`;
}
