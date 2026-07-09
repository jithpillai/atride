import Image from "next/image";
import Link from "next/link";

import { MarketplaceExplorer } from "@/components/marketplace-explorer";
import {
  listMarketplaceCities,
  listMarketplaceGuilds,
  listMarketplaceRides,
} from "@/server/repositories/discovery-repository";

export const revalidate = 300;

export default async function HomePage() {
  const [cities, guilds, rides] = await Promise.all([
    listMarketplaceCities(),
    listMarketplaceGuilds(),
    listMarketplaceRides(),
  ]);
  const heroRide = rides[0];
  const heroRideDuration = heroRide
    ? Math.max(
        1,
        Math.ceil(
          (new Date(heroRide.endDate).getTime() - new Date(heroRide.startDate).getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      )
    : 0;

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AtRide",
    url: "https://atride.in",
    description: "A platform for road-adventure communities and organized rides.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />

      <section className="relative isolate overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_24%,rgba(255,90,24,.24),transparent_22rem),radial-gradient(circle_at_10%_10%,rgba(54,89,104,.18),transparent_24rem)]" />
        <div className="absolute inset-0 -z-10 opacity-[.08] [background-image:linear-gradient(rgba(255,255,255,.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.2)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[.15em] text-orange-300">
              <span className="size-2 rounded-full bg-orange-400 shadow-[0_0_16px_#fb923c]" />
              Built for the road ahead
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[.98] tracking-[-.055em] text-white sm:text-6xl lg:text-7xl">
              Find your crew.<br />Choose the route.<br /><span className="text-orange-500">Ride together.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-300">
              Discover trusted riding communities, reserve a place on their next adventure, and keep every mile organized in one shared home.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link href="#rides" className="rounded-full bg-orange-500 px-7 py-3.5 text-sm font-black text-white shadow-xl shadow-orange-950/40 transition hover:-translate-y-0.5 hover:bg-orange-400">
                Explore upcoming rides
              </Link>
              <Link href="#guilds" className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-black text-white transition hover:border-white/30 hover:bg-white/10">
                Browse Guilds
              </Link>
            </div>
            <div className="mt-12 grid max-w-xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-black/20 py-5 backdrop-blur">
              <div className="px-4"><p className="text-2xl font-black">{Math.max(0, cities.length - 1)}</p><p className="mt-1 text-xs text-zinc-500">Launch cities</p></div>
              <div className="px-4"><p className="text-2xl font-black">{rides.length}</p><p className="mt-1 text-xs text-zinc-500">Upcoming rides</p></div>
              <div className="px-4"><p className="text-2xl font-black">1</p><p className="mt-1 text-xs text-zinc-500">Common account</p></div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute inset-12 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="relative rotate-2 rounded-[2.5rem] border border-white/15 bg-gradient-to-br from-[#1b2028] to-[#0d1014] p-7 shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-zinc-500">Live ride board</p>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">Live preview</span>
              </div>
              {heroRide ? (
                <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#11151a]">
                  <div className="h-48 p-6" style={{ background: heroRide.gradient }}>
                    <div className="flex justify-between"><span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold">{heroRide.city}</span><span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold">{heroRide.totalSlots - heroRide.bookedSlots} slots left</span></div>
                    <p className="mt-16 text-xs font-bold uppercase tracking-[.16em] text-white/60">Next adventure</p>
                    <p className="mt-1 text-2xl font-black">{heroRide.title}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-px bg-white/8 text-center">
                    <div className="bg-[#11151a] p-4"><p className="font-black">{heroRide.distanceKm} km</p><p className="mt-1 text-xs text-zinc-600">Distance</p></div>
                    <div className="bg-[#11151a] p-4"><p className="font-black">{heroRideDuration} days</p><p className="mt-1 text-xs text-zinc-600">Duration</p></div>
                    <div className="bg-[#11151a] p-4"><p className="font-black">{heroRide.bookedSlots}/{heroRide.totalSlots}</p><p className="mt-1 text-xs text-zinc-600">Riders</p></div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">The next published adventure will appear here.</div>
              )}
              <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[.03] p-4">
                <Image src="/brand/symbol-only.png" alt="" width={48} height={48} className="size-12 rounded-xl bg-white object-contain p-1" />
                <div><p className="text-sm font-bold">One account, every Guild</p><p className="mt-1 text-xs text-zinc-500">Your roles and rides travel with you.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-20 lg:px-8">
        <div className="rounded-[2rem] border border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-transparent p-7 md:flex md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Your upcoming rides</p>
            <h2 className="mt-2 text-2xl font-black text-white">Your roadbook will appear here</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Booked as a rider or assigned as a captain, sweep, or marshal—every upcoming ride will appear in one role-aware view.</p>
          </div>
          <Link href="/login" className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-orange-100 md:mt-0">Sign in to preview</Link>
        </div>
      </section>

      <MarketplaceExplorer cities={cities} guilds={guilds} rides={rides} />

      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-20 lg:px-8">
        <div className="text-center">
          <p className="eyebrow">From interest to ignition</p>
          <h2 className="section-title">Three steps to the start line</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            ["01", "Explore", "Filter upcoming adventures by city and enter a Guild Hall to understand the crew."],
            ["02", "Reserve", "Choose the route, starting group, and place that fits your experience and vehicle."],
            ["03", "Ride", "Follow official plans, check-ins, and progress with the people running your journey."],
          ].map(([number, title, copy]) => (
            <div key={number} className="rounded-3xl border border-white/10 bg-white/[.025] p-7">
              <p className="text-4xl font-black text-orange-500/35">{number}</p>
              <h3 className="mt-8 text-xl font-black">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
