import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { formatMoney, formatRideDate } from "@/lib/format";
import { ImageWithFallback } from "@/components/image-with-fallback";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";
import { findPublicRidePackageBySlug, listPublicRideSlugs } from "@/server/repositories/discovery-repository";

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 300;
export async function generateStaticParams() { return (await listPublicRideSlugs()).map((slug) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ride = await findPublicRidePackageBySlug((await params).slug);
  return ride ? { title: ride.title, description: ride.summary } : { title: "Ride not found" };
}
function when(date: Date) { return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }); }

export default async function RidePage({ params }: Props) {
  const ride = await findPublicRidePackageBySlug((await params).slug);
  if (!ride) notFound();
  const slotsLeft = ride.totalSlots + ride.bufferSlots - ride.bookedSlots;
  const items = (type: "INCLUSION" | "EXCLUSION" | "ADD_ON" | "MEAL" | "ACTIVITY") => ride.packageItems.filter((item) => item.type === type);
  const latestPolicies = ride.policies.filter((policy, index, policies) => policies.findIndex((candidate) => candidate.type === policy.type) === index);

  return <>
    <section className="relative overflow-hidden border-b border-white/10" style={{ background: ride.heroGradient }}>{ride.coverAsset && <ImageWithFallback src={cloudinaryImageUrl(ride.coverAsset)} fallbackSrc="/defaults/guild-hall-cover.png" alt="" fill sizes="100vw" priority className="object-cover opacity-55" />}<div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent" /><div className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <Link href={`/guilds/${ride.community.slug}`} className="text-sm font-bold text-white/70 hover:text-white">← {ride.community.name}</Link>
      <p className="mt-10 text-xs font-bold uppercase tracking-[.18em] text-orange-200">{ride.origins.map((origin) => origin.city).join(" · ")} → {ride.destination}</p>
      <h1 className="mt-3 max-w-4xl text-5xl font-black tracking-[-.05em] sm:text-6xl">{ride.title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-white/75">{ride.summary}</p>
      <div className="mt-7 flex flex-wrap items-center gap-3"><span className={`rounded-full px-4 py-2 text-xs font-black ${ride.status === "PUBLISHED" ? "bg-emerald-500 text-black" : ride.status === "CANCELLED" ? "bg-red-500 text-white" : "bg-amber-400 text-black"}`}>{ride.status}</span>{ride.staffAssignments.map((staff) => <span key={staff.id} className="rounded-full border border-white/20 bg-black/20 px-4 py-2 text-xs font-bold">{staff.role.replaceAll("_", " ")} · {staff.user.displayName}{staff.origin ? ` · ${staff.origin.city}` : ""}</span>)}</div>
    </div></section>

    <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1fr_22rem] lg:px-8"><main className="min-w-0">
      <p className="eyebrow">About this ride</p><p className="mt-5 whitespace-pre-line text-sm leading-7 text-zinc-400">{ride.description}</p>
      <div className="mt-6 rounded-2xl border border-orange-400/15 bg-orange-400/[.035] p-5"><p className="text-sm font-black text-orange-300">{ride.vehicleType} requirements</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-400">{ride.vehicleRequirements}</p></div>

      <section className="mt-12"><p className="eyebrow">Starting groups</p><h2 className="mt-3 text-3xl font-black">Choose where your journey begins</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">{ride.origins.map((origin) => <article key={origin.id} className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><h3 className="text-xl font-black">{origin.city}</h3><p className="mt-2 text-sm text-zinc-400">{origin.meetingPoint}</p><p className="mt-4 text-sm font-bold text-orange-300">{when(origin.departureAt)}</p>{origin.routeSummary && <p className="mt-3 text-sm leading-6 text-zinc-400">{origin.routeSummary}</p>}<p className="mt-2 text-xs text-zinc-600">{origin.capacity ? `${origin.capacity} planned riders` : "Flexible rider allocation"}{origin.mergePoint ? ` · merges at ${origin.mergePoint}` : ""}</p></article>)}</div></section>

      <section className="mt-12"><p className="eyebrow">Day-wise plan</p><h2 className="mt-3 text-3xl font-black">Itinerary</h2><div className="mt-6 grid gap-4">{ride.itineraryDays.map((day) => <article key={day.id} className="grid gap-4 rounded-3xl border border-white/10 p-6 sm:grid-cols-[6rem_1fr]"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-400">Day {day.dayNumber}</p><p className="mt-2 text-xs text-zinc-600">{day.date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" })}</p></div><div><h3 className="text-xl font-black">{day.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-400">{day.summary}</p>{items("MEAL").filter((item) => item.dayNumber === day.dayNumber).map((meal) => <p key={meal.id} className="mt-3 text-sm text-emerald-300">Meal · <strong>{meal.title}</strong>{meal.description ? ` — ${meal.description}` : ""}</p>)}{items("ACTIVITY").filter((item) => item.dayNumber === day.dayNumber).map((activity) => <p key={activity.id} className="mt-2 text-sm text-orange-200">Activity · <strong>{activity.title}</strong>{activity.description ? ` — ${activity.description}` : ""}</p>)}</div></article>)}</div></section>

      {!!ride.accommodations.length && <section className="mt-12"><p className="eyebrow">Stay</p><h2 className="mt-3 text-3xl font-black">Accommodation</h2><div className="mt-6 grid gap-4">{ride.accommodations.map((stay) => <article key={stay.id} className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><h3 className="text-xl font-black">{stay.exactLocationRestricted ? `${stay.locality} resort stay` : stay.propertyName}</h3>{stay.exactLocationRestricted && <p className="mt-2 text-xs font-bold text-amber-400">Exact property details are shared with confirmed participants.</p>}<p className="mt-4 text-sm leading-7 text-zinc-400">{stay.roomSummary}</p><div className="mt-5 flex flex-wrap gap-2">{stay.amenities.map((amenity) => <span key={amenity} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold">{amenity}</span>)}</div></article>)}</div></section>}

      <section className="mt-12 grid gap-6 md:grid-cols-2"><div><p className="eyebrow">Included</p><div className="mt-4 grid gap-3">{items("INCLUSION").map((item) => <div key={item.id} className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[.035] p-5 text-sm"><strong className="text-emerald-300">✓ {item.title}</strong>{item.description && <p className="mt-2 text-zinc-500">{item.description}</p>}</div>)}</div></div><div><p className="eyebrow">Not included</p><div className="mt-4 grid gap-3">{items("EXCLUSION").map((item) => <div key={item.id} className="rounded-2xl border border-red-400/15 bg-red-400/[.025] p-5 text-sm"><strong className="text-red-300">× {item.title}</strong>{item.description && <p className="mt-2 text-zinc-500">{item.description}</p>}</div>)}</div></div></section>
      {!!items("ADD_ON").length && <section className="mt-10"><p className="eyebrow">Optional add-ons</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{items("ADD_ON").map((item) => <div key={item.id} className="rounded-2xl border border-white/10 p-5"><p className="font-bold">{item.title}</p>{item.description && <p className="mt-2 text-sm text-zinc-500">{item.description}</p>}</div>)}</div></section>}

      <section className="mt-12"><p className="eyebrow">Please read before booking</p><h2 className="mt-3 text-3xl font-black">Rules and policies</h2><div className="mt-6 grid gap-4">{latestPolicies.map((policy) => <details key={policy.id} className="rounded-2xl border border-white/10 p-5"><summary className="cursor-pointer font-black">{policy.title} <span className="text-xs font-normal text-zinc-600">v{policy.version}</span></summary><p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-400">{policy.content}</p></details>)}</div></section>
      {!!ride.mediaAssets.length && <section className="mt-12"><p className="eyebrow">Ride gallery</p><h2 className="mt-3 text-3xl font-black">Stay, attractions, and highlights</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">{ride.mediaAssets.map((asset, index) => <Image key={asset.id} src={cloudinaryImageUrl(asset)} alt={`${ride.title} image ${index + 1}`} width={800} height={600} className="aspect-[4/3] w-full rounded-3xl object-cover" />)}</div></section>}
    </main>

    <aside className="h-fit rounded-3xl border border-orange-500/25 bg-[#15191f] p-7 lg:sticky lg:top-28"><p className="text-sm text-zinc-500">Ride fee</p><p className="mt-1 text-3xl font-black">{formatMoney(ride.pricePaise / 100)}</p>{ride.confirmationDepositPaise > 0 && <p className="mt-2 text-xs text-zinc-500">₹{(ride.confirmationDepositPaise / 100).toLocaleString("en-IN")} confirmation deposit</p>}
      <div className="mt-6 grid gap-3 border-y border-white/8 py-5 text-sm"><p className="flex justify-between"><span className="text-zinc-500">Starts</span><span className="font-bold">{formatRideDate(ride.startsAt.toISOString())}</span></p><p className="flex justify-between"><span className="text-zinc-500">Distance</span><span className="font-bold">{ride.distanceKm} km</span></p><p className="flex justify-between"><span className="text-zinc-500">Vehicle</span><span className="font-bold">{ride.vehicleType}</span></p><p className="flex justify-between"><span className="text-zinc-500">Difficulty</span><span className="font-bold">{ride.difficulty}</span></p></div>
      <p className="mt-5 text-sm font-bold text-emerald-400">{slotsLeft} of {ride.totalSlots + ride.bufferSlots} slots available</p>{ride.status === "PUBLISHED" ? <Link href="/login" className="mt-5 block rounded-2xl bg-orange-500 px-5 py-3.5 text-center text-sm font-black text-white hover:bg-orange-400">Sign in to reserve</Link> : <p className="mt-5 rounded-2xl border border-white/10 p-4 text-center text-sm font-black text-zinc-300">This ride is {ride.status.toLowerCase()} and is not accepting reservations.</p>}<p className="mt-4 text-center text-xs leading-5 text-zinc-600">Booking and payment actions arrive in Phase 5.</p>
    </aside></section>
  </>;
}
