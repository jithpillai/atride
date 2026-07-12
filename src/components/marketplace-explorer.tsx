"use client";

import Link from "next/link";
import { ImageWithFallback } from "@/components/image-with-fallback";
import { useMemo, useState } from "react";

import type { GuildView, RideView } from "@/domain/discovery";
import { formatMoney, formatRideDate } from "@/lib/format";

type Props = {
  cities: readonly string[];
  guilds: GuildView[];
  rides: RideView[];
};

export function MarketplaceExplorer({ cities, guilds, rides }: Props) {
  const [city, setCity] = useState("All cities");

  const visibleRides = useMemo(
    () => rides.filter((ride) => city === "All cities" || ride.city === city),
    [city, rides],
  );

  const visibleGuilds = useMemo(
    () => guilds.filter((guild) => city === "All cities" || guild.cities.includes(city)),
    [city, guilds],
  );

  return (
    <>
      <section id="rides" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-20 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Pick your next story</p>
            <h2 className="section-title">Upcoming rides</h2>
            <p className="section-copy">Fresh routes from verified road-adventure communities.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filter rides by city">
            {cities.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCity(option)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  city === option
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-950/40"
                    : "border border-white/10 bg-white/5 text-zinc-300 hover:border-orange-400/50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {visibleRides.length ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleRides.map((ride) => {
              const guild = guilds.find((item) => item.slug === ride.guildSlug);
              const slotsLeft = ride.totalSlots - ride.bookedSlots;
              return (
                <article key={ride.slug} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#13171d] shadow-2xl shadow-black/20">
                  <div className="relative h-52 p-6" style={{ background: ride.gradient }}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,.18),transparent_35%)]" />
                    <div className="relative flex items-start justify-between">
                      <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-bold uppercase tracking-[.14em] text-white backdrop-blur">
                        {ride.vehicleType === "BIKE" ? "Motorcycle" : ride.vehicleType}
                      </span>
                      {ride.featured && <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">Trending</span>}
                    </div>
                    <div className="absolute bottom-5 left-6 right-6">
                      <p className="text-xs font-bold uppercase tracking-[.16em] text-white/65">{ride.city} → {ride.destination}</p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight text-white">{ride.title}</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between text-sm text-zinc-400">
                      <span>{formatRideDate(ride.startDate)}</span>
                      <span>{ride.distanceKm} km · {ride.difficulty}</span>
                    </div>
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-300">{ride.summary}</p>
                    <div className="mt-6 flex items-end justify-between border-t border-white/8 pt-5">
                      <div>
                        <p className="text-xs text-zinc-500">Hosted by {guild?.name}</p>
                        <p className="mt-1 text-lg font-black text-white">{formatMoney(ride.price)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${slotsLeft <= 3 ? "text-orange-400" : "text-emerald-400"}`}>{slotsLeft} slots left</p>
                        <Link href={`/rides/${ride.slug}`} className="mt-2 inline-block text-sm font-bold text-orange-400 hover:text-orange-300">View ride →</Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-400">
            No sample rides from {city} yet. Try another launch city.
          </div>
        )}
      </section>

      <section id="guilds" className="scroll-mt-28 border-y border-white/8 bg-white/[.025]">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <p className="eyebrow">Find your people</p>
          <h2 className="section-title">Explore Guild Halls</h2>
          <p className="section-copy">Every Guild has its own culture, calendar, and road philosophy.</p>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {visibleGuilds.map((guild) => (
              <Link
                key={guild.slug}
                href={`/guilds/${guild.slug}`}
                className="group relative min-h-80 overflow-hidden rounded-[2rem] border border-white/10 p-7 transition hover:-translate-y-1 hover:border-orange-500/40"
                style={{ background: guild.gradient }}
              >
                <ImageWithFallback src={guild.coverUrl ?? "/defaults/guild-hall-cover.png"} fallbackSrc="/defaults/guild-hall-cover.png" alt="" fill className="object-cover opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <ImageWithFallback src={guild.logoUrl ?? "/defaults/guild-avatar.png"} fallbackSrc="/defaults/guild-avatar.png" alt={`${guild.name} logo`} width={56} height={56} className="size-14 rounded-2xl object-cover" />
                    <span className="rounded-full border border-white/25 bg-black/20 px-3 py-1 text-xs font-bold text-white/80">{guild.homeCity}</span>
                  </div>
                  <div className="mt-24">
                    <p className="text-sm font-semibold text-orange-200">{guild.memberCount} members · {guild.completedRides} rides</p>
                    <h3 className="mt-2 text-3xl font-black text-white">{guild.name}</h3>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-white/75">{guild.tagline}</p>
                    <p className="mt-5 text-sm font-bold text-white transition group-hover:text-orange-300">Enter Guild Hall →</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
