import Image from "next/image";
import Link from "next/link";

import { ImageWithFallback } from "@/components/image-with-fallback";
import { MarketplaceExplorer } from "@/components/marketplace-explorer";
import {
  findPersonalizedFeaturedRide,
  listMarketplaceCities,
  listMarketplaceGuilds,
  listMarketplaceRides,
  listUpcomingStaffRides,
} from "@/server/repositories/discovery-repository";
import { getCurrentSession } from "@/server/auth/session";

export const revalidate = 300;

export default async function HomePage() {
  const session = await getCurrentSession();
  const [cities, guilds, rides, staffRides, personalizedFeaturedRide] = await Promise.all([
    listMarketplaceCities(),
    listMarketplaceGuilds(),
    listMarketplaceRides(),
    session ? listUpcomingStaffRides(session.userId) : Promise.resolve([]),
    session ? findPersonalizedFeaturedRide(session.userId) : Promise.resolve(null),
  ]);
  const heroRide = personalizedFeaturedRide?.ride ?? rides[0];
  const heroContextLabel = personalizedFeaturedRide?.contextLabel ?? "Next adventure";
  const heroCompleted = personalizedFeaturedRide?.kind === "COMPLETED";
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
        <div className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-5 py-14 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[.15em] text-orange-300">
              <span className="size-2 rounded-full bg-orange-400 shadow-[0_0_16px_#fb923c]" />
              Built for the road ahead
            </div>
            <Image
              src="/brand/hero-domain-lockup-dark.png"
              alt="AtRide.in"
              width={1536}
              height={1024}
              className="mb-8 mt-5 block h-auto w-full max-w-[15rem] sm:max-w-[17rem] lg:max-w-[19rem]"
              priority
            />
            <h1 className="max-w-xl font-black leading-[1.02] tracking-[-.045em] text-white">
              <span className="block text-[2rem] sm:text-[2.2rem] lg:text-[2.45rem]">Find your Guild.</span>
              <span className="block text-[2rem] sm:text-[2.2rem] lg:text-[2.45rem]">Choose the route.</span>
              <span className="mt-2 block text-[2rem] text-orange-500 sm:text-[2.7rem] lg:text-[3.45rem]">Ride together.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-300">
              Discover trusted riding communities, reserve a place on their next adventure, and keep every mile organized in one shared home.
            </p>
            <div className="mt-7 flex flex-wrap gap-4">
              <Link href="#rides" className="rounded-full bg-orange-500 px-7 py-3.5 text-sm font-black text-white shadow-xl shadow-orange-950/40 transition hover:-translate-y-0.5 hover:bg-orange-400">
                Explore upcoming rides
              </Link>
              <Link href="#guilds" className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-black text-white transition hover:border-white/30 hover:bg-white/10">
                Browse Guilds
              </Link>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-black/20 py-5 backdrop-blur">
              <div className="px-4"><p className="text-2xl font-black">{Math.max(0, cities.length - 1)}</p><p className="mt-1 text-xs text-zinc-500">Launch cities</p></div>
              <div className="px-4"><p className="text-2xl font-black">{rides.length}</p><p className="mt-1 text-xs text-zinc-500">Upcoming rides</p></div>
              <div className="px-4"><p className="text-2xl font-black">1</p><p className="mt-1 text-xs text-zinc-500">Common account</p></div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:-translate-y-8">
            <div className="absolute inset-12 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="relative rotate-2 rounded-[2.5rem] border border-white/15 bg-gradient-to-br from-[#1b2028] to-[#0d1014] p-7 shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-zinc-500">Featured ride board</p>
                <span className="rounded-full bg-orange-400/10 px-3 py-1 text-xs font-bold text-orange-300">View ride</span>
              </div>
              {heroRide ? (
                <Link
                  href={`/rides/${heroRide.slug}`}
                  aria-label={`View ${heroRide.title}`}
                  className="group mt-6 block overflow-hidden rounded-3xl border border-white/10 bg-[#11151a] outline-none transition duration-300 hover:-translate-y-1 hover:border-orange-400/50 hover:shadow-xl hover:shadow-orange-950/20 focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-400/40"
                >
                  <div className="relative h-48 overflow-hidden p-6" style={{ background: heroRide.gradient }}>
                    {heroRide.coverUrl && <ImageWithFallback src={heroRide.coverUrl} fallbackSrc="/defaults/guild-hall-cover.png" alt="" fill sizes="(min-width:1024px) 36rem, 100vw" className="object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/20" />
                    <div className="relative flex justify-between"><span className="rounded-full bg-black/45 px-3 py-1 text-xs font-bold backdrop-blur">{heroRide.city}</span><span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold">{heroCompleted ? "Completed" : `${Math.max(0, heroRide.totalSlots - heroRide.bookedSlots)} slots left`}</span></div>
                    <p className="relative mt-16 text-xs font-bold uppercase tracking-[.16em] text-white/70">{heroContextLabel}</p>
                    <div className="relative mt-1 flex items-center justify-between gap-4">
                      <p className="text-2xl font-black">{heroRide.title}</p>
                      <span aria-hidden="true" className="text-xl font-black transition-transform group-hover:translate-x-1">→</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-px bg-white/8 text-center">
                    <div className="bg-[#11151a] p-4"><p className="font-black">{heroRide.distanceKm} km</p><p className="mt-1 text-xs text-zinc-600">Distance</p></div>
                    <div className="bg-[#11151a] p-4"><p className="font-black">{heroRideDuration} days</p><p className="mt-1 text-xs text-zinc-600">Duration</p></div>
                    <div className="bg-[#11151a] p-4"><p className="font-black">{heroRide.bookedSlots}/{heroRide.totalSlots}</p><p className="mt-1 text-xs text-zinc-600">Riders</p></div>
                  </div>
                </Link>
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
            <h2 className="mt-2 text-2xl font-black text-white">{session ? staffRides.length ? "Your personal roadbook" : "No upcoming rides yet" : "Your roadbook will appear here"}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Reservations, confirmed bookings, waitlists, and explicitly assigned ride roles appear together. Payment or booking actions come first, followed by the nearest ride date.</p>
          </div>
          {!session && <Link href="/login" className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-orange-100 md:mt-0">Sign in to preview</Link>}
        </div>
        {!!staffRides.length && <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{staffRides.map((ride) => <Link key={ride.slug} href={`/rides/${ride.slug}#booking`} className="rounded-3xl border border-white/10 bg-white/[.025] p-6 transition hover:-translate-y-1 hover:border-orange-400/35"><p className="text-xs font-bold uppercase tracking-widest text-orange-400">{ride.guildName}</p><h3 className="mt-2 text-xl font-black">{ride.title}</h3><p className="mt-2 text-sm text-zinc-500">{ride.city} → {ride.destination}</p><div className="mt-4 flex flex-wrap gap-2">{ride.booking && <span className={`rounded-full px-3 py-1.5 text-xs font-black ${ride.booking.status === "CONFIRMED" ? "bg-emerald-400/15 text-emerald-300" : ride.booking.status === "WAITLISTED" ? "bg-amber-400/15 text-amber-300" : "bg-orange-400/15 text-orange-300"}`}>{ride.booking.status.replaceAll("_", " ")}{ride.booking.originCity ? ` · ${ride.booking.originCity}` : ""}</span>}{ride.assignments.map((assignment, index) => <span key={`${assignment.role}-${assignment.originCity}-${index}`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold">{assignment.role.replaceAll("_", " ")}{assignment.originCity ? ` · ${assignment.originCity}` : ""}</span>)}</div>{ride.booking?.outstandingPaise ? <p className={`mt-4 text-xs font-bold ${ride.booking.paymentOverdue ? "text-red-300" : "text-amber-300"}`}>{ride.booking.paymentStatus === "SUBMITTED" ? "Payment submitted · awaiting Guild review" : `${ride.booking.paymentOverdue ? "Overdue" : "Action needed"} · ${ride.booking.paymentPurpose?.replaceAll("_", " ").toLowerCase() ?? "payment"} ₹${(ride.booking.outstandingPaise / 100).toLocaleString("en-IN")}`}</p> : ride.booking && <p className="mt-4 text-xs font-bold text-emerald-300">Fully paid · ₹{(ride.booking.paidPaise / 100).toLocaleString("en-IN")}</p>}</Link>)}</div>}
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
