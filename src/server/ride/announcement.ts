import { sanitizeAiSource } from "../ai/ride-assistant";

type AnnouncementRide = {
  title: string; summary: string; destination: string; startsAt: Date; endsAt: Date; pricePaise: number;
  confirmationDepositPaise: number; totalSlots: number; waitlistCapacity: number; bookedSlots: number; status: string;
  slug: string; vehicleType: string; distanceKm: number; updatedAt: Date;
  community: { name: string };
  origins: Array<{ city: string; meetingPoint: string; departureAt: Date; mergePoint: string | null; routeSummary: string | null }>;
  itineraryDays: Array<{ dayNumber: number; date: Date; scheduledAt: Date | null; title: string; summary: string }>;
  accommodations: Array<{ propertyName: string; locality: string; roomSummary: string; amenities: string[]; exactLocationRestricted: boolean }>;
  packageItems: Array<{ type: string; dayNumber: number | null; title: string; description: string | null }>;
  policies: Array<{ type: string; title: string; content: string; version: number }>;
};

function date(date: Date) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(date); }
function dateRange(startsAt: Date, endsAt: Date) {
  const start = date(startsAt);
  const end = date(endsAt);
  return start === end ? start : `${start} to ${end}`;
}
function time(dateValue: Date) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(dateValue); }
function money(paise: number) { return `₹${(paise / 100).toLocaleString("en-IN")}`; }
function itemLine(item: { dayNumber: number | null; title: string; description: string | null }) { return `- ${item.dayNumber ? `Day ${item.dayNumber}: ` : ""}${item.title}${item.description ? ` — ${item.description}` : ""}`; }
function vehicleIcon(vehicleType: string) {
  return ({ BIKE: "🏍️", CAR: "🚗", SUV: "🚙", JEEP: "🚙", OTHER: "🚗" } as Record<string, string>)[vehicleType] ?? "🏍️";
}

export function generateAnnouncementText(ride: AnnouncementRide, appUrl = "https://atride.in") {
  const byType = (type: string) => ride.packageItems.filter((item) => item.type === type);
  const latestPolicies = ride.policies.slice().sort((a, b) => b.version - a.version).filter((policy, index, policies) => policies.findIndex((candidate) => candidate.type === policy.type) === index);
  const stay = ride.accommodations[0];
  const available = Math.max(0, ride.totalSlots - ride.bookedSlots);
  const sections = [
    `🏍️ *${ride.community.name} — ${ride.title}*`,
    ride.summary,
    `📍 *Destination:* ${ride.destination}`,
    `📅 *Dates:* ${dateRange(ride.startsAt, ride.endsAt)}`,
    `🛣️ *Distance:* ${ride.distanceKm.toLocaleString("en-IN")} km`,
    `${vehicleIcon(ride.vehicleType)} *Vehicle:* ${ride.vehicleType.replaceAll("_", " ")}`,
    `💰 *Ride fee:* ${money(ride.pricePaise)} per person${ride.confirmationDepositPaise ? `\n*Confirmation amount:* ${money(ride.confirmationDepositPaise)}` : ""}`,
    `🎟️ *Availability:* ${available > 0 ? `${available} slot${available === 1 ? "" : "s"} currently available` : "Slots closed"}`,
    `*Starting groups*\n${ride.origins.map((origin) => `- ${origin.city}: ${origin.meetingPoint}, ${time(origin.departureAt)}${origin.mergePoint ? `; merges at ${origin.mergePoint}` : ""}${origin.routeSummary ? `\n  Route: ${origin.routeSummary}` : ""}`).join("\n")}`,
    `*Day-wise plan*\n${ride.itineraryDays.map((day) => `- Day ${day.dayNumber} (${day.scheduledAt ? time(day.scheduledAt) : date(day.date)}): ${day.title} — ${day.summary}`).join("\n")}`,
    stay ? `*Accommodation*\n${stay.exactLocationRestricted ? "- Stay is included; exact property/location details are shared with confirmed participants." : `- ${stay.propertyName}, ${stay.locality}`}${stay.roomSummary ? `\n- ${stay.roomSummary}` : ""}${stay.amenities.length ? `\n- Amenities: ${stay.amenities.join(", ")}` : ""}` : "",
    byType("MEAL").length ? `*Meals*\n${byType("MEAL").map(itemLine).join("\n")}` : "",
    byType("ACTIVITY").length ? `*Activities and highlights*\n${byType("ACTIVITY").map(itemLine).join("\n")}` : "",
    byType("INCLUSION").length ? `*Budget includes*\n${byType("INCLUSION").map(itemLine).join("\n")}` : "",
    byType("EXCLUSION").length ? `*Not included*\n${byType("EXCLUSION").map(itemLine).join("\n")}` : "",
    byType("ADD_ON").length ? `*Optional add-ons*\n${byType("ADD_ON").map(itemLine).join("\n")}` : "",
    ...latestPolicies.map((policy) => `*${policy.title}*\n${policy.content}`),
  ].filter(Boolean).join("\n\n");
  const safeContent = sanitizeAiSource(sections, 45_000);
  return `${safeContent}\n\nView the current ride details and availability:\n${appUrl.replace(/\/$/, "")}/rides/${ride.slug}`;
}
