import type { Metadata } from "next";
import Image from "next/image";
import { ImageWithFallback } from "@/components/image-with-fallback";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatMoney, formatRideDate } from "@/lib/format";
import { canManageGuild } from "@/server/auth/permissions";
import { getCurrentSession } from "@/server/auth/session";
import { listGuildNewcomersForMember } from "@/server/guild/newcomers";
import {
  type GuildRideHighlight,
  listGuildRideHighlights,
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
  const session = await getCurrentSession();
  const membership = session?.user.communityMemberships.find(
    ({ community }) => community.slug === guild.slug,
  );
  const showManageGuild = canManageGuild(membership);

  if (guild.access === "INVITE_ONLY") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-5 py-20">
        <div className="w-full rounded-[2rem] border border-violet-400/20 p-9 text-center" style={{ background: guild.gradient }}>
          <ImageWithFallback src={guild.logoUrl ?? "/defaults/guild-avatar.png"} fallbackSrc="/defaults/guild-avatar.png" alt={`${guild.name} logo`} width={80} height={80} className="mx-auto size-20 rounded-2xl object-cover" />
          <p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-violet-200">Private Guild Hall</p>
          <h1 className="mt-3 text-4xl font-black">{guild.name}</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/70">This Guild is unlisted and invite-only. Sign in with an invited account to view its rides and member information.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">{showManageGuild ? <Link href={`/guilds/${guild.slug}/manage`} className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white hover:bg-orange-400">Manage Guild</Link> : <Link href={`/login?returnTo=${encodeURIComponent(`/guilds/${guild.slug}`)}`} className="rounded-full bg-white px-6 py-3 text-sm font-black text-black">Sign in</Link>}<Link href="/" className="rounded-full border border-white/20 px-6 py-3 text-sm font-black">Return home</Link></div>
        </div>
      </section>
    );
  }

  const [guildRides, newcomers, rideHighlights] = await Promise.all([
    listPublishedRidesForTenant(tenant),
    session && guild.newcomerDisplayEnabled
      ? listGuildNewcomersForMember(guild.slug, session.userId)
      : Promise.resolve([]),
    listGuildRideHighlights(tenant),
  ]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10" style={{ background: guild.gradient }}>
        <ImageWithFallback src={guild.coverUrl ?? "/defaults/guild-hall-cover.png"} fallbackSrc="/defaults/guild-hall-cover.png" alt="" fill sizes="100vw" priority className="object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <ImageWithFallback src={guild.logoUrl ?? "/defaults/guild-avatar.png"} fallbackSrc="/defaults/guild-avatar.png" alt={`${guild.name} logo`} width={72} height={72} className="size-[4.5rem] rounded-2xl object-cover" />
          <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-orange-200">Guild Hall · {guild.homeCity}</p>
          <h1 className="mt-3 max-w-3xl text-5xl font-black tracking-[-.05em] sm:text-6xl">{guild.name}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">{guild.tagline}</p>
          {showManageGuild && <Link href={`/guilds/${guild.slug}/manage`} className="mt-7 inline-flex rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-950/30 hover:bg-orange-400">Manage Guild</Link>}
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
          {(guild.websiteUrl || guild.instagramUrl || guild.whatsappUrl) && <div className="mt-6 flex flex-wrap gap-3">{guild.websiteUrl && <a href={guild.websiteUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold">Website</a>}{guild.instagramUrl && <a href={guild.instagramUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold">Instagram</a>}{guild.whatsappUrl && <a href={guild.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold">WhatsApp</a>}</div>}
        </div>
        <div>
          <div className="flex items-end justify-between"><div><p className="eyebrow">Ride calendar</p><h2 className="mt-2 text-3xl font-black">Upcoming with {guild.shortName}</h2></div><span className="text-sm text-zinc-500">{guildRides.length} published</span></div>
          <div className="mt-6 grid gap-4">
            {guildRides.map((ride) => (
              <Link key={ride.slug} href={`/rides/${ride.slug}`} className="group grid overflow-hidden rounded-3xl border border-white/10 bg-[#13171d] sm:grid-cols-[12rem_1fr]">
                <div className="relative min-h-44 overflow-hidden p-5" style={{ background: ride.gradient }}>{ride.coverUrl && <ImageWithFallback src={ride.coverUrl} fallbackSrc="/defaults/guild-hall-cover.png" alt="" fill sizes="12rem" className="object-cover" />}<div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20" /><span className="relative rounded-full bg-black/50 px-3 py-1 text-xs font-bold backdrop-blur">{ride.destination}</span></div>
                <div className="p-6"><div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-orange-400">{formatRideDate(ride.startDate)}</p><h3 className="mt-2 text-xl font-black group-hover:text-orange-300">{ride.title}</h3></div><p className="font-black">{formatMoney(ride.price)}</p></div><p className="mt-3 text-sm leading-6 text-zinc-400">{ride.summary}</p><p className="mt-4 text-xs font-bold text-emerald-400">{ride.totalSlots - ride.bookedSlots} slots available</p></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {!!newcomers.length && <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
        <div className="rounded-[2rem] border border-orange-400/15 bg-orange-400/[.025] p-7 sm:p-9">
          <p className="eyebrow">New to this Guild</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-3xl font-black">Welcome to {guild.shortName}</h2><p className="mt-2 text-sm text-zinc-500">Recent members who chose to introduce themselves inside this Guild Hall.</p></div>
            <p className="text-xs font-bold text-zinc-600">Visible to Guild members only</p>
          </div>
          <div className="mt-7 flex gap-5 overflow-x-auto pb-2">
            {newcomers.map((newcomer) => <article key={newcomer.membershipId} className="w-36 shrink-0 text-center">
              <ImageWithFallback src={newcomer.avatarUrl ?? "/defaults/user-avatar.png"} fallbackSrc="/defaults/user-avatar.png" alt="" width={112} height={112} className="mx-auto size-28 rounded-3xl border border-white/10 object-cover" />
              <h3 className="mt-3 truncate text-sm font-black">{newcomer.firstName}</h3>
              <p className="mt-1 truncate text-xs text-zinc-500">{newcomer.homeCity ?? "AtRide member"}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-orange-300">Joined {newcomer.joinedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}</p>
            </article>)}
          </div>
        </div>
      </section>}

      {(guild.galleryUrls.length > 0 || rideHighlights.upcoming.length > 0 || rideHighlights.completed.length > 0) && <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
        <p className="eyebrow">From the road</p><h2 className="mt-3 text-3xl font-black">Guild gallery</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">Permanent Guild highlights sit alongside automatically refreshed images from current and recently completed rides.</p>
        {!!guild.galleryUrls.length && <div className="mt-8"><div className="flex items-end justify-between gap-4"><div><h3 className="text-xl font-black">Guild highlights</h3><p className="mt-1 text-xs text-zinc-500">Curated by {guild.shortName}</p></div><span className="text-xs font-bold text-zinc-600">{guild.galleryUrls.length} images</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{guild.galleryUrls.map((url, index) => <Image key={url} src={url} alt={`${guild.name} gallery image ${index + 1}`} width={800} height={600} loading="lazy" className="aspect-[4/3] w-full rounded-3xl object-cover" />)}</div></div>}
        <RideHighlightScroller title="Upcoming adventures" description="The nearest published rides from this Guild." rides={rideHighlights.upcoming} />
        <RideHighlightScroller title="Recently completed" description="The latest completed rides and their visual highlights." rides={rideHighlights.completed} />
      </section>}
    </>
  );
}

function RideHighlightScroller({ title, description, rides }: { title: string; description: string; rides: GuildRideHighlight[] }) {
  if (!rides.length) return null;
  return <div className="mt-10"><div><h3 className="text-xl font-black">{title}</h3><p className="mt-1 text-xs text-zinc-500">{description}</p></div><div className="-mx-5 mt-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-3 lg:mx-0 lg:px-0">{rides.map((ride) => {
    const images = ride.imageUrls.length ? ride.imageUrls : ["/defaults/guild-hall-cover.png"];
    return <Link key={ride.slug} href={`/rides/${ride.slug}`} className="group w-[84vw] max-w-[28rem] shrink-0 snap-start overflow-hidden rounded-3xl border border-white/10 bg-[#13171d] transition hover:-translate-y-1 hover:border-orange-400/35">
      <div className={`grid h-64 gap-1 bg-black ${images.length > 1 ? "grid-cols-3 grid-rows-2" : "grid-cols-1"}`}>
        {images.map((url, index) => <div key={`${ride.slug}-${url}`} className={`relative overflow-hidden ${images.length > 1 && index === 0 ? "col-span-2 row-span-2" : ""} ${images.length === 2 && index === 1 ? "row-span-2" : ""}`}><ImageWithFallback src={url} fallbackSrc="/defaults/guild-hall-cover.png" alt={`${ride.title} highlight ${index + 1}`} fill sizes="(min-width: 640px) 28rem, 84vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" /></div>)}
      </div>
      <div className="flex items-end justify-between gap-4 p-5"><div><p className={`text-xs font-bold uppercase tracking-wider ${ride.status === "COMPLETED" ? "text-emerald-400" : "text-orange-400"}`}>{ride.status === "COMPLETED" ? "Completed" : formatRideDate(ride.startsAt)} · {ride.destination}</p><h4 className="mt-2 text-lg font-black group-hover:text-orange-300">{ride.title}</h4></div><span aria-hidden="true" className="text-xl font-black transition group-hover:translate-x-1">→</span></div>
    </Link>;
  })}</div></div>;
}
