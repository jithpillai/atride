import Link from "next/link";
import { redirect } from "next/navigation";

import { FormPendingSubmit } from "@/components/pending-feedback";
import { ShareParticipantList } from "@/components/share-participant-list";
import { cancelRideBooking } from "@/server/booking/operations-actions";
import { summarizeBookingPayments } from "@/server/booking/payment-summary";
import { AuthError } from "@/server/auth/auth-service";
import { requireSession } from "@/server/auth/authorization";
import { canManageGuildRides } from "@/server/auth/permissions";
import { bookingVehicleLabel, humanize, loadRideManifest, participantWhatsAppList } from "@/server/ride/manifest";

type Props = {
  params: Promise<{ slug: string; rideId: string }>;
  searchParams: Promise<{ cancelled?: string; promoted?: string; refundReview?: string; proofReview?: string; cancelError?: string }>;
};
export const metadata = { title: "Ride participants", robots: { index: false, follow: false } };

function money(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

export default async function RideParticipantsPage({ params, searchParams }: Props) {
  const { slug, rideId } = await params;
  const state = await searchParams;
  const session = await requireSession(`/guilds/${slug}/rides/${rideId}/participants`);
  let manifest: Awaited<ReturnType<typeof loadRideManifest>>;
  try {
    manifest = await loadRideManifest(session, slug, rideId);
  } catch (error) {
    if (error instanceof AuthError) redirect("/account?access=denied");
    throw error;
  }
  const { ride, scope } = manifest;
  const participantCount = ride.bookings.reduce((total, booking) => total + (booking.participants.length || booking.seatCount), 0);
  const confirmedCount = ride.bookings.filter(({ status }) => status === "CONFIRMED").reduce((total, booking) => total + (booking.participants.length || booking.seatCount), 0);
  const originNames = ride.origins.filter(({ id }) => scope.originIds.includes(id)).map(({ city }) => city).join(", ");
  const membership = session.user.communityMemberships.find(({ community }) => community.slug === slug);
  const canCancelBookings = canManageGuildRides(membership);
  const cancellableStatuses = new Set(["RESERVED", "CONFIRMED", "WAITLISTED", "PAYMENT_REJECTED", "TRANSFER_PENDING"]);

  return <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-14 lg:px-8">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <Link href={`/guilds/${slug}/rides/${rideId}/edit`} className="text-sm font-bold text-zinc-500 hover:text-white">← Ride studio</Link>
        <p className="eyebrow mt-7">Ride operations · Private manifest</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{ride.title}</h1>
        <p className="mt-3 text-sm text-zinc-500">{scope.kind === "ALL" ? "Whole-ride access" : `Starting-group access: ${originNames}`}</p>
      </div>
      <a href={`/api/guilds/${slug}/rides/${rideId}/participants/export`} className="cursor-pointer rounded-full bg-orange-500 px-6 py-3 text-center text-sm font-black text-white hover:bg-orange-400">Download Excel-compatible report</a>
    </div>

    {state.cancelled && <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.07] px-5 py-4 text-sm leading-6 text-emerald-200"><strong>Booking cancelled and capacity recalculated.</strong>{Number(state.promoted ?? 0) > 0 ? ` ${state.promoted} waitlisted seat(s) were promoted.` : ""}{state.refundReview ? " Confirmed money remains recorded and requires refund/reconciliation review." : ""}{state.proofReview ? " A submitted proof remains preserved in the booking history for reconciliation." : ""}</div>}
    {state.cancelError && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-semibold text-red-300">{state.cancelError === "details" ? "Enter a cancellation reason and acknowledge the operational and financial impact." : "This booking could not be cancelled. It may already be inactive or changed by another staff member."}</p>}

    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-3xl font-black">{ride.bookings.length}</p><p className="mt-2 text-sm text-zinc-500">Booking parties</p></article>
      <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-3xl font-black">{participantCount}</p><p className="mt-2 text-sm text-zinc-500">Participants in view</p></article>
      <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-3xl font-black text-emerald-300">{confirmedCount}</p><p className="mt-2 text-sm text-zinc-500">Confirmed participants</p></article>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.7fr)] xl:items-start">
      <div className="grid gap-4">
        {ride.bookings.length ? ride.bookings.map((booking, bookingIndex) => {
          const payment = summarizeBookingPayments(booking);
          const lead = booking.participants.find(({ isBookingLead }) => isBookingLead);
          const participants = booking.participants.length ? booking.participants : [{
            id: `legacy-${booking.id}`, displayName: booking.user.displayName, role: booking.occupantRole,
            dietaryPreference: booking.dietaryPreference, accessibilityNotes: booking.accessibilityNotes,
            emergencyContactName: null, emergencyContactPhone: null, isBookingLead: true,
          }];
          return <article key={booking.id} className="rounded-3xl border border-white/10 bg-white/[.025] p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><p className="eyebrow">Party {bookingIndex + 1} · {booking.origin?.city ?? ride.originCity}</p><h2 className="mt-2 text-xl font-black">{lead?.displayName ?? booking.user.displayName}</h2><p className="mt-1 text-xs text-zinc-500">Booked {booking.createdAt.toLocaleDateString("en-IN")} · {booking.seatCount} {booking.seatCount === 1 ? "seat" : "seats"}</p></div>
              <div className="flex flex-wrap gap-2"><span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold">{humanize(booking.status)}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${payment.fullyPaid ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{payment.fullyPaid ? "Paid" : `${money(payment.outstandingPaise)} due`}</span></div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {participants.map((participant, index) => <div key={participant.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                <div className="flex items-start justify-between gap-3"><p className="font-black">{index + 1}. {participant.displayName}</p><span className="text-[11px] font-bold uppercase tracking-wider text-orange-300">{humanize(participant.role)}</span></div>
                <dl className="mt-3 grid gap-2 text-xs leading-5 text-zinc-400">
                  <div><dt className="inline text-zinc-600">Diet: </dt><dd className="inline">{participant.dietaryPreference ?? "Not specified"}</dd></div>
                  {participant.accessibilityNotes && <div><dt className="inline text-zinc-600">Medical/accessibility: </dt><dd className="inline">{participant.accessibilityNotes}</dd></div>}
                  {(participant.emergencyContactName || participant.emergencyContactPhone) && <div><dt className="inline text-zinc-600">Emergency: </dt><dd className="inline">{[participant.emergencyContactName, participant.emergencyContactPhone].filter(Boolean).join(" · ")}</dd></div>}
                </dl>
              </div>)}
            </div>
            <dl className="mt-5 grid gap-3 border-t border-white/8 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="text-xs text-zinc-600">Lead contact</dt><dd className="mt-1 break-words font-semibold">{booking.user.profile?.operationalPhone ?? "Phone not provided"}{booking.user.profile?.phoneVerifiedAt ? " ✓" : ""}<br /><span className="text-xs text-zinc-500">{booking.user.contacts[0]?.displayValue ?? "Email unavailable"}</span></dd></div>
              <div><dt className="text-xs text-zinc-600">Blood group</dt><dd className="mt-1 font-semibold">{booking.user.profile?.bloodGroup ?? "Not provided"}</dd></div>
              <div><dt className="text-xs text-zinc-600">Vehicle</dt><dd className="mt-1 font-semibold">{bookingVehicleLabel(booking)}</dd></div>
              <div><dt className="text-xs text-zinc-600">Accommodation</dt><dd className="mt-1 font-semibold">{booking.accommodationSelections.map(({ optionName, guestCount }) => `${optionName} · ${guestCount} guest${guestCount === 1 ? "" : "s"}`).join(", ") || booking.accommodationSelection || "Not selected"}</dd></div>
              <div><dt className="text-xs text-zinc-600">Payment</dt><dd className="mt-1 font-semibold">{money(payment.paidPaise)} paid · {money(payment.outstandingPaise)} due</dd></div>
              <div><dt className="text-xs text-zinc-600">Meeting point</dt><dd className="mt-1 font-semibold">{booking.origin?.meetingPoint ?? "Not assigned"}</dd></div>
            </dl>
            {canCancelBookings && cancellableStatuses.has(booking.status) && <details className="mt-5 border-t border-white/8 pt-5">
              <summary className="cursor-pointer text-sm font-black text-red-300">Cancel this booking</summary>
              <form action={cancelRideBooking} className="relative mt-4 rounded-2xl border border-red-400/15 bg-red-400/[.035] p-4">
                <input type="hidden" name="guildSlug" value={slug} /><input type="hidden" name="rideId" value={ride.id} /><input type="hidden" name="bookingId" value={booking.id} />
                <p className="text-xs leading-5 text-zinc-400">This releases {booking.seatCount} seat(s) and associated room inventory, preserves all payment/proof history, and may immediately promote an eligible waitlisted party. It does not issue a bank refund.</p>
                <label className="mt-4 block text-xs font-bold">Reason visible in the audit history<textarea required minLength={8} maxLength={1000} name="reason" rows={3} className="field text-sm" placeholder="For example: participant requested cancellation by phone" /></label>
                <label className="mt-3 flex cursor-pointer gap-3 text-xs leading-5 text-zinc-400"><input required type="checkbox" name="acknowledged" className="mt-1 accent-red-400" /><span>I have reviewed any received/submitted payment and will handle required participant communication or refund separately.</span></label>
                <FormPendingSubmit idleLabel="Cancel booking" pendingLabel="Cancelling…" overlayLabel="Cancelling booking and recalculating capacity…" className="mt-4 cursor-pointer rounded-full border border-red-400/35 px-5 py-2.5 text-xs font-black text-red-300" />
              </form>
            </details>}
          </article>;
        }) : <p className="rounded-3xl border border-dashed border-white/10 p-8 text-sm text-zinc-500">No participant bookings are visible in your assigned starting group.</p>}
      </div>
      <div className="xl:sticky xl:top-28"><ShareParticipantList message={participantWhatsAppList(manifest)} /></div>
    </div>
  </section>;
}
