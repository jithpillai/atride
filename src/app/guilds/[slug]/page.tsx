import type { Metadata } from "next";
import Image from "next/image";
import { ImageWithFallback } from "@/components/image-with-fallback";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatMoney, formatRideDate } from "@/lib/format";
import {
  listPublishedRidesForTenant,
  listStaticGuildSlugs,
  resolveGuildTenant,
} from "@/server/repositories/discovery-repository";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateStaticParams() {
  return (await listStaticGuildSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveGuildTenant(slug);
  if (!resolved) return { title: "Guild not found" };
  const { guild } = resolved;
  return {
    title: guild.name,
    description:
      guild.access === "PUBLIC"
        ? guild.description
        : "A private Guild Hall hosted on AtRide.",
    alternates: { canonical: `/guilds/${guild.slug}` },
    robots: guild.directoryVisibility === "UNLISTED" ? { index: false, follow: false } : undefined,
  };
}

export default async function GuildPage({ params }: Props) {
  const { slug } = await params;
  const resolved = await resolveGuildTenant(slug);
  if (!resolved) notFound();
  const { guild, tenant } = resolved;

  if (guild.access === "INVITE_ONLY") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-5 py-20">
        <div className="w-full rounded-[2rem] border border-violet-400/20 p-9 text-center" style={{ background: guild.gradient }}>
          <ImageWithFallback src={guild.logoUrl ?? "/defaults/guild-avatar.png"} fallbackSrc="/defaults/guild-avatar.png" alt={`${guild.name} logo`} width={80} height={80} className="mx-auto size-20 rounded-2xl object-cover" />
          <p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-violet-200">Private Guild Hall</p>
          <h1 className="mt-3 text-4xl font-black">{guild.name}</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/70">This Guild is unlisted and invite-only. Sign in with an invited account to view its rides and member information.</p>
          <div className="mt-8 flex justify-center gap-3"><Link href="/login" className="rounded-full bg-white px-6 py-3 text-sm font-black text-black">Sign in</Link><Link href="/" className="rounded-full border border-white/20 px-6 py-3 text-sm font-black">Return home</Link></div>
        </div>
      </section>
    );
  }

  const guildRides = await listPublishedRidesForTenant(tenant);

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10" style={{ background: guild.gradient }}>
        <ImageWithFallback src={guild.coverUrl ?? "/defaults/guild-hall-cover.png"} fallbackSrc="/defaults/guild-hall-cover.png" alt="" fill priority className="object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <ImageWithFallback src={guild.logoUrl ?? "/defaults/guild-avatar.png"} fallbackSrc="/defaults/guild-avatar.png" alt={`${guild.name} logo`} width={72} height={72} className="size-[4.5rem] rounded-2xl object-cover" />
          <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-orange-200">Guild Hall · {guild.homeCity}</p>
          <h1 className="mt-3 max-w-3xl text-5xl font-black tracking-[-.05em] sm:text-6xl">{guild.name}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">{guild.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {guild.specialties.map((item) => <span key={item} className="rounded-full border border-white/20 bg-black/20 px-4 py-2 text-xs font-bold backdrop-blur">{item}</span>)}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
        <div>
          <p className="eyebrow">Welcome to the Hall</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">Built around the ride, not the noise.</h2>
          <p className="mt-5 text-sm leading-7 text-zinc-400">{guild.description}</p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 p-4"><p className="text-xl font-black">{guild.memberCount}</p><p className="mt-1 text-xs text-zinc-500">Members</p></div>
            <div className="rounded-2xl border border-white/10 p-4"><p className="text-xl font-black">{guild.completedRides}</p><p className="mt-1 text-xs text-zinc-500">Completed</p></div>
            <div className="rounded-2xl border border-white/10 p-4"><p className="text-xl font-black">{guild.foundedYear}</p><p className="mt-1 text-xs text-zinc-500">Founded</p></div>
          </div>
        </div>
        <div>
          <div className="flex items-end justify-between"><div><p className="eyebrow">Ride calendar</p><h2 className="mt-2 text-3xl font-black">Upcoming with {guild.shortName}</h2></div><span className="text-sm text-zinc-500">{guildRides.length} published</span></div>
          <div className="mt-6 grid gap-4">
            {guildRides.map((ride) => (
              <Link key={ride.slug} href={`/rides/${ride.slug}`} className="group grid overflow-hidden rounded-3xl border border-white/10 bg-[#13171d] sm:grid-cols-[12rem_1fr]">
                <div className="min-h-44 p-5" style={{ background: ride.gradient }}><span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold">{ride.destination}</span></div>
                <div className="p-6"><div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-orange-400">{formatRideDate(ride.startDate)}</p><h3 className="mt-2 text-xl font-black group-hover:text-orange-300">{ride.title}</h3></div><p className="font-black">{formatMoney(ride.price)}</p></div><p className="mt-3 text-sm leading-6 text-zinc-400">{ride.summary}</p><p className="mt-4 text-xs font-bold text-emerald-400">{ride.totalSlots - ride.bookedSlots} slots available</p></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {!!guild.galleryUrls.length && <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8"><p className="eyebrow">From the road</p><h2 className="mt-3 text-3xl font-black">Guild gallery</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{guild.galleryUrls.map((url, index) => <Image key={url} src={url} alt={`${guild.name} gallery image ${index + 1}`} width={800} height={600} className="aspect-[4/3] w-full rounded-3xl object-cover" />)}</div></section>}
    </>
  );
}
