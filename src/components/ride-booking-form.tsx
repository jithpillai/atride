"use client";

import { useActionState } from "react";

import { FormPendingSubmit } from "@/components/pending-feedback";
import { reserveRideAction, type ReserveRideState } from "@/server/booking/actions";

type Option = { id: string; label: string };
type AddOn = { id: string; title: string; description: string | null; pricePaise: number | null };

export function RideBookingForm({
  rideId,
  rideSlug,
  origins,
  vehicles,
  addOns,
  dietaryPreference,
  accessibilityNotes,
  soldOut,
  newcomerConsentAvailable,
  upiAvailable,
}: {
  rideId: string;
  rideSlug: string;
  origins: Option[];
  vehicles: Option[];
  addOns: AddOn[];
  dietaryPreference: string;
  accessibilityNotes: string;
  soldOut: boolean;
  newcomerConsentAvailable: boolean;
  upiAvailable: boolean;
}) {
  const [state, action] = useActionState<ReserveRideState, FormData>(reserveRideAction, {});
  return <form id="booking" action={action} className="relative mt-6 grid gap-5 scroll-mt-28">
    <input type="hidden" name="rideId" value={rideId} />
    <input type="hidden" name="rideSlug" value={rideSlug} />
    <label className="text-sm font-bold">Starting group<select name="originId" required className="field bg-[#101419]">{origins.map((origin) => <option key={origin.id} value={origin.id}>{origin.label}</option>)}</select></label>
    <label className="text-sm font-bold">Joining as<select name="occupantRole" className="field bg-[#101419]" defaultValue="RIDER"><option value="RIDER">Rider</option><option value="PILLION">Pillion</option><option value="DRIVER">Driver</option><option value="PASSENGER">Passenger</option><option value="OTHER">Other participant</option></select></label>
    {!!vehicles.length && <label className="text-sm font-bold">Your vehicle<select name="vehicleId" className="field bg-[#101419]"><option value="">Not bringing a vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>)}</select></label>}
    <label className="text-sm font-bold">Dietary preference<select name="dietaryPreference" defaultValue={dietaryPreference} className="field bg-[#101419]"><option value="">Not specified</option><option>Vegetarian</option><option>Non-vegetarian</option><option>Vegan</option><option>Eggetarian</option><option>Other</option></select></label>
    <label className="text-sm font-bold">Accessibility or important ride notes<textarea name="accessibilityNotes" defaultValue={accessibilityNotes} maxLength={2000} className="field min-h-24" placeholder="Only information the organizer needs for safe planning" /></label>
    {!!addOns.length && <fieldset className="rounded-2xl border border-white/10 p-4"><legend className="px-2 text-sm font-black">Optional add-ons</legend><div className="grid gap-3">{addOns.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" name="addOnIds" value={item.id} className="mt-1 accent-orange-500" /><span><strong>{item.title}</strong>{item.pricePaise !== null && <span className="ml-2 text-orange-300">+₹{(item.pricePaise / 100).toLocaleString("en-IN")}</span>}{item.description && <span className="mt-1 block text-xs leading-5 text-zinc-500">{item.description}</span>}</span></label>)}</div></fieldset>}
    {!soldOut && <label className="text-sm font-bold">Payment method<select name="paymentMethod" className="field bg-[#101419]">{upiAvailable && <option value="UPI">UPI — app or QR</option>}<option value="BANK_TRANSFER">Bank transfer</option><option value="CASH">Cash — organizer confirmation required</option></select>{!upiAvailable && <span className="mt-2 block text-xs font-normal leading-5 text-zinc-500">This Guild has not enabled assisted UPI for new bookings.</span>}</label>}
    {soldOut && <><input type="hidden" name="paymentMethod" value={upiAvailable ? "UPI" : "BANK_TRANSFER"} /><label className="flex cursor-pointer gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[.04] p-4 text-sm"><input required type="checkbox" name="joinWaitlistWhenFull" className="mt-1 accent-orange-500" /><span><strong>Join the waitlist</strong><span className="mt-1 block text-xs text-zinc-500">This does not reserve a slot or request payment. The Guild can contact you if capacity becomes available.</span></span></label></>}
    <label className="flex cursor-pointer gap-3 text-sm leading-6"><input required type="checkbox" name="waiverAccepted" className="mt-1.5 accent-orange-500" /><span>I have reviewed and accept the ride rules, safety requirements, and waiver shown on this page.</span></label>
    <label className="flex cursor-pointer gap-3 text-sm leading-6"><input required type="checkbox" name="commercialTermsAccepted" className="mt-1.5 accent-orange-500" /><span>I accept the displayed price, inclusions, exclusions, payment schedule, cancellation, refund, and replacement policies.</span></label>
    {newcomerConsentAvailable && <label className="flex cursor-pointer gap-3 text-sm leading-6 text-zinc-400"><input type="checkbox" name="newcomerDisplayConsent" className="mt-1.5 accent-orange-500" /><span>If this becomes my first confirmed ride with this Guild, allow a member-only welcome tile using my display name and profile image.</span></label>}
    {state.error && <p role="alert" className="rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-bold text-red-300">{state.error}</p>}
    <FormPendingSubmit idleLabel={soldOut ? "Join waitlist" : "Reserve my slot"} pendingLabel={soldOut ? "Joining…" : "Reserving…"} overlayLabel={soldOut ? "Adding you to the waitlist…" : "Securing your ride slot…"} className="w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-sm font-black text-white hover:bg-orange-400" />
  </form>;
}
