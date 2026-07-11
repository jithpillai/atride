type VehicleValues = {
  type?: string;
  nickname?: string | null;
  manufacturer?: string;
  model?: string;
  manufactureYear?: number | null;
  color?: string | null;
  registrationLast4?: string | null;
  isPrimary?: boolean;
};

const inputClass = "mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500";

export function VehicleFields({ values = {} }: { values?: VehicleValues }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold text-zinc-200">Vehicle type<select name="type" defaultValue={values.type ?? "BIKE"} className={inputClass}><option value="BIKE">Bike</option><option value="CAR">Car</option><option value="SUV">SUV / 4×4</option><option value="JEEP">Jeep</option><option value="OTHER">Other</option></select></label>
      <label className="text-sm font-semibold text-zinc-200">Nickname<input maxLength={80} name="nickname" defaultValue={values.nickname ?? ""} placeholder="My tourer" className={inputClass} /></label>
      <label className="text-sm font-semibold text-zinc-200">Manufacturer<input required minLength={2} maxLength={100} name="manufacturer" defaultValue={values.manufacturer ?? ""} placeholder="Royal Enfield" className={inputClass} /></label>
      <label className="text-sm font-semibold text-zinc-200">Model<input required maxLength={100} name="model" defaultValue={values.model ?? ""} placeholder="Himalayan 450" className={inputClass} /></label>
      <label className="text-sm font-semibold text-zinc-200">Manufacture year<input type="number" min={1950} max={new Date().getFullYear() + 1} name="manufactureYear" defaultValue={values.manufactureYear ?? ""} className={inputClass} /></label>
      <label className="text-sm font-semibold text-zinc-200">Color<input maxLength={60} name="color" defaultValue={values.color ?? ""} className={inputClass} /></label>
      <label className="text-sm font-semibold text-zinc-200">Registration last 4 characters<input minLength={2} maxLength={4} name="registrationLast4" defaultValue={values.registrationLast4 ?? ""} placeholder="1234" className={inputClass} /><span className="mt-1.5 block text-xs font-normal text-zinc-600">The full registration number is not collected yet.</span></label>
      <label className="flex items-center gap-3 self-end rounded-2xl border border-white/10 p-4 text-sm font-semibold text-zinc-200"><input type="checkbox" name="isPrimary" defaultChecked={values.isPrimary} className="size-4 accent-orange-500" />Use as my primary vehicle</label>
    </div>
  );
}
