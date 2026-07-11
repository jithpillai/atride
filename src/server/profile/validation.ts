const VEHICLE_TYPES = new Set(["BIKE", "CAR", "SUV", "JEEP", "OTHER"]);

export const RELATIONSHIPS = ["SPOUSE_PARTNER", "PARENT", "SIBLING", "CHILD", "GUARDIAN", "FRIEND", "COLLEAGUE", "OTHER"] as const;
export const DIETARY_PREFERENCES = ["NO_PREFERENCE", "VEGETARIAN", "NON_VEGETARIAN", "VEGAN", "EGGETARIAN", "JAIN", "OTHER", "PREFER_NOT_TO_SAY"] as const;
export const BLOOD_GROUPS = ["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE", "UNKNOWN", "PREFER_NOT_TO_SAY"] as const;

const RELATIONSHIP_VALUES = new Set<string>(RELATIONSHIPS);
const DIETARY_VALUES = new Set<string>(DIETARY_PREFERENCES);
const BLOOD_GROUP_VALUES = new Set<string>(BLOOD_GROUPS);

export type ProfileFormValues = {
  displayName: string;
  homeCity: string;
  homeState: string;
  operationalPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyRelationship: string;
  dietaryPreference: string;
  bloodGroup: string;
  accessibilityNotes: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
};

export type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string>>;

export type ProfileFormState = {
  values: ProfileFormValues;
  errors: ProfileFormErrors;
  message?: string;
  revision: number;
};

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function optional(value: string) {
  return value || null;
}

export function normalizePhone(value: string) {
  const normalized = value.replace(/[\s()-]/g, "");
  if (!normalized) return null;
  if (/^\d{10}$/.test(normalized)) return `+91${normalized}`;
  if (/^91\d{10}$/.test(normalized)) return `+${normalized}`;
  return normalized;
}

export function validPhone(value: string | null) {
  return value === null || /^\+[1-9]\d{7,14}$/.test(value);
}

export function profileValues(formData: FormData): ProfileFormValues {
  return {
    displayName: text(formData, "displayName", 120),
    homeCity: text(formData, "homeCity", 120),
    homeState: text(formData, "homeState", 120),
    operationalPhone: text(formData, "operationalPhone", 24),
    emergencyContactName: text(formData, "emergencyContactName", 120),
    emergencyContactPhone: text(formData, "emergencyContactPhone", 24),
    emergencyRelationship: text(formData, "emergencyRelationship", 80),
    dietaryPreference: text(formData, "dietaryPreference", 120),
    bloodGroup: text(formData, "bloodGroup", 20),
    accessibilityNotes: text(formData, "accessibilityNotes", 2000),
    acceptTerms: formData.get("acceptTerms") === "on",
    acceptPrivacy: formData.get("acceptPrivacy") === "on",
  };
}

export function validateProfileInput(formData: FormData) {
  const values = profileValues(formData);
  const operationalPhone = normalizePhone(values.operationalPhone);
  const emergencyContactPhone = normalizePhone(values.emergencyContactPhone);
  const errors: ProfileFormErrors = {};

  if (values.displayName.length < 2) errors.displayName = "Enter at least two characters.";
  if (values.homeCity.length < 2) errors.homeCity = "Enter your home city.";
  if (!validPhone(operationalPhone)) errors.operationalPhone = "Use a 10-digit Indian number or include an international country code.";
  if (!validPhone(emergencyContactPhone)) errors.emergencyContactPhone = "Use a 10-digit Indian number or include an international country code.";
  if (values.emergencyContactName && !emergencyContactPhone) errors.emergencyContactPhone = "Enter the emergency contact's phone number.";
  if (!values.emergencyContactName && emergencyContactPhone) errors.emergencyContactName = "Enter the emergency contact's name.";
  if ((values.emergencyContactName || emergencyContactPhone) && !RELATIONSHIP_VALUES.has(values.emergencyRelationship)) {
    errors.emergencyRelationship = "Select the emergency contact's relationship.";
  }
  if (values.emergencyRelationship && !RELATIONSHIP_VALUES.has(values.emergencyRelationship)) errors.emergencyRelationship = "Select a valid relationship.";
  if (values.dietaryPreference && !DIETARY_VALUES.has(values.dietaryPreference)) errors.dietaryPreference = "Select a valid dietary preference.";
  if (values.bloodGroup && !BLOOD_GROUP_VALUES.has(values.bloodGroup)) errors.bloodGroup = "Select a valid blood group.";

  return {
    values,
    errors,
    data: Object.keys(errors).length ? null : {
      displayName: values.displayName,
      profile: {
        homeCity: values.homeCity,
        homeState: optional(values.homeState),
        operationalPhone,
        emergencyContactName: optional(values.emergencyContactName),
        emergencyContactPhone,
        emergencyRelationship: optional(values.emergencyRelationship),
        dietaryPreference: optional(values.dietaryPreference),
        bloodGroup: optional(values.bloodGroup),
        accessibilityNotes: optional(values.accessibilityNotes),
      },
    },
  };
}

export function parseProfileInput(formData: FormData) {
  return validateProfileInput(formData).data;
}

type InitialProfileFormValues = { [Key in keyof ProfileFormValues]?: ProfileFormValues[Key] | null };

export function emptyProfileFormState(values: InitialProfileFormValues = {}): ProfileFormState {
  return {
    values: {
      displayName: values.displayName ?? "",
      homeCity: values.homeCity ?? "",
      homeState: values.homeState ?? "",
      operationalPhone: values.operationalPhone ?? "",
      emergencyContactName: values.emergencyContactName ?? "",
      emergencyContactPhone: values.emergencyContactPhone ?? "",
      emergencyRelationship: values.emergencyRelationship ?? "",
      dietaryPreference: values.dietaryPreference ?? "",
      bloodGroup: values.bloodGroup ?? "",
      accessibilityNotes: values.accessibilityNotes ?? "",
      acceptTerms: values.acceptTerms ?? false,
      acceptPrivacy: values.acceptPrivacy ?? false,
    },
    errors: {},
    revision: 0,
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
