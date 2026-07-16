"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { FormPendingSubmit } from "@/components/pending-feedback";
import { reserveRideAction, type ReserveRideState } from "@/server/booking/actions";

type Option = { id: string; label: string };
type AddOn = { id: string; title: string; description: string | null; pricePaise: number | null };
type Accommodation = {
  id: string;
  label: string;
  options: Array<{ id: string; name: string; description: string | null; pricingMode: "INCLUDED" | "PER_PERSON" | "PER_ROOM"; pricePaise: number; maxOccupancy: number; availableRooms: number | null }>;
};

export function RideBookingForm({
  rideId,
  rideSlug,
  origins,
  vehicles,
  vehicleType,
  addOns,
  dietaryPreference,
  accessibilityNotes,
  soldOut,
  waitlistSlotsLeft,
  newcomerConsentAvailable,
  guildName,
  upiAvailable,
  ridePricePaise,
  confirmationDepositPaise,
  accommodations,
}: {
  rideId: string;
  rideSlug: string;
  origins: Option[];
  vehicles: Option[];
  vehicleType: string;
  addOns: AddOn[];
  dietaryPreference: string;
  accessibilityNotes: string;
  soldOut: boolean;
  waitlistSlotsLeft: number;
  newcomerConsentAvailable: boolean;
  guildName: string;
  upiAvailable: boolean;
  ridePricePaise: number;
  confirmationDepositPaise: number;
  accommodations: Accommodation[];
}) {
  const [state, action] = useActionState<ReserveRideState, FormData>(reserveRideAction, {});
  const [occupantRole, setOccupantRole] = useState("RIDER");
  const [vehicleMode, setVehicleMode] = useState(vehicles.length ? "SAVED_VEHICLE" : "PRIVATE_VEHICLE");
  const [companionCount, setCompanionCount] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedAccommodation, setSelectedAccommodation] = useState<Record<string, string>>(() => Object.fromEntries(accommodations.filter((stay) => stay.options[0]).map((stay) => [stay.id, stay.options[0].id])));
  const operatesVehicle = occupantRole === "RIDER" || occupantRole === "DRIVER";
  const partySize = companionCount + 1;
  const addOnEstimate = addOns.filter((item) => selectedAddOns.includes(item.id)).reduce((total, item) => total + (item.pricePaise ?? 0), 0) * partySize;
  const accommodationEstimate = accommodations.reduce((total, stay) => {
    const option = stay.options.find((candidate) => candidate.id === selectedAccommodation[stay.id]);
    if (!option || option.pricingMode === "INCLUDED") return total;
    return total + (option.pricingMode === "PER_PERSON" ? option.pricePaise * partySize : option.pricePaise * Math.ceil(partySize / option.maxOccupancy));
  }, 0);
  const estimatedTotal = ridePricePaise * partySize + addOnEstimate + accommodationEstimate;
  const estimatedDeposit = confirmationDepositPaise > 0 ? Math.min(confirmationDepositPaise * partySize, estimatedTotal) : estimatedTotal;

  function changeOccupantRole(role: string) {
    setOccupantRole(role);
    if (role !== "RIDER" && role !== "DRIVER") setVehicleMode("NO_VEHICLE");
    else if (vehicleMode === "NO_VEHICLE") setVehicleMode(vehicles.length ? "SAVED_VEHICLE" : "PRIVATE_VEHICLE");
  }

  return <form id="booking" action={action} className="relative mt-6 grid gap-5 scroll-mt-28">
    <input type="hidden" name="rideId" value={rideId} />
    <input type="hidden" name="rideSlug" value={rideSlug} />
    <label className="text-sm font-bold">Starting group<select name="originId" required className="field bg-[#101419]">{origins.map((origin) => <option key={origin.id} value={origin.id}>{origin.label}</option>)}</select></label>
    <label className="text-sm font-bold">Joining as<select name="occupantRole" className="field bg-[#101419]" value={occupantRole} onChange={(event) => changeOccupantRole(event.target.value)}><option value="RIDER">Rider</option><option value="PILLION">Pillion</option><option value="DRIVER">Driver</option><option value="PASSENGER">Passenger</option><option value="OTHER">Other participant</option></select></label>
    {operatesVehicle ? <fieldset className="rounded-2xl border border-white/10 p-4">
      <legend className="px-2 text-sm font-black">Vehicle for this ride</legend>
      <p className="mb-4 text-xs leading-5 text-zinc-500">Choose how much vehicle information you want to share with this Guild for this booking.</p>
      <div className="grid gap-3">
        {!!vehicles.length && <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/8 p-3 text-sm"><input type="radio" name="vehicleMode" value="SAVED_VEHICLE" checked={vehicleMode === "SAVED_VEHICLE"} onChange={() => setVehicleMode("SAVED_VEHICLE")} className="mt-1 accent-orange-500" /><span><strong>Choose from my garage</strong><span className="mt-1 block text-xs leading-5 text-zinc-500">Use a vehicle already saved in your private @Ride account.</span></span></label>}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/8 p-3 text-sm"><input type="radio" name="vehicleMode" value="RIDE_ONLY_DETAILS" checked={vehicleMode === "RIDE_ONLY_DETAILS"} onChange={() => setVehicleMode("RIDE_ONLY_DETAILS")} className="mt-1 accent-orange-500" /><span><strong>Share basic details for this ride only</strong><span className="mt-1 block text-xs leading-5 text-zinc-500">These details stay on this booking and are not added to your garage.</span></span></label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/8 p-3 text-sm"><input type="radio" name="vehicleMode" value="PRIVATE_VEHICLE" checked={vehicleMode === "PRIVATE_VEHICLE"} onChange={() => setVehicleMode("PRIVATE_VEHICLE")} className="mt-1 accent-orange-500" /><span><strong>Bring my own {vehicleType.toLowerCase()} without sharing details</strong><span className="mt-1 block text-xs leading-5 text-zinc-500">The Guild sees only that you are bringing a compatible vehicle; no make, model, or registration detail is collected.</span></span></label>
      </div>
      {vehicleMode === "SAVED_VEHICLE" && <div className="mt-4">
        <label className="text-sm font-bold">Saved vehicle<select name="vehicleId" required className="field bg-[#101419]">{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>)}</select></label>
      </div>}
      {vehicleMode === "RIDE_ONLY_DETAILS" && <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">Manufacturer<input name="rideOnlyVehicleManufacturer" required maxLength={80} className="field" placeholder="e.g. Royal Enfield" /></label>
        <label className="text-xs font-bold">Model<input name="rideOnlyVehicleModel" required maxLength={80} className="field" placeholder="e.g. Himalayan" /></label>
        <label className="text-xs font-bold sm:col-span-2">Registration last 4 characters <span className="font-normal text-zinc-600">(optional)</span><input name="rideOnlyVehicleRegistrationLast4" maxLength={4} className="field uppercase" placeholder="e.g. 4ABC" /></label>
      </div>}
      <p className="mt-4 text-xs leading-5 text-zinc-500">Want the faster saved-vehicle option next time? <Link href="/account/vehicles" target="_blank" className="font-bold text-orange-300 underline underline-offset-4">Add or manage vehicles <span className="sr-only">(opens in a new tab)</span>↗</Link></p>
    </fieldset> : <input type="hidden" name="vehicleMode" value="NO_VEHICLE" />}
    <label className="text-sm font-bold">Dietary preference<select name="dietaryPreference" defaultValue={dietaryPreference} className="field bg-[#101419]"><option value="">Not specified</option><option>Vegetarian</option><option>Non-vegetarian</option><option>Vegan</option><option>Eggetarian</option><option>Other</option></select></label>
    <label className="text-sm font-bold">Accessibility or important ride notes<textarea name="accessibilityNotes" defaultValue={accessibilityNotes} maxLength={2000} className="field min-h-24" placeholder="Only information the organizer needs for safe planning" /></label>
    <fieldset className="rounded-2xl border border-white/10 p-4">
      <legend className="px-2 text-sm font-black">Booking party · {partySize} {partySize === 1 ? "person" : "people"}</legend>
      <p className="text-xs leading-5 text-zinc-500">You are the booking lead. Add pillions or passengers who may not have an AtRide account. Every named person occupies one ride slot.</p>
      <div className="mt-4 grid gap-4">{Array.from({ length: companionCount }, (_, index) => <div key={index} className="rounded-2xl border border-white/10 bg-black/15 p-4">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-black">Companion {index + 1}</p>{index === companionCount - 1 && <button type="button" onClick={() => setCompanionCount((count) => count - 1)} className="text-xs font-bold text-red-300">Remove</button>}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold">Full name<input required name="companionName" maxLength={120} className="field" /></label>
          <label className="text-xs font-bold">Travelling as<select required name="companionRole" defaultValue="PILLION" className="field bg-[#101419]"><option value="PILLION">Pillion</option><option value="PASSENGER">Passenger</option><option value="OTHER">Other participant</option></select></label>
          <label className="text-xs font-bold">Dietary preference<select name="companionDietaryPreference" className="field bg-[#101419]"><option value="">Not specified</option><option>Vegetarian</option><option>Non-vegetarian</option><option>Vegan</option><option>Eggetarian</option><option>Other</option></select></label>
          <label className="text-xs font-bold">Emergency contact name<input required name="companionEmergencyName" maxLength={120} className="field" /></label>
          <label className="text-xs font-bold sm:col-span-2">Emergency contact phone<input required name="companionEmergencyPhone" inputMode="tel" maxLength={32} placeholder="+91 90000 00000" className="field" /></label>
          <label className="text-xs font-bold sm:col-span-2">Medical, accessibility, or safety note <span className="font-normal text-zinc-600">(optional)</span><textarea name="companionAccessibilityNotes" maxLength={1000} rows={2} className="field" /></label>
        </div>
      </div>)}</div>
      {companionCount < 5 && <button type="button" onClick={() => setCompanionCount((count) => count + 1)} className="mt-4 rounded-full border border-orange-400/30 px-4 py-2 text-xs font-black text-orange-300">+ Add pillion or passenger</button>}
    </fieldset>
    {!!accommodations.length && <fieldset className="rounded-2xl border border-white/10 p-4"><legend className="px-2 text-sm font-black">Accommodation choices</legend><p className="mb-4 text-xs leading-5 text-zinc-500">Choose one option for each stay. Per-room prices automatically use enough rooms for the current party size.</p><div className="grid gap-4">{accommodations.map((stay) => <label key={stay.id} className="text-sm font-bold">{stay.label}<select required name="accommodationOptionIds" value={selectedAccommodation[stay.id] ?? ""} onChange={(event) => setSelectedAccommodation((current) => ({ ...current, [stay.id]: event.target.value }))} className="field bg-[#101419]">{stay.options.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.pricingMode === "INCLUDED" ? "Included" : `₹${(option.pricePaise / 100).toLocaleString("en-IN")} ${option.pricingMode === "PER_PERSON" ? "per person" : `per room (up to ${option.maxOccupancy})`}`}</option>)}</select>{stay.options.find((option) => option.id === selectedAccommodation[stay.id])?.description && <span className="mt-2 block text-xs font-normal leading-5 text-zinc-500">{stay.options.find((option) => option.id === selectedAccommodation[stay.id])?.description}</span>}</label>)}</div></fieldset>}
    {!!addOns.length && <fieldset className="rounded-2xl border border-white/10 p-4"><legend className="px-2 text-sm font-black">Optional add-ons</legend><p className="mb-3 text-xs text-zinc-500">Displayed add-on prices apply per person in this booking party.</p><div className="grid gap-3">{addOns.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" name="addOnIds" value={item.id} checked={selectedAddOns.includes(item.id)} onChange={(event) => setSelectedAddOns((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} className="mt-1 accent-orange-500" /><span><strong>{item.title}</strong>{item.pricePaise !== null && <span className="ml-2 text-orange-300">+₹{(item.pricePaise / 100).toLocaleString("en-IN")} each</span>}{item.description && <span className="mt-1 block text-xs leading-5 text-zinc-500">{item.description}</span>}</span></label>)}</div></fieldset>}
    <div className="rounded-2xl border border-orange-400/20 bg-orange-400/[.04] p-4"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-300">Estimated booking total</p><p className="mt-1 text-2xl font-black">₹{(estimatedTotal / 100).toLocaleString("en-IN")}</p></div><div className="text-right text-xs leading-5 text-zinc-500"><p>{partySize} × ₹{(ridePricePaise / 100).toLocaleString("en-IN")} ride fee</p>{accommodationEstimate > 0 && <p>+ ₹{(accommodationEstimate / 100).toLocaleString("en-IN")} accommodation</p>}<p className="font-bold text-amber-300">₹{(estimatedDeposit / 100).toLocaleString("en-IN")} due for hold</p></div></div></div>
    {!soldOut && <label className="text-sm font-bold">Payment method<select name="paymentMethod" className="field bg-[#101419]">{upiAvailable && <option value="UPI">UPI — app or QR</option>}<option value="BANK_TRANSFER">Bank transfer</option><option value="CASH">Cash — organizer confirmation required</option></select>{!upiAvailable && <span className="mt-2 block text-xs font-normal leading-5 text-zinc-500">This Guild has not enabled assisted UPI for new bookings.</span>}</label>}
    {soldOut && <><input type="hidden" name="paymentMethod" value={upiAvailable ? "UPI" : "BANK_TRANSFER"} /><label className="flex cursor-pointer gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[.04] p-4 text-sm"><input required type="checkbox" name="joinWaitlistWhenFull" className="mt-1 accent-orange-500" /><span><strong>Join the waitlist · {waitlistSlotsLeft} {waitlistSlotsLeft === 1 ? "place" : "places"} left</strong><span className="mt-1 block text-xs text-zinc-500">This does not reserve a ride slot or request payment. Your entire booking party must fit within the remaining waitlist places.</span></span></label></>}
    <label className="flex cursor-pointer gap-3 text-sm leading-6"><input required type="checkbox" name="waiverAccepted" className="mt-1.5 accent-orange-500" /><span>I have reviewed and accept the ride rules, safety requirements, and waiver shown on this page.</span></label>
    <label className="flex cursor-pointer gap-3 text-sm leading-6"><input required type="checkbox" name="commercialTermsAccepted" className="mt-1.5 accent-orange-500" /><span>I accept the displayed price, inclusions, exclusions, payment schedule, cancellation, refund, and replacement policies.</span></label>
    {newcomerConsentAvailable && <label className="flex cursor-pointer gap-3 text-sm leading-6 text-zinc-400"><input type="checkbox" name="newcomerDisplayConsent" className="mt-1.5 accent-orange-500" /><span>If this becomes my first confirmed ride with {guildName}, allow a member-only welcome tile using my first name, profile image, and city.</span></label>}
    {state.error && <p role="alert" className="rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-bold text-red-300">{state.error}</p>}
    <FormPendingSubmit idleLabel={soldOut ? "Join waitlist" : "Reserve my slot"} pendingLabel={soldOut ? "Joining…" : "Reserving…"} overlayLabel={soldOut ? "Adding you to the waitlist…" : "Securing your ride slot…"} className="w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-sm font-black text-white hover:bg-orange-400" />
  </form>;
}
