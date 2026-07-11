type ProfileValues = {
  displayName?: string | null;
  homeCity?: string | null;
  homeState?: string | null;
  operationalPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyRelationship?: string | null;
  dietaryPreference?: string | null;
  accessibilityNotes?: string | null;
};

const inputClass = "mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500";

export function ProfileFields({ values = {} }: { values?: ProfileValues }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold text-zinc-200">Display name<input required minLength={2} maxLength={120} name="displayName" defaultValue={values.displayName ?? ""} className={inputClass} /></label>
      <label className="text-sm font-semibold text-zinc-200">Home city<input required minLength={2} maxLength={120} name="homeCity" defaultValue={values.homeCity ?? ""} placeholder="Bengaluru" className={inputClass} /></label>
      <label className="text-sm font-semibold text-zinc-200">State<input maxLength={120} name="homeState" defaultValue={values.homeState ?? ""} placeholder="Karnataka" className={inputClass} /></label>
      <label className="text-sm font-semibold text-zinc-200">Phone number <span className="font-normal text-amber-400">· Unverified</span><input type="tel" maxLength={24} name="operationalPhone" defaultValue={values.operationalPhone ?? ""} placeholder="+919876543210" className={inputClass} /><span className="mt-1.5 block text-xs font-normal text-zinc-600">Include country code. Used only for booked-ride operations.</span></label>
      <label className="text-sm font-semibold text-zinc-200">Emergency contact name<input maxLength={120} name="emergencyContactName" defaultValue={values.emergencyContactName ?? ""} className={inputClass} /></label>
      <label className="text-sm font-semibold text-zinc-200">Emergency contact phone<input type="tel" maxLength={24} name="emergencyContactPhone" defaultValue={values.emergencyContactPhone ?? ""} placeholder="+919876543210" className={inputClass} /></label>
      <label className="text-sm font-semibold text-zinc-200">Relationship<input maxLength={80} name="emergencyRelationship" defaultValue={values.emergencyRelationship ?? ""} placeholder="Parent, spouse, friend…" className={inputClass} /></label>
      <label className="text-sm font-semibold text-zinc-200">Dietary preference<input maxLength={120} name="dietaryPreference" defaultValue={values.dietaryPreference ?? ""} placeholder="Vegetarian, non-vegetarian…" className={inputClass} /></label>
      <label className="text-sm font-semibold text-zinc-200 sm:col-span-2">Accessibility or medical notes<textarea maxLength={2000} rows={4} name="accessibilityNotes" defaultValue={values.accessibilityNotes ?? ""} placeholder="Optional information relevant to safe ride planning" className={inputClass} /></label>
    </div>
  );
}
