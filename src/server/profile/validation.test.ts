import { describe, expect, it } from "vitest";

import { parseProfileInput, parseVehicleInput, validateProfileInput } from "./validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("participant profile validation", () => {
  it("normalizes operational phone numbers and optional values", () => {
    const result = parseProfileInput(form({
      displayName: "  Priya Rider  ",
      homeCity: " Bengaluru ",
      operationalPhone: "+91 98765-43210",
    }));

    expect(result).toMatchObject({
      displayName: "Priya Rider",
      profile: { homeCity: "Bengaluru", operationalPhone: "+919876543210", homeState: null },
    });
  });

  it("rejects an incomplete emergency contact", () => {
    expect(parseProfileInput(form({ displayName: "Priya", homeCity: "Bengaluru", emergencyContactName: "Parent" }))).toBeNull();
  });

  it("preserves submitted values and identifies only the invalid fields", () => {
    const result = validateProfileInput(form({
      displayName: "Jith Pillai",
      homeCity: "Bengaluru",
      homeState: "Karnataka",
      operationalPhone: "123",
      emergencyContactName: "Divya",
      emergencyContactPhone: "9741118340",
      emergencyRelationship: "SPOUSE_PARTNER",
      dietaryPreference: "NON_VEGETARIAN",
      bloodGroup: "B_POSITIVE",
    }));

    expect(result.values).toMatchObject({ displayName: "Jith Pillai", homeState: "Karnataka", bloodGroup: "B_POSITIVE" });
    expect(result.errors).toEqual({ operationalPhone: "Use a 10-digit Indian number or include an international country code." });
  });

  it("normalizes Indian 10-digit numbers and canonical dropdown values", () => {
    const result = parseProfileInput(form({
      displayName: "Jith Pillai",
      homeCity: "Bengaluru",
      operationalPhone: "9595333556",
      emergencyContactName: "Divya",
      emergencyContactPhone: "9741118340",
      emergencyRelationship: "SPOUSE_PARTNER",
      dietaryPreference: "NON_VEGETARIAN",
      bloodGroup: "B_POSITIVE",
    }));

    expect(result?.profile).toMatchObject({
      operationalPhone: "+919595333556",
      emergencyContactPhone: "+919741118340",
      emergencyRelationship: "SPOUSE_PARTNER",
      dietaryPreference: "NON_VEGETARIAN",
      bloodGroup: "B_POSITIVE",
    });
  });
});

describe("vehicle validation", () => {
  it("defaults to a bike and retains only a normalized registration suffix", () => {
    const result = parseVehicleInput(form({ manufacturer: "Royal Enfield", model: "Himalayan", registrationLast4: " 45-x " }));

    expect(result).toMatchObject({ type: "BIKE", manufacturer: "Royal Enfield", model: "Himalayan", registrationLast4: "45X" });
  });

  it("rejects implausible manufacture years", () => {
    expect(parseVehicleInput(form({ type: "CAR", manufacturer: "Mahindra", model: "Thar", manufactureYear: "2040" }), new Date("2026-07-11"))).toBeNull();
  });
});
