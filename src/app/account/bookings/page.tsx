import Link from "next/link";
import { redirect } from "next/navigation";

import { ImageWithFallback } from "@/components/image-with-fallback";
import { MediaUploader } from "@/components/media-uploader";
import { UpiPaymentPanel } from "@/components/upi-payment-panel";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/server/auth/session";
import { summarizeBookingPayments } from "@/server/booking/payment-summary";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";

export const metadata = { title: "Booking history", robots: { index: false, follow: false } };

function when(date: Date) {
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

function money(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function bookingStatusClass(status: string) {
  if (status === "CONFIRMED") return "bg-emerald-400/15 text-emerald-300";
  if (status === "RESERVED" || status === "WAITLISTED") return "bg-amber-400/15 text-amber-300";
  if (status === "CANCELLED" || status === "EXPIRED") return "bg-red-400/15 text-red-300";
  return "bg-white/10 text-zinc-300";
}

function paymentStatusClass(status: string) {
  if (status === "CONFIRMED") return "bg-emerald-400/15 text-emerald-300";
  if (status === "SUBMITTED") return "bg-amber-400/15 text-amber-300";
  if (status === "REJECTED") return "bg-red-400/15 text-red-300";
  return "bg-white/10 text-zinc-300";
}

export default async function BookingHistoryPage() {
  const session = await getCurrentSession();
  if (!session) redirect(`/login?returnTo=${encodeURIComponent("/account/bookings")}`);
  if (!session.user.profile?.onboardingCompletedAt) redirect(`/onboarding?returnTo=${encodeURIComponent("/account/bookings")}`);

  const bookings = await db.rideBooking.findMany({
    where: { userId: session.userId },
    include: {
      community: { select: { name: true, slug: true, logoAsset: true } },
      ride: { select: { slug: true, title: true, destination: true, startsAt: true, endsAt: true, status: true, disruptions: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 } } },
      origin: { select: { city: true, meetingPoint: true, departureAt: true } },
      participants: { orderBy: { sortOrder: "asc" } },
      accommodationSelections: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "asc" } },
      refund: true,
    },
    orderBy: [{ ride: { startsAt: "desc" } }, { createdAt: "desc" }],
    take: 50,
  });

  const ordered = bookings
    .map((booking) => ({ booking, summary: summarizeBookingPayments(booking), paymentActionsOpen: booking.ride.status === "PUBLISHED" || booking.ride.status === "CLOSED" }))
    .sort((left, right) => {
      const leftNeedsAction = Boolean(left.paymentActionsOpen && left.summary.activePayment && ["PENDING", "REJECTED"].includes(left.summary.activePayment.status));
      const rightNeedsAction = Boolean(right.paymentActionsOpen && right.summary.activePayment && ["PENDING", "REJECTED"].includes(right.summary.activePayment.status));
      return Number(rightNeedsAction) - Number(leftNeedsAction) || right.booking.ride.startsAt.getTime() - left.booking.ride.startsAt.getTime();
    });

  const actionCount = ordered.filter(({ summary, paymentActionsOpen }) => paymentActionsOpen && summary.activePayment && ["PENDING", "REJECTED"].includes(summary.activePayment.status)).length;

  return <section className="mx-auto min-h-[70vh] max-w-6xl px-5 py-16 lg:px-8">
    <Link href="/account" className="text-sm font-semibold text-zinc-400 hover:text-white">← Account</Link>
    <div className="mt-8 flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">Your ride activity</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Booking history</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500">Manage ride payments here without loading the complete ride page. Open a ride only when you want its itinerary, rules, gallery, or live progress.</p>
      </div>
      <div className={`w-fit rounded-full px-4 py-2 text-xs font-black ${actionCount ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/15 text-emerald-300"}`}>
        {actionCount ? `${actionCount} ${actionCount === 1 ? "booking needs" : "bookings need"} action` : "No payment action pending"}
      </div>
    </div>

    <div className="mt-8 grid gap-6">
      {ordered.length ? ordered.map(({ booking, summary, paymentActionsOpen }) => {
        const inactive = ["EXPIRED", "CANCELLED", "TRANSFERRED"].includes(booking.status);
        const activePayment = inactive ? null : summary.activePayment;
        return <article key={booking.id} className={`overflow-hidden rounded-3xl border bg-white/[.02] ${activePayment && ["PENDING", "REJECTED"].includes(activePayment.status) ? "border-orange-400/30" : "border-white/10"}`}>
          <div className="p-6 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <ImageWithFallback
                  src={booking.community.logoAsset ? cloudinaryImageUrl(booking.community.logoAsset) : "/defaults/guild-avatar.png"}
                  fallbackSrc="/defaults/guild-avatar.png"
                  alt={`${booking.community.name} logo`}
                  width={64}
                  height={64}
                  className="size-14 shrink-0 rounded-2xl border border-white/10 object-contain sm:size-16"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-300">{booking.community.name}</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{booking.ride.title}</h2>
                  <p className="mt-2 text-sm text-zinc-500">{booking.origin?.city ?? "Starting group unavailable"} → {booking.ride.destination} · {when(booking.ride.startsAt)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <span className={`rounded-full px-3 py-1.5 text-xs font-black ${bookingStatusClass(booking.status)}`}>{booking.status.replaceAll("_", " ")}</span>
                <Link href={`/rides/${booking.ride.slug}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-black text-white hover:border-orange-400/40 hover:text-orange-300">View ride</Link>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-white/[.035] p-4"><p className="text-xs text-zinc-500">Party</p><p className="mt-1 font-black">{booking.seatCount} {booking.seatCount === 1 ? "person" : "people"}</p></div>
              <div className="rounded-2xl bg-white/[.035] p-4"><p className="text-xs text-zinc-500">Booking total</p><p className="mt-1 font-black">{money(booking.totalPricePaise)}</p></div>
              <div className="rounded-2xl bg-white/[.035] p-4"><p className="text-xs text-zinc-500">Paid</p><p className="mt-1 font-black text-emerald-300">{money(summary.paidPaise)}</p></div>
              <div className="rounded-2xl bg-white/[.035] p-4"><p className="text-xs text-zinc-500">Outstanding</p><p className={`mt-1 font-black ${summary.outstandingPaise ? "text-amber-300" : "text-emerald-300"}`}>{money(summary.outstandingPaise)}</p></div>
            </div>

            <details className="mt-5 rounded-2xl border border-white/10 p-4">
              <summary className="cursor-pointer text-sm font-black">Party, starting point, and stay details</summary>
              <div className="mt-4 grid gap-4 text-sm text-zinc-400 sm:grid-cols-2">
                <div><p className="font-bold text-zinc-200">Participants</p><div className="mt-2 grid gap-1">{booking.participants.map((participant) => <p key={participant.id}>{participant.displayName}{participant.isBookingLead ? " · Booking lead" : ""} · {participant.role.toLowerCase()}</p>)}</div></div>
                <div><p className="font-bold text-zinc-200">Starting point</p><p className="mt-2">{booking.origin ? `${booking.origin.city} · ${booking.origin.meetingPoint}` : "Starting group unavailable"}</p>{booking.origin && <p className="mt-1 text-xs text-zinc-600">Departure: {when(booking.origin.departureAt)}</p>}</div>
                {!!booking.accommodationSelections.length && <div className="sm:col-span-2"><p className="font-bold text-zinc-200">Accommodation</p><div className="mt-2 grid gap-1">{booking.accommodationSelections.map((selection) => <p key={selection.id}>{selection.accommodationName} · {selection.optionName}{selection.totalPricePaise ? ` · ${money(selection.totalPricePaise)}` : " · Included"}</p>)}</div></div>}
              </div>
            </details>
            {booking.ride.disruptions[0] && <div className={`mt-5 rounded-2xl border p-4 ${booking.ride.status === "CANCELLED" ? "border-red-400/20 bg-red-400/[.035]" : "border-amber-400/20 bg-amber-400/[.035]"}`}><p className={`text-sm font-black ${booking.ride.status === "CANCELLED" ? "text-red-300" : "text-amber-300"}`}>Ride {booking.ride.status.toLowerCase()}</p><p className="mt-2 text-sm leading-6 text-zinc-400">{booking.ride.disruptions[0].reason}</p>{booking.ride.disruptions[0].proposedResumeAt && <p className="mt-2 text-xs font-bold text-amber-200">Proposed update: {when(booking.ride.disruptions[0].proposedResumeAt)}</p>}</div>}
            {booking.refund && <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[.025] p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-300">Refund reconciliation</p><p className="mt-2 font-black">{booking.refund.status.replaceAll("_", " ")}</p><p className="mt-2 text-xs text-zinc-400">Refundable: {money(booking.refund.confirmedAmountPaise)} · Refunded: {money(booking.refund.refundedAmountPaise)}</p>{booking.refund.reference && <p className="mt-1 text-xs text-zinc-500">Reference: {booking.refund.reference}</p>}{booking.refund.note && <p className="mt-2 text-xs leading-5 text-zinc-400">{booking.refund.note}</p>}</div>}
          </div>

          {!inactive && booking.status !== "WAITLISTED" && <section className="border-t border-white/10 bg-black/15 p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Payments</p><h3 className="mt-2 text-xl font-black">Advance and balance</h3></div>{summary.fullyPaid && <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-black text-emerald-300">Fully paid</span>}</div>
            {!paymentActionsOpen && <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[.04] p-3 text-xs font-bold leading-5 text-amber-200">Payment actions are paused while this ride is disrupted.</p>}
            <div className="mt-5 grid gap-4">{booking.payments.map((payment) => {
              const active = activePayment?.id === payment.id;
              const locked = payment.purpose === "BALANCE" && booking.status !== "CONFIRMED";
              return <div key={payment.id} className={`rounded-2xl border p-5 ${active && summary.overdue ? "border-red-400/25 bg-red-400/[.035]" : active ? "border-orange-400/20 bg-orange-400/[.025]" : "border-white/10"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-zinc-400">{payment.purpose.replaceAll("_", " ")}</p><p className="mt-1 text-xl font-black">{money(payment.amountPaise)}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${paymentStatusClass(payment.status)}`}>{locked ? "AFTER ADVANCE" : payment.status}</span></div>
                {payment.dueAt && !locked && payment.status !== "CONFIRMED" && <p className={`mt-2 text-xs ${active && summary.overdue ? "font-bold text-red-300" : "text-zinc-500"}`}>{active && summary.overdue ? "Overdue · " : "Due · "}{when(payment.dueAt)}</p>}
                {payment.status === "CONFIRMED" && payment.reviewedAt && <p className="mt-2 text-xs text-zinc-500">Confirmed by the Guild on {when(payment.reviewedAt)}</p>}
                {active && payment.status === "SUBMITTED" && <p className="mt-3 text-xs font-bold leading-5 text-amber-300">Proof submitted and waiting for Guild finance review.</p>}
                {paymentActionsOpen && active && payment.method === "CASH" && payment.status === "PENDING" && <p className="mt-3 text-xs leading-5 text-zinc-400">Cash selected. Pay the Guild directly; authorized finance staff will mark it received.</p>}
                {paymentActionsOpen && active && payment.method === "UPI" && ["PENDING", "REJECTED"].includes(payment.status) && payment.payeeVpaSnapshot && payment.payeeNameSnapshot && <UpiPaymentPanel paymentId={payment.id} vpa={payment.payeeVpaSnapshot} payeeName={payment.payeeNameSnapshot} amountPaise={payment.amountPaise} rideTitle={booking.ride.title} participantName={session.user.displayName} instructions={payment.payeeInstructionsSnapshot} />}
                {paymentActionsOpen && active && payment.method === "UPI" && ["PENDING", "REJECTED"].includes(payment.status) && (!payment.payeeVpaSnapshot || !payment.payeeNameSnapshot) && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[.04] p-3 text-xs leading-5 text-amber-300">This obligation has no saved UPI recipient. Contact the Guild for verified payment instructions.</p>}
                {paymentActionsOpen && active && payment.method !== "CASH" && ["PENDING", "REJECTED"].includes(payment.status) && <div className="mt-4"><MediaUploader purpose="PAYMENT_PROOF" bookingPaymentId={payment.id} label={payment.status === "REJECTED" ? "Replace rejected payment proof" : `Upload ${payment.purpose === "BALANCE" ? "balance" : "payment"} proof`} help={payment.status === "REJECTED" ? `Finance feedback: ${payment.rejectionReason ?? "Upload a clearer or corrected payment record."}` : "Private JPEG, PNG, or WebP up to 5 MB. The Guild finance team is notified after submission."} /></div>}
              </div>;
            })}</div>
          </section>}

          {booking.status === "WAITLISTED" && <p className="border-t border-white/10 p-6 text-sm leading-6 text-zinc-500">You are on the waitlist. No payment is required unless a slot becomes available and the Guild promotes this booking.</p>}
          {inactive && <p className="border-t border-white/10 p-6 text-sm leading-6 text-zinc-500">This booking is part of your history and no longer accepts payment actions.</p>}
        </article>;
      }) : <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center"><h2 className="text-xl font-black">No bookings yet</h2><p className="mt-2 text-sm text-zinc-500">Your ride reservations and payment history will appear here.</p><Link href="/#rides" className="mt-5 inline-flex rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black text-white">Explore rides</Link></div>}
    </div>
  </section>;
}
