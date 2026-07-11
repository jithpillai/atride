import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { VehicleFields } from "@/components/vehicle-fields";
import { db } from "@/lib/db";
import { requireSession } from "@/server/auth/authorization";
import { updateVehicle } from "@/server/profile/actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export const metadata = { title: "Edit vehicle", robots: { index: false, follow: false } };

export default async function EditVehiclePage({ params, searchParams }: Props) {
  const { id } = await params;
  const session = await requireSession(`/account/vehicles/${id}`);
  if (!session.user.profile?.onboardingCompletedAt) redirect("/onboarding");
  const [vehicle, state] = await Promise.all([
    db.vehicle.findFirst({ where: { id, userId: session.userId } }),
    searchParams,
  ]);
  if (!vehicle) notFound();

  return (
    <section className="mx-auto min-h-[70vh] max-w-3xl px-5 py-14 lg:px-8">
      <Link href="/account/vehicles" className="text-sm font-semibold text-zinc-400 hover:text-white">← Vehicle garage</Link>
      <p className="eyebrow mt-8">Private garage</p><h1 className="mt-3 text-4xl font-black tracking-tight">Edit vehicle</h1>
      {state.error && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">Check the required vehicle details.</p>}
      <form action={updateVehicle} className="mt-8 rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
        <input type="hidden" name="id" value={vehicle.id} />
        <VehicleFields values={vehicle} />
        <button className="mt-8 rounded-full bg-orange-500 px-7 py-3.5 text-sm font-black text-white transition hover:bg-orange-400">Save vehicle</button>
      </form>
    </section>
  );
}
