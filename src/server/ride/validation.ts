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

function rows(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => line.split("|").map((part) => part.trim()));
}

export function parseOrigins(value: string) {
  return rows(value).map((parts, sortOrder) => {
    if (parts.length < 3 || !parts[0] || !parts[1]) throw new Error("Invalid origin row");
    return { city: parts[0], meetingPoint: parts[1], departureAt: requiredDate(parts[2]), capacity: parts[3] ? positiveInteger(parts[3], 1) : null, bufferCapacity: parts[4] ? positiveInteger(parts[4]) : 0, mergePoint: parts[5] || null, sortOrder };
  });
}

export function parseItinerary(value: string) {
  return rows(value).map((parts, index) => {
    if (parts.length < 3 || !parts[1] || !parts[2]) throw new Error("Invalid itinerary row");
    return { dayNumber: index + 1, date: requiredDate(parts[0]), title: parts[1], summary: parts.slice(2).join(" | ") };
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
    return { dayNumber: positiveInteger(parts[0], 1), title: parts[1], description: parts.slice(2).join(" | ") || null, sortOrder };
  });
}
