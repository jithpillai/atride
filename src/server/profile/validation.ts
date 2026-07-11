const VEHICLE_TYPES = new Set(["BIKE", "CAR", "SUV", "JEEP", "OTHER"]);

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function optional(value: string) {
  return value || null;
}

function normalizePhone(value: string) {
  const normalized = value.replace(/[\s()-]/g, "");
  return normalized || null;
}

function validPhone(value: string | null) {
  return value === null || /^\+[1-9]\d{7,14}$/.test(value);
}

export function parseProfileInput(formData: FormData) {
  const displayName = text(formData, "displayName", 120);
  const homeCity = text(formData, "homeCity", 120);
  const homeState = text(formData, "homeState", 120);
  const operationalPhone = normalizePhone(text(formData, "operationalPhone", 24));
  const emergencyContactName = text(formData, "emergencyContactName", 120);
  const emergencyContactPhone = normalizePhone(text(formData, "emergencyContactPhone", 24));
  const emergencyRelationship = text(formData, "emergencyRelationship", 80);
  const dietaryPreference = text(formData, "dietaryPreference", 120);
  const accessibilityNotes = text(formData, "accessibilityNotes", 2000);

  if (displayName.length < 2 || homeCity.length < 2) return null;
  if (!validPhone(operationalPhone) || !validPhone(emergencyContactPhone)) return null;
  if ((emergencyContactName && !emergencyContactPhone) || (!emergencyContactName && emergencyContactPhone)) return null;

  return {
    displayName,
    profile: {
      homeCity,
      homeState: optional(homeState),
      operationalPhone,
      emergencyContactName: optional(emergencyContactName),
      emergencyContactPhone,
      emergencyRelationship: optional(emergencyRelationship),
      dietaryPreference: optional(dietaryPreference),
      accessibilityNotes: optional(accessibilityNotes),
    },
  };
}

export function parseVehicleInput(formData: FormData, now = new Date()) {
  const type = (text(formData, "type", 20) || "BIKE").toUpperCase();
  const nickname = text(formData, "nickname", 80);
  const manufacturer = text(formData, "manufacturer", 100);
  const model = text(formData, "model", 100);
  const color = text(formData, "color", 60);
  const registrationLast4 = text(formData, "registrationLast4", 4).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const yearValue = text(formData, "manufactureYear", 4);
  const manufactureYear = yearValue ? Number(yearValue) : null;
  const maximumYear = now.getFullYear() + 1;

  if (!VEHICLE_TYPES.has(type) || manufacturer.length < 2 || model.length < 1) return null;
  if (manufactureYear !== null && (!Number.isInteger(manufactureYear) || manufactureYear < 1950 || manufactureYear > maximumYear)) return null;
  if (registrationLast4 && registrationLast4.length < 2) return null;

  return {
    type: type as "BIKE" | "CAR" | "SUV" | "JEEP" | "OTHER",
    nickname: optional(nickname),
    manufacturer,
    model,
    manufactureYear,
    color: optional(color),
    registrationLast4: optional(registrationLast4),
  };
}
