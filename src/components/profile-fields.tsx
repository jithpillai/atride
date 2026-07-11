import type { ProfileFormErrors, ProfileFormValues } from "@/server/profile/validation";

const baseInputClass = "mt-2 w-full rounded-2xl border bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600";

function fieldClass(hasError?: boolean) {
  return `${baseInputClass} ${hasError ? "border-red-400/70 focus:border-red-400 focus:ring-2 focus:ring-red-400/20" : "border-white/10 focus:border-orange-500"}`;
}

function FieldError({ name, errors }: { name: keyof ProfileFormValues; errors: ProfileFormErrors }) {
  const error = errors[name];
  return error ? <span id={`${name}-error`} className="mt-1.5 block text-xs font-semibold text-red-400">{error}</span> : null;
}

const relationships = [
  ["SPOUSE_PARTNER", "Spouse / Partner"], ["PARENT", "Parent"], ["SIBLING", "Sibling"],
  ["CHILD", "Child"], ["GUARDIAN", "Guardian"], ["FRIEND", "Friend"],
  ["COLLEAGUE", "Colleague"], ["OTHER", "Other"],
];

const diets = [
  ["NO_PREFERENCE", "No preference"], ["VEGETARIAN", "Vegetarian"],
  ["NON_VEGETARIAN", "Non-vegetarian"], ["VEGAN", "Vegan"],
  ["EGGETARIAN", "Eggetarian"], ["JAIN", "Jain"], ["OTHER", "Other"],
  ["PREFER_NOT_TO_SAY", "Prefer not to say"],
];

const bloodGroups = [
  ["A_POSITIVE", "A+"], ["A_NEGATIVE", "A−"], ["B_POSITIVE", "B+"], ["B_NEGATIVE", "B−"],
  ["AB_POSITIVE", "AB+"], ["AB_NEGATIVE", "AB−"], ["O_POSITIVE", "O+"], ["O_NEGATIVE", "O−"],
  ["UNKNOWN", "Don't know"], ["PREFER_NOT_TO_SAY", "Prefer not to say"],
];

type Props = { values: ProfileFormValues; errors?: ProfileFormErrors };

export function ProfileFields({ values, errors = {} }: Props) {
  const errorProps = (name: keyof ProfileFormValues) => ({
    "aria-invalid": errors[name] ? true as const : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold text-zinc-200">Display name<input required minLength={2} maxLength={120} name="displayName" defaultValue={values.displayName} className={fieldClass(Boolean(errors.displayName))} {...errorProps("displayName")} /><FieldError name="displayName" errors={errors} /></label>
      <label className="text-sm font-semibold text-zinc-200">Home city<input required minLength={2} maxLength={120} name="homeCity" defaultValue={values.homeCity} placeholder="Bengaluru" className={fieldClass(Boolean(errors.homeCity))} {...errorProps("homeCity")} /><FieldError name="homeCity" errors={errors} /></label>
      <label className="text-sm font-semibold text-zinc-200">State<input maxLength={120} name="homeState" defaultValue={values.homeState} placeholder="Karnataka" className={fieldClass(Boolean(errors.homeState))} {...errorProps("homeState")} /><FieldError name="homeState" errors={errors} /></label>
      <label className="text-sm font-semibold text-zinc-200">Phone number <span className="font-normal text-amber-400">· Unverified</span><input type="tel" inputMode="tel" maxLength={24} name="operationalPhone" defaultValue={values.operationalPhone} placeholder="9000000001" className={fieldClass(Boolean(errors.operationalPhone))} {...errorProps("operationalPhone")} /><span className="mt-1.5 block text-xs font-normal text-zinc-600">Indian 10-digit numbers get +91 automatically. Used only for booked-ride operations.</span><FieldError name="operationalPhone" errors={errors} /></label>
      <label className="text-sm font-semibold text-zinc-200">Emergency contact name<input maxLength={120} name="emergencyContactName" defaultValue={values.emergencyContactName} className={fieldClass(Boolean(errors.emergencyContactName))} {...errorProps("emergencyContactName")} /><FieldError name="emergencyContactName" errors={errors} /></label>
      <label className="text-sm font-semibold text-zinc-200">Emergency contact phone<input type="tel" inputMode="tel" maxLength={24} name="emergencyContactPhone" defaultValue={values.emergencyContactPhone} placeholder="9000000002" className={fieldClass(Boolean(errors.emergencyContactPhone))} {...errorProps("emergencyContactPhone")} /><FieldError name="emergencyContactPhone" errors={errors} /></label>
      <label className="text-sm font-semibold text-zinc-200">Relationship<select name="emergencyRelationship" defaultValue={values.emergencyRelationship} className={fieldClass(Boolean(errors.emergencyRelationship))} {...errorProps("emergencyRelationship")}><option value="">Select relationship</option>{relationships.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><FieldError name="emergencyRelationship" errors={errors} /></label>
      <label className="text-sm font-semibold text-zinc-200">Dietary preference<select name="dietaryPreference" defaultValue={values.dietaryPreference} className={fieldClass(Boolean(errors.dietaryPreference))} {...errorProps("dietaryPreference")}><option value="">Select preference</option>{diets.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><FieldError name="dietaryPreference" errors={errors} /></label>
      <label className="text-sm font-semibold text-zinc-200 sm:col-span-2">Blood group <span className="font-normal text-amber-400">· Self-reported</span><select name="bloodGroup" defaultValue={values.bloodGroup} className={fieldClass(Boolean(errors.bloodGroup))} {...errorProps("bloodGroup")}><option value="">Select blood group</option>{bloodGroups.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="mt-1.5 block text-xs font-normal leading-5 text-zinc-600">Emergency reference only. Medical professionals must independently test and confirm compatibility.</span><FieldError name="bloodGroup" errors={errors} /></label>
      <label className="text-sm font-semibold text-zinc-200 sm:col-span-2">Accessibility, allergies, or medical notes<textarea maxLength={2000} rows={4} name="accessibilityNotes" defaultValue={values.accessibilityNotes} placeholder="Optional information relevant to safe ride planning" className={fieldClass(Boolean(errors.accessibilityNotes))} {...errorProps("accessibilityNotes")} /><FieldError name="accessibilityNotes" errors={errors} /></label>
    </div>
  );
}
