import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatMoney, formatRideDate } from "@/lib/format";
import {
  findPublicRideBySlug,
  listPublicRideSlugs,
  resolveGuildTenant,
} from "@/server/repositories/discovery-repository";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateStaticParams() {
  return (await listPublicRideSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ride = await findPublicRideBySlug((await params).slug);
  return ride ? { title: ride.title, description: ride.summary } : { title: "Ride not found" };
}

export default async function RidePage({ params }: Props) {
  const ride = await findPublicRideBySlug((await params).slug);
  if (!ride) notFound();
  const resolved = await resolveGuildTenant(ride.guildSlug);
  if (!resolved || resolved.guild.access !== "PUBLIC") notFound();
  const { guild } = resolved;
  const slotsLeft = ride.totalSlots - ride.bookedSlots;

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10" style={{ background: ride.gradient }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <Link href={`/guilds/${guild.slug}`} className="text-sm font-bold text-white/70 hover:text-white">← {guild.name}</Link>
          <p className="mt-10 text-xs font-bold uppercase tracking-[.18em] text-orange-200">{ride.city} → {ride.destination}</p>
          <h1 className="mt-3 max-w-4xl text-5xl font-black tracking-[-.05em] sm:text-6xl">{ride.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">{ride.summary}</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1fr_22rem] lg:px-8">
        <div>
          <p className="eyebrow">Trip plan</p>
          <h2 className="mt-3 text-3xl font-black">What this sample ride includes</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {["Lead captain and sweep support", "Planned fuel and regroup stops", "Two rider briefings", "Emergency contact roster"].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[.025] p-5 text-sm font-semibold text-zinc-300">✓ <span className="ml-2">{item}</span></div>)}
          </div>
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[.025] p-7"><p className="text-sm font-bold text-white">Route preview</p><p className="mt-3 text-sm leading-7 text-zinc-400">Interactive maps and checkpoint timelines will plug into this section after the core ride model and map provider adapter are implemented.</p></div>
        </div>
        <aside className="h-fit rounded-3xl border border-orange-500/25 bg-[#15191f] p-7 lg:sticky lg:top-28">
          <p className="text-sm text-zinc-500">Ride fee</p><p className="mt-1 text-3xl font-black">{formatMoney(ride.price)}</p>
          <div className="mt-6 grid gap-3 border-y border-white/8 py-5 text-sm"><p className="flex justify-between"><span className="text-zinc-500">Starts</span><span className="font-bold">{formatRideDate(ride.startDate)}</span></p><p className="flex justify-between"><span className="text-zinc-500">Distance</span><span className="font-bold">{ride.distanceKm} km</span></p><p className="flex justify-between"><span className="text-zinc-500">Difficulty</span><span className="font-bold">{ride.difficulty}</span></p></div>
          <p className="mt-5 text-sm font-bold text-emerald-400">{slotsLeft} of {ride.totalSlots} slots available</p>
          <Link href="/login" className="mt-5 block rounded-2xl bg-orange-500 px-5 py-3.5 text-center text-sm font-black text-white hover:bg-orange-400">Sign in to reserve</Link>
          <p className="mt-4 text-center text-xs leading-5 text-zinc-600">Booking and payment actions arrive in later phases.</p>
        </aside>
      </section>
    </>
  );
}
