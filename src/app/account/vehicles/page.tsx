import Link from "next/link";
import { redirect } from "next/navigation";

import { VehicleFields } from "@/components/vehicle-fields";
import { db } from "@/lib/db";
import { requireSession } from "@/server/auth/authorization";
import { createVehicle, deleteVehicle, makePrimaryVehicle } from "@/server/profile/actions";

type Props = { searchParams: Promise<{ error?: string; created?: string; saved?: string; deleted?: string }> };

export const metadata = { title: "Vehicle garage", robots: { index: false, follow: false } };

export default async function VehiclesPage({ searchParams }: Props) {
  const session = await requireSession("/account/vehicles");
  if (!session.user.profile?.onboardingCompletedAt) redirect("/onboarding");
  const [vehicles, state] = await Promise.all([
    db.vehicle.findMany({ where: { userId: session.userId }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }),
    searchParams,
  ]);
  const success = state.created === "1" ? "Vehicle added." : state.saved === "1" ? "Vehicle updated." : state.deleted === "1" ? "Vehicle removed." : "";

  return (
    <section className="mx-auto min-h-[70vh] max-w-5xl px-5 py-14 lg:px-8">
      <Link href="/account" className="text-sm font-semibold text-zinc-400 hover:text-white">← Account</Link>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Private garage</p><h1 className="mt-3 text-4xl font-black tracking-tight">Your vehicles</h1></div><p className="max-w-md text-sm leading-6 text-zinc-500">Bike is the default today, while the data model supports future car and 4×4 adventures.</p></div>
      {success && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">{success}</p>}
      {state.error && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">The vehicle details were invalid or the vehicle no longer exists.</p>}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {vehicles.map((vehicle) => (
          <article key={vehicle.id} className="rounded-3xl border border-white/10 bg-white/[.025] p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-orange-400">{vehicle.type.replace("_", " ")}</p><h2 className="mt-2 text-xl font-black">{vehicle.nickname || `${vehicle.manufacturer} ${vehicle.model}`}</h2><p className="mt-1 text-sm text-zinc-500">{vehicle.manufacturer} {vehicle.model}{vehicle.manufactureYear ? ` · ${vehicle.manufactureYear}` : ""}</p></div>{vehicle.isPrimary && <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">Primary</span>}</div>
            <p className="mt-5 text-sm text-zinc-400">{[vehicle.color, vehicle.registrationLast4 ? `Registration •••• ${vehicle.registrationLast4}` : null].filter(Boolean).join(" · ") || "No additional private details"}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={`/account/vehicles/${vehicle.id}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold">Edit</Link>
              {!vehicle.isPrimary && <form action={makePrimaryVehicle}><input type="hidden" name="id" value={vehicle.id} /><button className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold">Make primary</button></form>}
              <form action={deleteVehicle}><input type="hidden" name="id" value={vehicle.id} /><button className="rounded-full border border-red-400/20 px-4 py-2 text-xs font-bold text-red-300">Remove</button></form>
            </div>
          </article>
        ))}
        {!vehicles.length && <div className="rounded-3xl border border-dashed border-white/10 p-8 text-sm leading-7 text-zinc-500">Your garage is empty. Add the vehicle you expect to use for upcoming adventures.</div>}
      </div>

      <form action={createVehicle} className="mt-10 rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
        <p className="eyebrow">Add a vehicle</p><h2 className="mt-3 text-2xl font-black">Garage details</h2>
        <div className="mt-7"><VehicleFields /></div>
        <button className="mt-8 rounded-full bg-orange-500 px-7 py-3.5 text-sm font-black text-white transition hover:bg-orange-400">Add vehicle</button>
      </form>
    </section>
  );
}
