export function validRideSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length >= 3 && value.length <= 100;
}

export function moneyToPaise(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount * 100)) throw new Error("Invalid money value");
  return Math.round(amount * 100);
}

export function positiveInteger(value: string, minimum = 0) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum) throw new Error("Invalid integer");
  return number;
}

export function requiredDate(value: string) {
  const zonedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00+05:30`
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
      ? `${value}:00+05:30`
      : value;
  const date = new Date(zonedValue);
  if (!value || Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date;
}

export function optionalDate(value: string) {
  return value ? requiredDate(value) : null;
}

export function requiredCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid date");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid date");
  return date;
}

function rows(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => line.split("|").map((part) => part.trim()));
}

export function parseOrigins(value: string) {
  return rows(value).map((parts, sortOrder) => {
    if (parts.length < 3 || !parts[0] || !parts[1]) throw new Error("Invalid origin row");
    let capacity: number | null = null;
    try {
      capacity = parts[3] ? positiveInteger(parts[3], 1) : null;
    } catch {
      throw new Error(`Invalid origin capacity:${sortOrder + 1}`);
    }
    return { city: parts[0], meetingPoint: parts[1], departureAt: requiredDate(parts[2]), capacity, bufferCapacity: 0, mergePoint: parts[4] || null, routeSummary: parts.slice(5).join(" | ") || null, sortOrder };
  });
}

export function parseItinerary(value: string) {
  const calendarDays = new Map<string, number>();
  return rows(value).map((parts, sortOrder) => {
    if (parts.length < 3 || !parts[1] || !parts[2]) throw new Error("Invalid itinerary row");
    const dateOrTime = parts[0];
    const hasTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateOrTime);
    const dateText = hasTime ? dateOrTime.slice(0, 10) : dateOrTime;
    const date = requiredCalendarDate(dateText);
    const scheduledAt = hasTime ? requiredDate(dateOrTime) : null;
    if (!calendarDays.has(dateText)) calendarDays.set(dateText, calendarDays.size + 1);
    return { dayNumber: calendarDays.get(dateText)!, sortOrder, date, scheduledAt, title: parts[1], summary: parts.slice(2).join(" | ") };
  });
}

export function parseSimpleItems(value: string) {
  return rows(value).map((parts, sortOrder) => {
    if (!parts[0]) throw new Error("Invalid package row");
    return { title: parts[0], description: parts[1] || null, sortOrder };
  });
}

export function parseDayItems(value: string) {
  return rows(value).map((parts, sortOrder) => {
    if (parts.length < 2 || !parts[1]) throw new Error("Invalid day package row");
    let dayNumber: number;
    try {
      dayNumber = positiveInteger(parts[0], 1);
    } catch {
      throw new Error(`Invalid package day:${sortOrder + 1}`);
    }
    return { dayNumber, title: parts[1], description: parts.slice(2).join(" | ") || null, sortOrder };
  });
}

export function parseAccommodationOptions(value: string) {
  const names = new Set<string>();
  return rows(value).map((parts, sortOrder) => {
    if (parts.length < 4 || !parts[0]) throw new Error(`Invalid accommodation option:${sortOrder + 1}`);
    const normalizedName = parts[0].toLocaleLowerCase("en-IN");
    if (names.has(normalizedName)) throw new Error(`Invalid accommodation option:${sortOrder + 1}`);
    names.add(normalizedName);
    const pricingMode = parts[1]?.toUpperCase();
    if (!new Set(["INCLUDED", "PER_PERSON", "PER_ROOM"]).has(pricingMode)) throw new Error(`Invalid accommodation option:${sortOrder + 1}`);
    let pricePaise: number;
    let maxOccupancy: number;
    let availableRooms: number | null;
    try {
      pricePaise = moneyToPaise(parts[2] || "0");
      maxOccupancy = positiveInteger(parts[3], 1);
      availableRooms = parts[4] ? positiveInteger(parts[4], 1) : null;
    } catch {
      throw new Error(`Invalid accommodation option:${sortOrder + 1}`);
    }
    return {
      name: parts[0],
      pricingMode: pricingMode as "INCLUDED" | "PER_PERSON" | "PER_ROOM",
      pricePaise: pricingMode === "INCLUDED" ? 0 : pricePaise,
      maxOccupancy,
      availableRooms,
      description: parts.slice(5).join(" | ") || null,
      sortOrder,
    };
  });
}
