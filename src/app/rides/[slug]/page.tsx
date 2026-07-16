import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { formatMoney, formatRideDate } from "@/lib/format";
import { ImageWithFallback } from "@/components/image-with-fallback";
import { RideBookingForm } from "@/components/ride-booking-form";
import { MediaUploader } from "@/components/media-uploader";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";
import { findPublicRidePackageBySlug, listPublicRideSlugs } from "@/server/repositories/discovery-repository";
import { getCurrentSession } from "@/server/auth/session";
import { canEditRide } from "@/server/auth/permissions";
import { findUserBookingForRide } from "@/server/booking/service";
import { summarizeBookingPayments } from "@/server/booking/payment-summary";
import { UpiPaymentPanel } from "@/components/upi-payment-panel";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ booking?: string }> };
export const revalidate = 300;
export async function generateStaticParams() { return (await listPublicRideSlugs()).map((slug) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ride = await findPublicRidePackageBySlug((await params).slug);
  return ride ? { title: ride.title, description: ride.summary } : { title: "Ride not found" };
}
function when(date: Date) { return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }); }

export default async function RidePage({ params, searchParams }: Props) {
  const ride = await findPublicRidePackageBySlug((await params).slug);
  if (!ride) notFound();
  const session = await getCurrentSession();
  const booking = session ? await findUserBookingForRide(session.userId, ride.id) : null;
  const activeBooking = booking && !["EXPIRED", "CANCELLED", "TRANSFERRED"].includes(booking.status) ? booking : null;
  const bookingNotice = (await searchParams).booking;
  const paymentSummary = activeBooking ? summarizeBookingPayments(activeBooking) : null;
  const membership = session?.user.communityMemberships.find(
    ({ community }) => community.slug === ride.community.slug,
  );
  const welcomeConsentActive = Boolean(
    membership?.welcomeConsent && !membership.welcomeConsent.revokedAt,
  );
  const showManageRide = canEditRide(membership, ride.staffAssignments, session?.userId);
  const slotsLeft = Math.max(ride.totalSlots - ride.bookedSlots, 0);
  const soldOut = slotsLeft <= 0;
  const waitlistedSeats = ride.bookings.reduce((total, queued) => total + queued.seatCount, 0);
  const waitlistSlotsLeft = Math.max(ride.waitlistCapacity - waitlistedSeats, 0);
  const waitlistOpen = soldOut && waitlistSlotsLeft > 0;
  const items = (type: "INCLUSION" | "EXCLUSION" | "ADD_ON" | "MEAL" | "ACTIVITY") => ride.packageItems.filter((item) => item.type === type);
  const latestPolicies = ride.policies.filter((policy, index, policies) => policies.findIndex((candidate) => candidate.type === policy.type) === index);

  return <>
    <section className="relative overflow-hidden border-b border-white/10" style={{ background: ride.heroGradient }}>{ride.coverAsset && <ImageWithFallback src={cloudinaryImageUrl(ride.coverAsset)} fallbackSrc="/defaults/guild-hall-cover.png" alt="" fill sizes="100vw" priority className="object-cover opacity-55" />}<div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent" /><div className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4"><Link href={`/guilds/${ride.community.slug}`} className="text-sm font-bold text-white/70 hover:text-white">← {ride.community.name}</Link>{showManageRide && <Link href={`/guilds/${ride.community.slug}/rides/${ride.id}/edit`} className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-950/30 hover:bg-orange-400">Manage Ride</Link>}</div>
      <p className="mt-10 text-xs font-bold uppercase tracking-[.18em] text-orange-200">{ride.origins.map((origin) => origin.city).join(" · ")} → {ride.destination}</p>
      <h1 className="mt-3 max-w-4xl text-5xl font-black tracking-[-.05em] sm:text-6xl">{ride.title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-white/75">{ride.summary}</p>
      <div className="mt-7 flex flex-wrap items-center gap-3"><span className={`rounded-full px-4 py-2 text-xs font-black ${ride.status === "PUBLISHED" ? "bg-emerald-500 text-black" : ride.status === "CANCELLED" ? "bg-red-500 text-white" : "bg-amber-400 text-black"}`}>{ride.status}</span>{ride.staffAssignments.map((staff) => <span key={staff.id} className="rounded-full border border-white/20 bg-black/20 px-4 py-2 text-xs font-bold">{staff.role.replaceAll("_", " ")} · {staff.user.displayName}{staff.origin ? ` · ${staff.origin.city}` : ""}</span>)}</div>
    </div></section>

    <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[minmax(0,1fr)_24rem] lg:px-8 xl:grid-cols-[minmax(0,1fr)_26rem]"><main className="min-w-0">
      <p className="eyebrow">About this ride</p><p className="mt-5 whitespace-pre-line text-sm leading-7 text-zinc-400">{ride.description}</p>
      <div className="mt-6 rounded-2xl border border-orange-400/15 bg-orange-400/[.035] p-5"><p className="text-sm font-black text-orange-300">{ride.vehicleType} requirements</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-400">{ride.vehicleRequirements}</p></div>

      <section className="mt-12"><p className="eyebrow">Starting groups</p><h2 className="mt-3 text-3xl font-black">Choose where your journey begins</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">{ride.origins.map((origin) => <article key={origin.id} className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><h3 className="text-xl font-black">{origin.city}</h3><p className="mt-2 text-sm text-zinc-400">{origin.meetingPoint}</p><p className="mt-4 text-sm font-bold text-orange-300">{when(origin.departureAt)}</p>{origin.routeSummary && <p className="mt-3 text-sm leading-6 text-zinc-400">{origin.routeSummary}</p>}<p className="mt-2 text-xs text-zinc-600">{origin.capacity ? `${origin.capacity} planned riders` : "Flexible rider allocation"}{origin.mergePoint ? ` · merges at ${origin.mergePoint}` : ""}</p></article>)}</div></section>

      <section className="mt-12"><p className="eyebrow">Day-wise plan</p><h2 className="mt-3 text-3xl font-black">Itinerary</h2><div className="mt-6 grid gap-4">{ride.itineraryDays.map((day, index) => { const firstEventOfDay = ride.itineraryDays.findIndex((candidate) => candidate.dayNumber === day.dayNumber) === index; return <article key={day.id} className="grid gap-4 rounded-3xl border border-white/10 p-6 sm:grid-cols-[7rem_1fr]"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-400">Day {day.dayNumber}</p><p className="mt-2 text-xs text-zinc-600">{day.date.toLocaleDateString("en-IN", { timeZone: "UTC", dateStyle: "medium" })}</p>{day.scheduledAt && <p className="mt-1 text-xs font-bold text-orange-300">{day.scheduledAt.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}</p>}</div><div><h3 className="text-xl font-black">{day.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-400">{day.summary}</p>{firstEventOfDay && items("MEAL").filter((item) => item.dayNumber === day.dayNumber).map((meal) => <p key={meal.id} className="mt-3 text-sm text-emerald-300">Meal · <strong>{meal.title}</strong>{meal.description ? ` — ${meal.description}` : ""}</p>)}{firstEventOfDay && items("ACTIVITY").filter((item) => item.dayNumber === day.dayNumber).map((activity) => <p key={activity.id} className="mt-2 text-sm text-orange-200">Activity · <strong>{activity.title}</strong>{activity.description ? ` — ${activity.description}` : ""}</p>)}</div></article>; })}</div></section>

      {!!ride.accommodations.length && <section className="mt-12"><p className="eyebrow">Stay</p><h2 className="mt-3 text-3xl font-black">Accommodation</h2><div className="mt-6 grid gap-4">{ride.accommodations.map((stay) => <article key={stay.id} className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><h3 className="text-xl font-black">{stay.exactLocationRestricted ? `${stay.locality} resort stay` : stay.propertyName}</h3>{stay.exactLocationRestricted && <p className="mt-2 text-xs font-bold text-amber-400">Exact property details are shared with confirmed participants.</p>}<p className="mt-4 text-sm leading-7 text-zinc-400">{stay.roomSummary}</p><div className="mt-5 flex flex-wrap gap-2">{stay.amenities.map((amenity) => <span key={amenity} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold">{amenity}</span>)}</div>{!!stay.options.length && <div className="mt-5 grid gap-2 border-t border-white/10 pt-5">{stay.options.map((option) => <div key={option.id} className="flex items-start justify-between gap-4 text-sm"><div><p className="font-bold">{option.name}</p>{option.description && <p className="mt-1 text-xs leading-5 text-zinc-500">{option.description}</p>}</div><p className="shrink-0 font-black text-orange-300">{option.pricingMode === "INCLUDED" ? "Included" : `₹${(option.pricePaise / 100).toLocaleString("en-IN")} ${option.pricingMode === "PER_PERSON" ? "/ person" : "/ room"}`}</p></div>)}</div>}</article>)}</div></section>}

      <section className="mt-12 grid gap-6 md:grid-cols-2"><div><p className="eyebrow">Included</p><div className="mt-4 grid gap-3">{items("INCLUSION").map((item) => <div key={item.id} className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[.035] p-5 text-sm"><strong className="text-emerald-300">✓ {item.title}</strong>{item.description && <p className="mt-2 text-zinc-500">{item.description}</p>}</div>)}</div></div><div><p className="eyebrow">Not included</p><div className="mt-4 grid gap-3">{items("EXCLUSION").map((item) => <div key={item.id} className="rounded-2xl border border-red-400/15 bg-red-400/[.025] p-5 text-sm"><strong className="text-red-300">× {item.title}</strong>{item.description && <p className="mt-2 text-zinc-500">{item.description}</p>}</div>)}</div></div></section>
      {!!items("ADD_ON").length && <section className="mt-10"><p className="eyebrow">Optional add-ons</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{items("ADD_ON").map((item) => <div key={item.id} className="rounded-2xl border border-white/10 p-5"><p className="font-bold">{item.title}</p>{item.description && <p className="mt-2 text-sm text-zinc-500">{item.description}</p>}</div>)}</div></section>}

      <section className="mt-12"><p className="eyebrow">Please read before booking</p><h2 className="mt-3 text-3xl font-black">Rules and policies</h2><div className="mt-6 grid gap-4">{latestPolicies.map((policy) => <details key={policy.id} className="rounded-2xl border border-white/10 p-5"><summary className="cursor-pointer font-black">{policy.title} <span className="text-xs font-normal text-zinc-600">v{policy.version}</span></summary><p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-400">{policy.content}</p></details>)}</div></section>
      {!!ride.mediaAssets.length && <section className="mt-12"><p className="eyebrow">Ride gallery</p><h2 className="mt-3 text-3xl font-black">Stay, attractions, and highlights</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">{ride.mediaAssets.map((asset, index) => <Image key={asset.id} src={cloudinaryImageUrl(asset)} alt={`${ride.title} image ${index + 1}`} width={800} height={600} className="aspect-[4/3] w-full rounded-3xl object-cover" />)}</div></section>}
    </main>

    <aside id="booking" className="h-fit min-w-0 scroll-mt-28 rounded-3xl border border-orange-500/25 bg-[#15191f] p-6 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto xl:p-7"><p className="text-sm text-zinc-500">Ride fee per person</p><p className="mt-1 text-3xl font-black">{formatMoney(ride.pricePaise / 100)}</p>{ride.confirmationDepositPaise > 0 && <p className="mt-2 text-xs text-zinc-500">₹{(ride.confirmationDepositPaise / 100).toLocaleString("en-IN")} confirmation deposit per person</p>}
      <div className="mt-6 grid gap-3 border-y border-white/8 py-5 text-sm"><p className="flex justify-between"><span className="text-zinc-500">Starts</span><span className="font-bold">{formatRideDate(ride.startsAt.toISOString())}</span></p><p className="flex justify-between"><span className="text-zinc-500">Distance</span><span className="font-bold">{ride.distanceKm} km</span></p><p className="flex justify-between"><span className="text-zinc-500">Vehicle</span><span className="font-bold">{ride.vehicleType}</span></p><p className="flex justify-between"><span className="text-zinc-500">Difficulty</span><span className="font-bold">{ride.difficulty}</span></p></div>
      <p className={`mt-5 text-sm font-bold ${soldOut ? "text-amber-400" : "text-emerald-400"}`}>{soldOut ? waitlistOpen ? `Ride full · ${waitlistSlotsLeft} waitlist ${waitlistSlotsLeft === 1 ? "place" : "places"} left` : "Ride and waitlist are full" : `${slotsLeft} of ${ride.totalSlots} participant slots available`}</p>
      {bookingNotice && <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-4 text-sm font-bold text-emerald-300">{bookingNotice === "waitlisted" ? "You joined the waitlist." : bookingNotice === "already_confirmed" ? "Your booking is already confirmed." : "Your ride reservation is saved."}</p>}
      {booking?.status === "EXPIRED" && <p className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[.05] p-4 text-sm leading-6 text-amber-200">Your earlier payment hold expired and its seat was released. You may reserve again below; current capacity and waitlist rules apply.</p>}
      {activeBooking ? <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-300">Your booking</p>
        <p className="mt-2 text-xl font-black">{activeBooking.status.replaceAll("_", " ")}</p>
        <p className="mt-2 text-sm text-zinc-400">Starting with {activeBooking.origin?.city ?? "the selected group"} · {activeBooking.occupantRole.toLowerCase()}</p>
        <p className="mt-2 text-xs font-bold text-orange-200">{activeBooking.seatCount} {activeBooking.seatCount === 1 ? "person" : "people"} in this booking</p>
        {activeBooking.participants.length > 1 && <div className="mt-3 grid gap-2">{activeBooking.participants.map((participant) => <div key={participant.id} className="flex items-center justify-between rounded-xl bg-white/[.035] px-3 py-2 text-xs"><span className="font-bold">{participant.displayName}{participant.isBookingLead ? " · Lead" : ""}</span><span className="text-zinc-500">{participant.role.toLowerCase()}</span></div>)}</div>}
        {!!activeBooking.accommodationSelections.length && <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">{activeBooking.accommodationSelections.map((selection) => <p key={selection.id} className="text-xs leading-5 text-zinc-400"><strong className="text-zinc-200">{selection.optionName}</strong> · {selection.accommodationName}{selection.totalPricePaise > 0 ? ` · ₹${(selection.totalPricePaise / 100).toLocaleString("en-IN")}` : " · Included"}</p>)}</div>}
        <p className={`mt-2 text-xs font-bold ${activeBooking.vehicleMode === "PRIVATE_VEHICLE" ? "text-emerald-300" : "text-zinc-500"}`}>{activeBooking.vehicleMode === "SAVED_VEHICLE" ? `Saved ${ride.vehicleType.toLowerCase()} selected` : activeBooking.vehicleMode === "RIDE_ONLY_DETAILS" ? `${ride.vehicleType} details shared for this ride only` : activeBooking.vehicleMode === "PRIVATE_VEHICLE" ? `Own ${ride.vehicleType.toLowerCase()} · details kept private` : "No vehicle attached to this booking"}</p>
        {activeBooking.status === "RESERVED" && activeBooking.reservationExpiresAt && <p className="mt-3 text-xs leading-5 text-amber-300">Slot held until {when(activeBooking.reservationExpiresAt)} while the Guild reviews your confirmation payment.</p>}
        {activeBooking.status === "WAITLISTED" && <p className="mt-3 text-xs leading-5 text-zinc-500">No slot or payment is reserved. If capacity opens, the oldest eligible waitlisted rider receives a time-limited reservation and email.</p>}
        {activeBooking.status === "CONFIRMED" && <p className="mt-3 text-xs leading-5 text-emerald-300">Your place is confirmed{paymentSummary?.fullyPaid ? " and the booking is fully paid." : ". Any remaining balance is tracked separately below."}</p>}
        {activeBooking.status !== "WAITLISTED" && paymentSummary && <div className="mt-5 border-t border-white/10 pt-5">
          <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-white/[.035] p-3"><p className="text-xs text-zinc-500">Paid</p><p className="mt-1 font-black text-emerald-300">₹{(paymentSummary.paidPaise / 100).toLocaleString("en-IN")}</p></div><div className="rounded-xl bg-white/[.035] p-3"><p className="text-xs text-zinc-500">Outstanding</p><p className={`mt-1 font-black ${paymentSummary.outstandingPaise ? "text-amber-300" : "text-emerald-300"}`}>₹{(paymentSummary.outstandingPaise / 100).toLocaleString("en-IN")}</p></div></div>
          <div className="mt-4 grid gap-3">{activeBooking.payments.map((payment) => {
            const active = paymentSummary.activePayment?.id === payment.id;
            const locked = payment.purpose === "BALANCE" && activeBooking.status !== "CONFIRMED";
            return <div key={payment.id} className={`rounded-2xl border p-4 ${active && paymentSummary.overdue ? "border-red-400/25 bg-red-400/[.035]" : "border-white/10 bg-white/[.02]"}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-zinc-400">{payment.purpose.replaceAll("_", " ")}</p><p className="mt-1 text-lg font-black">₹{(payment.amountPaise / 100).toLocaleString("en-IN")}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${payment.status === "CONFIRMED" ? "bg-emerald-400/15 text-emerald-300" : payment.status === "REJECTED" ? "bg-red-400/15 text-red-300" : payment.status === "SUBMITTED" ? "bg-amber-400/15 text-amber-300" : "bg-white/10 text-zinc-300"}`}>{locked ? "AFTER ADVANCE" : payment.status}</span></div>
              {payment.dueAt && !locked && payment.status !== "CONFIRMED" && <p className={`mt-2 text-xs ${active && paymentSummary.overdue ? "font-bold text-red-300" : "text-zinc-500"}`}>{active && paymentSummary.overdue ? "Overdue · " : "Due · "}{when(payment.dueAt)}</p>}
              {active && payment.method === "CASH" && payment.status === "PENDING" && <p className="mt-3 text-xs leading-5 text-zinc-400">Cash selected. Pay the Guild directly; only authorized finance staff can mark it received.</p>}
              {active && payment.status === "SUBMITTED" && <p className="mt-3 text-xs font-bold leading-5 text-amber-300">Proof submitted. The Guild finance team has been notified by email.</p>}
              {active && payment.method === "UPI" && (payment.status === "PENDING" || payment.status === "REJECTED") && payment.payeeVpaSnapshot && payment.payeeNameSnapshot && <UpiPaymentPanel paymentId={payment.id} vpa={payment.payeeVpaSnapshot} payeeName={payment.payeeNameSnapshot} amountPaise={payment.amountPaise} rideTitle={ride.title} participantName={session?.user.displayName ?? "Rider"} instructions={payment.payeeInstructionsSnapshot} />}
              {active && payment.method === "UPI" && (payment.status === "PENDING" || payment.status === "REJECTED") && (!payment.payeeVpaSnapshot || !payment.payeeNameSnapshot) && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[.04] p-3 text-xs leading-5 text-amber-300">This older obligation has no UPI recipient snapshot. Ask the Guild finance team for verified payment instructions before paying.</p>}
              {active && payment.method !== "CASH" && (payment.status === "PENDING" || payment.status === "REJECTED") && <div className="mt-4"><MediaUploader purpose="PAYMENT_PROOF" bookingPaymentId={payment.id} label={payment.status === "REJECTED" ? "Replace rejected payment proof" : `Upload ${payment.purpose === "BALANCE" ? "balance" : "payment"} proof`} help={payment.status === "REJECTED" ? `Finance feedback: ${payment.rejectionReason ?? "Upload a clearer or corrected payment record."}` : "Private JPEG, PNG, or WebP up to 5 MB. The Guild finance team will be notified after submission."} /></div>}
            </div>;
          })}</div>
        </div>}
      </div>
      : ride.status === "PUBLISHED" && (!soldOut || waitlistOpen) ? session ? <RideBookingForm
          rideId={ride.id}
          rideSlug={ride.slug}
          origins={ride.origins.map((origin) => ({ id: origin.id, label: `${origin.city} · ${origin.meetingPoint}` }))}
          vehicles={session.user.vehicles.filter((vehicle) => vehicle.type === ride.vehicleType).map((vehicle) => ({ id: vehicle.id, label: `${vehicle.manufacturer} ${vehicle.model}${vehicle.nickname ? ` · ${vehicle.nickname}` : ""}` }))}
          vehicleType={ride.vehicleType}
          addOns={items("ADD_ON").map((item) => ({ id: item.id, title: item.title, description: item.description, pricePaise: item.pricePaise }))}
          dietaryPreference={session.user.profile?.dietaryPreference ?? ""}
          accessibilityNotes={session.user.profile?.accessibilityNotes ?? ""}
          soldOut={soldOut}
          waitlistSlotsLeft={waitlistSlotsLeft}
          newcomerConsentAvailable={ride.community.newcomerDisplayEnabled && !welcomeConsentActive}
          guildName={ride.community.name}
          upiAvailable={ride.community.paymentSettings?.upiEnabled ?? false}
          ridePricePaise={ride.pricePaise}
          confirmationDepositPaise={ride.confirmationDepositPaise}
          accommodations={ride.accommodations.filter((stay) => stay.options.length).map((stay) => ({ id: stay.id, label: `${stay.locality} · ${stay.exactLocationRestricted ? "Stay" : stay.propertyName}`, options: stay.options.map((option) => ({ id: option.id, name: option.name, description: option.description, pricingMode: option.pricingMode, pricePaise: option.pricePaise, maxOccupancy: option.maxOccupancy, availableRooms: option.availableRooms })) }))}
        /> : <Link href={`/login?returnTo=${encodeURIComponent(`/rides/${ride.slug}#booking`)}`} className="mt-5 block rounded-2xl bg-orange-500 px-5 py-3.5 text-center text-sm font-black text-white hover:bg-orange-400">Sign in to {soldOut ? "join the waitlist" : "reserve"}</Link>
      : ride.status === "PUBLISHED" ? <p className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[.04] p-4 text-center text-sm font-bold text-amber-200">No participant or waitlist places remain for this ride.</p>
      : <p className="mt-5 rounded-2xl border border-white/10 p-4 text-center text-sm font-black text-zinc-300">This ride is {ride.status.toLowerCase()} and is not accepting reservations.</p>}
    </aside></section>
  </>;
}
