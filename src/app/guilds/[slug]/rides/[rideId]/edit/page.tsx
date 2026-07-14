import Link from "next/link";
import { notFound } from "next/navigation";

import { FormPendingSubmit } from "@/components/pending-feedback";
import { MediaUploader } from "@/components/media-uploader";
import { PersistentServerForm } from "@/components/persistent-server-form";
import { RideDateFields } from "@/components/ride-date-fields";
import { RideAiAssistant } from "@/components/ride-ai-assistant";
import { CopyAnnouncement } from "@/components/copy-announcement";
import { RideVehicleFields } from "@/components/ride-vehicle-fields";
import { db } from "@/lib/db";
import { requireRideEditor } from "@/server/auth/authorization";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";
import { assignRideStaff, generateRideAnnouncement, removeRideStaff, setRideStatus, updateRidePackage } from "@/server/ride/actions";
import { RIDE_STATUS_TRANSITIONS } from "@/server/ride/status";

type Props = { params: Promise<{ slug: string; rideId: string }>; searchParams: Promise<{ saved?: string; statusSaved?: string; staffSaved?: string; announcementSaved?: string; error?: string }> };
export const metadata = { title: "Edit ride package", robots: { index: false, follow: false } };

function indiaLocal(date: Date | null) {
  if (!date) return "";
  return new Date(date.getTime() + 330 * 60000).toISOString().slice(0, 16);
}
function indiaDate(date: Date) { return indiaLocal(date).slice(0, 10); }
function packageRows(items: Array<{ title: string; description: string | null }>) { return items.map((item) => [item.title, item.description].filter(Boolean).join(" | ")).join("\n"); }
function dayRows(items: Array<{ dayNumber: number | null; title: string; description: string | null }>) { return items.map((item) => [item.dayNumber, item.title, item.description].filter((value) => value !== null && value !== "").join(" | ")).join("\n"); }
function roomOptionRows(items: Array<{ name: string; pricingMode: string; pricePaise: number; maxOccupancy: number; availableRooms: number | null; description: string | null; active: boolean }>) { return items.filter((item) => item.active).map((item) => [item.name, item.pricingMode, item.pricePaise / 100, item.maxOccupancy, item.availableRooms ?? "", item.description ?? ""].join(" | ")).join("\n"); }

export default async function EditRidePage({ params, searchParams }: Props) {
  const { slug, rideId } = await params;
  const authorization = await requireRideEditor(slug, rideId);
  const [ride, state] = await Promise.all([
    db.ride.findFirst({ where: { id: rideId, community: { slug } }, include: {
      origins: { orderBy: { sortOrder: "asc" } }, itineraryDays: { orderBy: { sortOrder: "asc" } },
      accommodations: { orderBy: { checkInAt: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } }, packageItems: { orderBy: [{ type: "asc" }, { sortOrder: "asc" }] },
      policies: { orderBy: { version: "desc" } }, staffAssignments: { include: { user: { select: { displayName: true } }, origin: { select: { city: true, meetingPoint: true } } }, orderBy: { role: "asc" } },
      coverAsset: true, mediaAssets: { where: { purpose: "RIDE_GALLERY" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      announcements: { orderBy: { createdAt: "desc" }, take: 1 },
      community: { include: { memberships: { where: { status: "ACTIVE" }, include: { user: { select: { displayName: true } } }, orderBy: { createdAt: "asc" } } } },
    } }), searchParams,
  ]);
  if (!ride) notFound();
  const stay = ride.accommodations[0];
  const latestPolicy = (type: string) => ride.policies.find((policy) => policy.type === type)?.content ?? "";
  const packageOf = (type: string) => ride.packageItems.filter((item) => item.type === type);
  const originCapacityRow = state.error?.startsWith("origin-capacity-") ? state.error.slice("origin-capacity-".length) : null;
  const originBufferRow = state.error?.startsWith("origin-buffer-") ? state.error.slice("origin-buffer-".length) : null;
  const packageDayRow = state.error?.startsWith("package-day-") ? state.error.slice("package-day-".length) : null;
  const roomOptionRow = state.error?.startsWith("room-option-") ? state.error.slice("room-option-".length) : null;
  const integerField = state.error?.startsWith("integer-") ? state.error.slice("integer-".length) : null;
  const integerLabels: Record<string, string> = { totalSlots: "Total slots", bufferSlots: "Buffer slots", distanceKm: "Distance" };
  const errorMessage = roomOptionRow
    ? `Accommodation option row ${roomOptionRow} is invalid. Use: Name | INCLUDED, PER_PERSON, or PER_ROOM | price | maximum people per room | optional available rooms | description.`
    : originCapacityRow
    ? `Starting-group row ${originCapacityRow} has an invalid capacity. Enter a whole number of at least 1, or leave the optional column blank.`
    : originBufferRow
      ? `Starting-group row ${originBufferRow} has an invalid buffer. Enter a whole number of 0 or more, or leave the optional column blank.`
      : packageDayRow
        ? `Meal/activity row ${packageDayRow} has an invalid day number. Start the row with a whole-number ride day such as 1 or 2.`
        : integerField
          ? `${integerLabels[integerField] ?? integerField} must be a whole number within the displayed limit.`
      : state.error ? ({
    capacity: "Starting-point capacity is now optional and independent of total ride slots. Save again using the updated origin format.",
    "booked-capacity": "Total plus buffer capacity cannot be reduced below the number of riders already booked.",
    stay: "Complete all accommodation fields and ensure check-out is after check-in, or remove the property name to omit accommodation.",
    policy: "Every policy section must contain at least 10 characters.",
    origins: "A starting-group row is incomplete. Use: City | Meeting point | YYYY-MM-DDTHH:mm | optional Capacity | optional Buffer | Merge point | Route summary.",
    itinerary: "An itinerary row is incomplete. Use: YYYY-MM-DD | Day title | Plan and places covered.",
    package: "A package, meal, or activity row has the wrong structure. Follow the format shown above its field.",
    money: "Ride fee and confirmation deposit must be valid non-negative amounts; the deposit cannot exceed the fee.",
    number: "Distance, slots, buffers, and origin capacities must be whole numbers within the displayed limits.",
    date: "One of the entered dates or times is invalid.",
    required: "Check the required identity, dates, origins, itinerary, package, and policy fields.",
    incomplete: "This ride is not ready to publish. Complete its description, origins, itinerary, package items, and at least three policy sections.",
    bookings: "A ride with existing bookings cannot return to draft.",
    transition: "That ride status change is not allowed from the current state.",
    server: "The database could not save this ride package. Your browser draft is preserved; check the local server log for the diagnostic.",
  } as Record<string, string>)[state.error] ?? "The ride package could not be saved. Your browser draft is preserved." : null;
  const origins = ride.origins.map((origin) => [origin.city, origin.meetingPoint, indiaLocal(origin.departureAt), origin.capacity ?? "", origin.bufferCapacity || "", origin.mergePoint ?? "", origin.routeSummary ?? ""].join(" | ")).join("\n");
  const itinerary = ride.itineraryDays.map((day) => `${day.scheduledAt ? indiaLocal(day.scheduledAt) : indiaDate(day.date)} | ${day.title} | ${day.summary}`).join("\n");
  const rideDayCount = Math.max(1, Math.ceil((ride.endsAt.getTime() - ride.startsAt.getTime()) / 86400000));
  const sampleRows = Array.from({ length: rideDayCount }, (_, index) => {
    const date = new Date(ride.startsAt.getTime() + index * 86400000);
    const title = index === 0 ? `${ride.origins[0]?.city ?? ride.originCity} to ${ride.destination}` : index === rideDayCount - 1 ? `Breakfast and return` : `${ride.destination} exploration`;
    const dateOrTime = index === 0 ? indiaLocal(ride.startsAt) : index === rideDayCount - 1 ? indiaLocal(ride.endsAt) : `${indiaDate(date)}T09:00`;
    return `${dateOrTime} | ${title} | Add planned stops, meals, activities, and timing for Day ${index + 1}`;
  });
  if (rideDayCount === 1) sampleRows.push(`${indiaLocal(ride.endsAt)} | Breakfast and return | Add the breakfast location, return stops, and expected completion plan`);
  const sampleItinerary = sampleRows.join("\n");
  const allowedStatuses = RIDE_STATUS_TRANSITIONS[ride.status];
  const exampleBox = "mt-3 block overflow-x-auto whitespace-pre-wrap rounded-xl border border-orange-400/15 bg-orange-400/[.035] p-3 font-mono text-[11px] leading-5 text-orange-200/80";
  return <section className="mx-auto min-h-[70vh] max-w-6xl px-5 py-16 lg:px-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link href={authorization.access === "GUILD" ? `/guilds/${slug}/manage` : "/account"} className="text-sm font-bold text-zinc-500 hover:text-white">← {authorization.access === "GUILD" ? "Guild workspace" : "Account"}</Link><p className="eyebrow mt-8">Ride studio · {ride.status}</p><h1 className="mt-3 text-4xl font-black tracking-tight">{ride.title}</h1></div>{ride.status !== "DRAFT" && <Link href={`/rides/${ride.slug}`} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold">View public ride</Link>}</div>
    {state.saved && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Ride package saved.</p>}
    {state.statusSaved && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Ride status updated.</p>}
    {state.announcementSaved && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">WhatsApp-ready announcement generated from the current ride package.</p>}
    {errorMessage && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">{errorMessage}</p>}

    <PersistentServerForm action={updateRidePackage} storageKey={`atride:ride-draft:${ride.id}`} clearOnMount={Boolean(state.saved)} className="relative mt-8 grid gap-8">
      <input type="hidden" name="guildSlug" value={slug} /><input type="hidden" name="rideId" value={ride.id} />
      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><p className="eyebrow">1 · Public identity</p><div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold sm:col-span-2">Title<input required name="title" defaultValue={ride.title} className="field" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Summary<textarea required rows={3} name="summary" defaultValue={ride.summary} className="field" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Full description<textarea required rows={6} name="description" defaultValue={ride.description} className="field" /></label>
        <label className="text-sm font-semibold">Destination<input required name="destination" defaultValue={ride.destination} className="field" /></label>
        <label className="text-sm font-semibold">Distance (km)<input required type="number" min="1" name="distanceKm" defaultValue={ride.distanceKm} className="field" /></label>
        <RideVehicleFields initialType={ride.vehicleType} initialRequirements={ride.vehicleRequirements} />
        <label className="text-sm font-semibold">Difficulty<select name="difficulty" defaultValue={ride.difficulty} className="field bg-[#101419]"><option>EASY</option><option>MODERATE</option><option>CHALLENGING</option></select></label>
        <RideDateFields startsAt={indiaLocal(ride.startsAt)} endsAt={indiaLocal(ride.endsAt)} registrationClosesAt={indiaLocal(ride.registrationClosesAt ?? new Date(ride.startsAt.getTime() - 5 * 86400000))} balanceDueAt={indiaLocal(ride.balanceDueAt ?? ride.registrationClosesAt ?? new Date(ride.startsAt.getTime() - 5 * 86400000))} commercial />
        <label className="text-sm font-semibold">Public visibility<select name="visibility" defaultValue={ride.visibility} className="field bg-[#101419]"><option>PUBLIC</option><option>VERIFIED_USERS</option><option>GUILD_MEMBERS</option><option>INVITE_ONLY</option></select></label>
      </div></div>

      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><p className="eyebrow">2 · Pricing and capacity</p><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-semibold">Ride fee (₹)<input required type="number" min="0" step="0.01" name="price" defaultValue={ride.pricePaise / 100} className="field" /></label>
        <label className="text-sm font-semibold">Confirmation deposit (₹)<input required type="number" min="0" step="0.01" name="confirmationDeposit" defaultValue={ride.confirmationDepositPaise / 100} className="field" /></label>
        <label className="text-sm font-semibold">Total slots<input required type="number" min="1" name="totalSlots" defaultValue={ride.totalSlots} className="field" /></label>
        <label className="text-sm font-semibold">Buffer slots<input required type="number" min="0" name="bufferSlots" defaultValue={ride.bufferSlots} className="field" /></label>
      </div></div>

      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><p className="eyebrow">3 · Accommodation facts</p><p className="mt-3 text-sm leading-6 text-zinc-500">Enter only confirmed property facts. The Ride Assistant can use them to prepare the public stay summary and package content.</p><div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold">Property name<input name="propertyName" defaultValue={stay?.propertyName ?? ""} className="field" /></label><label className="text-sm font-semibold">Locality<input name="propertyLocality" defaultValue={stay?.locality ?? ""} className="field" /></label>
        <label className="text-sm font-semibold">Check-in<input type="datetime-local" name="checkInAt" defaultValue={indiaLocal(stay?.checkInAt ?? null)} className="field" /></label><label className="text-sm font-semibold">Check-out<input type="datetime-local" name="checkOutAt" defaultValue={indiaLocal(stay?.checkOutAt ?? null)} className="field" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Room/occupancy summary<textarea rows={3} name="roomSummary" defaultValue={stay?.roomSummary ?? ""} className="field" /></label><label className="text-sm font-semibold sm:col-span-2">Amenities<input name="amenities" defaultValue={stay?.amenities.join(", ") ?? ""} placeholder="Campfire, parking, hot water, Wi-Fi" className="field" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Participant instructions<textarea rows={3} name="participantNote" defaultValue={stay?.participantNote ?? ""} className="field" /></label><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name="exactLocationRestricted" defaultChecked={stay?.exactLocationRestricted ?? true} className="size-5 accent-orange-500" />Hide exact stay details until confirmation</label>
        <label className="text-sm font-semibold sm:col-span-2">Room choices and pricing<span className="mt-2 block text-xs font-normal leading-6 text-zinc-500">One per line: Name | INCLUDED, PER_PERSON, or PER_ROOM | price in ₹ | maximum people per room | optional available rooms | description</span><span className={exampleBox}>Examples:{"\n"}Shared room | INCLUDED | 0 | 4 | 8 | Shared four-person room included in the ride fee{"\n"}Couple room | PER_ROOM | 1800 | 2 | 4 | Private double-occupancy room surcharge{"\n"}No accommodation | INCLUDED | 0 | 6 |  | Participant arranges their own stay</span><textarea rows={6} name="accommodationOptions" defaultValue={roomOptionRows(stay?.options ?? [])} className="field mt-3 font-mono text-xs" /></label>
      </div></div>

      <RideAiAssistant guildSlug={slug} rideId={ride.id} enabled={process.env.AI_ASSIST_ENABLED === "true" && Boolean(process.env.GEMINI_API_KEY)} />

      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><p className="eyebrow">5 · Starting groups</p><p className="mt-3 text-xs leading-6 text-zinc-500">One per line: City | Meeting point | departure date/time | optional planning capacity | optional buffer | merge point | route summary. Total ride slots belong to the destination/stay and do not need to be split across origins.</p><p className={exampleBox}>Flexible example based on this ride:{"\n"}{ride.originCity} | Confirmed meeting point | {indiaLocal(ride.startsAt)} |  |  | {ride.destination} | {ride.originCity} to {ride.destination} via confirmed regrouping stops{"\n\n"}Optional allocation example:{"\n"}{ride.originCity} | Confirmed meeting point | {indiaLocal(ride.startsAt)} | {ride.totalSlots} | {ride.bufferSlots} | {ride.destination} | {ride.originCity} to {ride.destination}</p><textarea required rows={6} name="origins" defaultValue={origins} className="field mt-4 font-mono text-xs" /></div>
      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><p className="eyebrow">6 · Day-wise itinerary</p><p className="mt-3 text-xs leading-6 text-zinc-500">One event per line: YYYY-MM-DDTHH:mm | Event title | Plan and places covered. Omit <span className="font-mono">THH:mm</span> when only the date is known. Multiple timed events may share the same date.</p><p className={exampleBox}>Example for this {rideDayCount}-day ride:{"\n"}{sampleItinerary}</p><textarea required rows={7} name="itinerary" defaultValue={itinerary} className="field mt-4 font-mono text-xs" /></div>

      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><p className="eyebrow">7 · Package</p><div className="mt-6 grid gap-6 lg:grid-cols-2">
        {[['inclusions','Inclusions','Accommodation | Shared stay for the published ride dates'],['exclusions','Exclusions','Fuel | Participants bear their own fuel expenses'],['addOns','Optional add-ons','Single-room upgrade | Subject to availability and added cost']].map(([name,label,sample]) => <label key={name} className="text-sm font-semibold">{label}<span className="ml-2 text-xs font-normal text-zinc-600">Title | detail</span><span className={exampleBox}>Example:{"\n"}{sample}</span><textarea rows={5} name={name} defaultValue={packageRows(packageOf(name === 'inclusions' ? 'INCLUSION' : name === 'exclusions' ? 'EXCLUSION' : 'ADD_ON'))} className="field font-mono text-xs" /></label>)}
        <label className="text-sm font-semibold">Meals<span className="ml-2 text-xs font-normal text-zinc-600">Day | meal | menu</span><span className={exampleBox}>Example:{"\n"}1 | Dinner | Vegetarian and non-vegetarian buffet</span><textarea rows={6} name="meals" defaultValue={dayRows(packageOf("MEAL"))} className="field font-mono text-xs" /></label>
        <label className="text-sm font-semibold">Activities and sightseeing<span className="ml-2 text-xs font-normal text-zinc-600">Day | activity | detail</span><span className={exampleBox}>Example:{"\n"}2 | {ride.destination} sightseeing | Add places, timing, and organizer notes</span><textarea rows={6} name="activities" defaultValue={dayRows(packageOf("ACTIVITY"))} className="field font-mono text-xs" /></label>
      </div></div>

      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><p className="eyebrow">8 · Versioned rules and policies</p><div className="mt-6 grid gap-6 lg:grid-cols-2">
        {[['safetyPolicy','Safety and ride rules','SAFETY'],['paymentPolicy','Payment rules','PAYMENT'],['cancellationPolicy','Cancellation and refund','CANCELLATION'],['replacementPolicy','Replacement and transfer','REPLACEMENT'],['propertyPolicy','Property conduct','PROPERTY_CONDUCT']].map(([name,label,type]) => <label key={name} className="text-sm font-semibold">{label}<textarea required minLength={10} rows={7} name={name} defaultValue={latestPolicy(type)} className="field text-xs leading-6" /></label>)}
      </div></div>
      <FormPendingSubmit idleLabel="Save complete ride package" pendingLabel="Saving…" overlayLabel="Saving ride package…" className="rounded-full bg-orange-500 px-7 py-3.5 text-sm font-black text-white" />
    </PersistentServerForm>

    <section className="mt-10"><p className="eyebrow">Ride media</p><h2 className="mt-3 text-2xl font-black">Cover, stay, and attraction images</h2><p className="mt-3 text-sm leading-6 text-zinc-500">Use a wide cover for the ride header. Add up to 12 gallery images showing the destination, accommodation, activities, or previous editions—without exposing private participant information.</p>
      <div className="mt-6 grid gap-5 md:grid-cols-2"><MediaUploader purpose="RIDE_COVER" communitySlug={slug} rideId={ride.id} label="Ride cover" help="Wide JPEG, PNG, or WebP up to 10 MB." currentAsset={ride.coverAsset ? { id: ride.coverAsset.id, url: cloudinaryImageUrl(ride.coverAsset) } : null} /><MediaUploader purpose="RIDE_GALLERY" communitySlug={slug} rideId={ride.id} label="Add ride gallery image" help="Use 4:3 images for stays, attractions, and ride highlights. Up to 12." /></div>
      {!!ride.mediaAssets.length && <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{ride.mediaAssets.map((asset, index) => <MediaUploader key={asset.id} purpose="RIDE_GALLERY" communitySlug={slug} rideId={ride.id} label={`Ride image ${index + 1}`} help="Published in this ride gallery." currentAsset={{ id: asset.id, url: cloudinaryImageUrl(asset) }} removeOnly />)}</div>}
    </section>

    <section id="staff" className="mt-10 scroll-mt-24 rounded-3xl border border-white/10 p-7"><p className="eyebrow">Ride crew</p><h2 className="mt-3 text-2xl font-black">Captains, sweeps, and marshals</h2>
      {state.staffSaved && <p className="mt-4 text-sm font-semibold text-emerald-400">Ride crew updated.</p>}
      <form action={assignRideStaff} className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_190px_1fr_auto] lg:items-end"><input type="hidden" name="guildSlug" value={slug} /><input type="hidden" name="rideId" value={ride.id} /><label className="text-sm font-semibold">Active Guild member<select name="membershipId" className="field bg-[#101419]">{ride.community.memberships.map((membership) => <option key={membership.id} value={membership.id}>{membership.user.displayName}</option>)}</select></label><label className="text-sm font-semibold">Ride role<select name="role" className="field bg-[#101419]"><option>LEAD_CAPTAIN</option><option>CAPTAIN</option><option>VICE_CAPTAIN</option><option>SWEEP</option><option>MARSHAL</option><option>VOLUNTEER</option></select></label><label className="text-sm font-semibold">Starting group<select name="originId" className="field bg-[#101419]"><option value="">Whole ride / all groups</option>{ride.origins.map((origin) => <option key={origin.id} value={origin.id}>{origin.city} · {origin.meetingPoint}</option>)}</select></label><FormPendingSubmit idleLabel="Assign" pendingLabel="Assigning…" overlayLabel="Assigning ride staff…" className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white" /></form>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{ride.staffAssignments.map((assignment) => <div key={assignment.id} className="flex items-center justify-between rounded-2xl border border-white/8 p-4"><div><p className="font-bold">{assignment.user.displayName}</p><p className="mt-1 text-xs text-zinc-500">{assignment.role.replaceAll("_", " ")}</p><p className="mt-1 text-xs font-semibold text-orange-300/80">{assignment.origin ? `${assignment.origin.city} · ${assignment.origin.meetingPoint}` : "Whole ride / all starting groups"}</p></div><form action={removeRideStaff} className="relative"><input type="hidden" name="guildSlug" value={slug} /><input type="hidden" name="rideId" value={ride.id} /><input type="hidden" name="assignmentId" value={assignment.id} /><FormPendingSubmit idleLabel="Remove" pendingLabel="Removing…" overlayLabel="Removing ride staff…" className="rounded-full border border-red-400/25 px-3 py-2 text-xs font-bold text-red-300" /></form></div>)}</div>
    </section>

    <section id="announcement" className="mt-10 scroll-mt-24 rounded-3xl border border-white/10 p-7"><p className="eyebrow">Organizer export</p><h2 className="mt-3 text-2xl font-black">WhatsApp-ready ride announcement</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">Generate this only after saving the ride package. It uses canonical ride details, hides restricted stay information, and removes common phone numbers, payment identifiers, participant rows, and private links. Regenerate whenever the ride changes.</p><form action={generateRideAnnouncement} className="relative mt-5"><input type="hidden" name="guildSlug" value={slug} /><input type="hidden" name="rideId" value={ride.id} /><FormPendingSubmit idleLabel={ride.announcements.length ? "Regenerate announcement" : "Generate announcement"} pendingLabel="Generating…" overlayLabel="Generating organizer announcement…" className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white" /></form>{ride.announcements[0] && <CopyAnnouncement content={ride.announcements[0].content} stale={ride.announcements[0].sourceVersion.getTime() < ride.updatedAt.getTime()} />}</section>

    <section className="mt-10 rounded-3xl border border-orange-400/20 bg-orange-400/[.025] p-7"><p className="eyebrow">Publication</p><h2 className="mt-3 text-2xl font-black">Current state: {ride.status}</h2><p className="mt-3 text-sm leading-6 text-zinc-500">Publishing requires origins, itinerary, package items, a full description, and at least three policy types. State changes are deliberately limited so completed or cancelled records cannot be silently reopened.</p><div className="mt-6 flex flex-wrap gap-3">{allowedStatuses.map((status) => <form key={status} action={setRideStatus} className="relative"><input type="hidden" name="guildSlug" value={slug} /><input type="hidden" name="rideId" value={ride.id} /><input type="hidden" name="status" value={status} /><FormPendingSubmit idleLabel={status === "PUBLISHED" ? "Publish ride" : `Mark ${status.toLowerCase()}`} pendingLabel="Updating…" overlayLabel="Updating ride status…" className={`rounded-full px-5 py-2.5 text-sm font-black ${status === "PUBLISHED" ? "bg-emerald-500 text-black" : "border border-white/15"}`} /></form>)}</div>{!allowedStatuses.length && <p className="mt-5 text-sm font-semibold text-zinc-500">This is a terminal ride state. Its historical record remains read-only for status changes.</p>}</section>
  </section>;
}
