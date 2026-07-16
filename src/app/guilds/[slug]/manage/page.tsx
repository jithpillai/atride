import Link from "next/link";
import { notFound } from "next/navigation";

import { FormPendingSubmit } from "@/components/pending-feedback";
import { CopyGuildJoinLink } from "@/components/guild-join-link";
import { MediaUploader } from "@/components/media-uploader";
import { db } from "@/lib/db";
import { requireGuildManager } from "@/server/auth/authorization";
import { createGuildJoinLink, inviteGuildStaff, revokeGuildInvitation, revokeGuildJoinLink, updateGuildEmbedOrigins, updateGuildMemberRole, updateGuildMemberStatus, updateGuildPaymentSettings, updateGuildProfile, updateGuildRidePolicyTemplates } from "@/server/guild/actions";
import { DEFAULT_GUILD_RIDE_POLICIES } from "@/server/guild/default-ride-policies";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";
import { reviewBookingPayment } from "@/server/booking/finance-actions";

type WorkspaceSection = "operations" | "finance" | "profile" | "settings" | "log";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ section?: string; saved?: string; error?: string; staffSaved?: string; staffError?: string; joinSaved?: string; joinError?: string; policySaved?: string; embedSaved?: string; embedError?: string; paymentSaved?: string; paymentError?: string; payment?: string; upiSaved?: string; upiError?: string }> };

export const metadata = { title: "Manage Guild", robots: { index: false, follow: false } };

export default async function GuildManagePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { session, membership } = await requireGuildManager(slug);
  const canAdminister = membership.roles.some(({ role }) => role === "OWNER" || role === "ADMIN");
  const canFinance = membership.roles.some(({ role }) => role === "OWNER" || role === "ADMIN" || role === "FINANCE");
  const [guild, state, pendingPayments] = await Promise.all([db.community.findUnique({
    where: { slug },
    include: {
      visibility: true,
      paymentSettings: true,
      locations: { orderBy: [{ isHome: "desc" }, { city: "asc" }] },
      logoAsset: true,
      coverAsset: true,
      mediaAssets: { where: { purpose: "GUILD_GALLERY" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      memberships: {
        orderBy: { createdAt: "asc" },
        include: { roles: { orderBy: { role: "asc" } }, user: { select: { id: true, displayName: true, contacts: { where: { type: "EMAIL", isPrimary: true }, take: 1 } } } },
      },
      invitations: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 20 },
      joinLinks: { orderBy: { createdAt: "desc" }, take: 20 },
      auditEvents: { orderBy: { createdAt: "desc" }, take: 30, include: { actor: { select: { displayName: true } } } },
      ridePolicyTemplates: true,
      embedOrigins: { orderBy: { origin: "asc" } },
      _count: { select: { memberships: true, rides: true } },
      rides: {
        orderBy: { startsAt: "asc" },
        take: 4,
        select: { id: true, title: true, status: true, startsAt: true, bookedSlots: true, totalSlots: true },
      },
    },
  }), searchParams, canFinance ? db.bookingPayment.findMany({
    where: {
      booking: { community: { slug } },
      AND: [
        { OR: [{ status: "SUBMITTED" }, { status: "PENDING", method: "CASH" }] },
        { OR: [
          { purpose: { in: ["CONFIRMATION_DEPOSIT", "FULL_PAYMENT"] }, booking: { status: "RESERVED" } },
          { purpose: "BALANCE", booking: { status: "CONFIRMED" } },
        ] },
      ],
    },
    include: {
      proofAsset: true,
      booking: { include: { user: { select: { displayName: true } }, participants: { orderBy: { sortOrder: "asc" } }, ride: { select: { title: true, slug: true } }, origin: { select: { city: true } } } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  }) : Promise.resolve([])]);
  if (!guild) notFound();
  const requestedSection = state.section;
  const allowedSections = new Set<WorkspaceSection>(["operations", ...(canFinance ? ["finance" as const] : []), ...(canAdminister ? ["profile" as const, "settings" as const, "log" as const] : [])]);
  const activeSection: WorkspaceSection = requestedSection && allowedSections.has(requestedSection as WorkspaceSection) ? requestedSection as WorkspaceSection : "operations";
  const workspaceSections: Array<{ id: WorkspaceSection; label: string; description: string }> = [
    { id: "operations", label: "Rides & Roles", description: "Rides, members, and staff" },
    { id: "finance", label: "Bookings & Payments", description: "UPI setup and payment review" },
    { id: "profile", label: "Profile & Media", description: "Guild Hall identity and images" },
    { id: "settings", label: "Policies & White Label", description: "Ride defaults and website access" },
    { id: "log", label: "Activity Log", description: "Privileged change history" },
  ];
  const homeCity = guild.locations.find((location) => location.isHome)?.city ?? guild.locations[0]?.city ?? "";
  const operatingCities = guild.locations.filter((location) => !location.isHome).map((location) => location.city).join(", ");

  return (
    <section className="mx-auto min-h-[70vh] max-w-6xl px-5 py-16 lg:px-8">
      <p className="eyebrow">Guild workspace</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Manage {guild.name}</h1>
      <p className="mt-3 text-zinc-400">Your access: {membership.roles.map(({ role }) => role.replaceAll("_", " ")).join(" · ")}</p>
      <nav aria-label="Guild workspace sections" className="mt-8 overflow-x-auto border-b border-white/10">
        <div className="flex min-w-max gap-2">
          {workspaceSections.filter((section) => allowedSections.has(section.id)).map((section) => {
            const active = section.id === activeSection;
            return <Link key={section.id} href={`/guilds/${guild.slug}/manage?section=${section.id}`} aria-current={active ? "page" : undefined} className={`group border-b-2 px-4 py-4 text-left transition ${active ? "border-orange-500 text-white" : "border-transparent text-zinc-500 hover:border-white/20 hover:text-zinc-200"}`}><span className="block text-sm font-black">{section.label}</span><span className={`mt-1 block text-[11px] ${active ? "text-orange-300" : "text-zinc-600 group-hover:text-zinc-500"}`}>{section.description}</span></Link>;
          })}
        </div>
      </nav>
      {state.saved === "1" && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Guild profile saved.</p>}
      {state.error && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">Check the highlighted Guild details and try again.</p>}
      {state.staffSaved && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Guild staff settings updated.</p>}
      {state.staffError && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">That staff change could not be completed. Protected Owner and self-access rules may apply.</p>}
      {state.joinSaved && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Guild membership invitation links updated.</p>}
      {state.joinError && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">That membership invitation link could not be updated.</p>}
      {state.policySaved && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Default ride rules saved. New rides will start with these policies.</p>}
      {state.embedSaved && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Approved public widget origins saved.</p>}
      {state.embedError && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">Enter one complete HTTPS origin per line, without paths—for example, https://www.example.com.</p>}
      {state.paymentSaved && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Offline payment {state.paymentSaved}. The booking and audit history were updated.</p>}
      {state.paymentError && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">That payment could not be reviewed. It may already have been handled or require a rejection reason.</p>}
      {state.upiSaved && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Guild UPI payment settings saved. New payment obligations will use this recipient.</p>}
      {state.upiError && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">Enter a valid UPI ID and payee name before enabling assisted UPI.</p>}
      {activeSection === "operations" && <><div className="mt-10 rounded-3xl border border-white/10 p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Ride operations</p><h2 className="mt-2 text-2xl font-black">Ride workspace</h2></div><Link href={`/guilds/${guild.slug}/rides/new`} className="rounded-full bg-orange-500 px-5 py-2.5 text-center text-sm font-black text-white">Create ride draft</Link></div>
        <div className="mt-5 grid gap-3">
          {guild.rides.length ? guild.rides.map((ride) => (
            <div key={ride.id} className="flex flex-col gap-2 rounded-2xl border border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-bold">{ride.title}</p><p className="mt-1 text-xs text-zinc-500">{ride.status} · {ride.startsAt.toLocaleDateString("en-IN")}</p></div>
              <div className="flex flex-wrap items-center gap-3"><p className="text-sm font-bold text-orange-300">{ride.bookedSlots}/{ride.totalSlots} booked</p><Link href={`/guilds/${guild.slug}/rides/${ride.id}/participants`} className="rounded-full border border-orange-400/25 px-4 py-2 text-xs font-bold text-orange-200">Participants</Link><Link href={`/guilds/${guild.slug}/rides/${ride.id}/edit`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold">Edit package</Link></div>
            </div>
          )) : <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-zinc-500">No rides yet. Create the Guild&apos;s first ride draft.</p>}
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-3xl font-black">{guild._count.rides}</p><p className="mt-2 text-sm text-zinc-500">Rides</p></article>
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-3xl font-black">{guild._count.memberships}</p><p className="mt-2 text-sm text-zinc-500">Members</p></article>
      </div></>}
      {canFinance && activeSection === "finance" && <section id="upi-settings" className="mt-10 scroll-mt-28 rounded-3xl border border-orange-400/20 bg-orange-400/[.025] p-7">
        <p className="eyebrow">Direct-to-Guild collection</p><h2 className="mt-3 text-2xl font-black">Assisted UPI</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">@Ride puts this Guild-owned UPI ID, payee name, exact obligation amount, and booking reference into a mobile intent and desktop QR. Funds go directly to the Guild. Every new advance or balance snapshots the active recipient, so later settings changes never rewrite an issued payment request.</p>
        {canAdminister ? <form action={updateGuildPaymentSettings} className="relative mt-6 grid gap-5 md:grid-cols-2">
          <input type="hidden" name="slug" value={guild.slug} />
          <label className="text-sm font-semibold">UPI ID / VPA<input name="upiVpa" maxLength={130} defaultValue={guild.paymentSettings?.upiVpa ?? ""} placeholder="guildname@okaxis" className="field" /><span className="mt-2 block text-xs font-normal leading-5 text-zinc-600">Use an account controlled by the Guild recipient. Confirm it in a UPI app before enabling.</span></label>
          <label className="text-sm font-semibold">Payee name<input name="upiPayeeName" maxLength={120} defaultValue={guild.paymentSettings?.upiPayeeName ?? guild.name} placeholder={guild.name} className="field" /><span className="mt-2 block text-xs font-normal leading-5 text-zinc-600">Participants are told to match this name before authorizing payment.</span></label>
          <label className="text-sm font-semibold md:col-span-2">Participant instructions<textarea name="participantInstructions" maxLength={2000} rows={4} defaultValue={guild.paymentSettings?.participantInstructions ?? "After paying, upload the payment screenshot and enter the UTR or UPI Transaction ID shown by your payment app."} className="field" /></label>
          <label className="flex items-start gap-3 text-sm font-semibold md:col-span-2"><input type="checkbox" name="upiEnabled" defaultChecked={guild.paymentSettings?.upiEnabled ?? false} className="mt-1 size-5 accent-orange-500" /><span>Enable assisted UPI for new bookings<span className="mt-1 block text-xs font-normal leading-5 text-zinc-500">Disabling stops new obligations from using this recipient. Existing snapshotted obligations remain unchanged and auditable.</span></span></label>
          <div className="md:col-span-2"><FormPendingSubmit idleLabel="Save UPI settings" pendingLabel="Saving…" overlayLabel="Saving Guild payment settings…" className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white" /></div>
        </form> : <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5"><p className={`text-sm font-black ${guild.paymentSettings?.upiEnabled ? "text-emerald-300" : "text-amber-300"}`}>{guild.paymentSettings?.upiEnabled ? "Assisted UPI enabled" : "Assisted UPI not enabled"}</p>{guild.paymentSettings?.upiEnabled && <><p className="mt-3 text-sm text-zinc-300">Payee: {guild.paymentSettings.upiPayeeName}</p><p className="mt-1 font-mono text-xs text-zinc-500">{guild.paymentSettings.upiVpa}</p></>}<p className="mt-3 text-xs leading-5 text-zinc-600">Only a Guild Owner or Administrator can change the recipient.</p></div>}
      </section>}
      {canFinance && activeSection === "finance" && <section className="mt-10"><p className="eyebrow">Manual reconciliation</p><h2 className="mt-3 text-2xl font-black">Finance review queue</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">Confirmation advances and later balances appear as separate obligations. Confirm only after matching the amount, the snapshotted recipient, and payer evidence with the Guild&apos;s account or cash record. Captains without Owner, Admin, or Finance access cannot use these controls.</p><div className="mt-6 grid gap-4">{pendingPayments.length ? pendingPayments.map((payment) => <article id={`payment-${payment.id}`} key={payment.id} className={`scroll-mt-32 rounded-3xl border p-6 ${state.payment === payment.id ? "border-orange-400/50 bg-orange-400/[.045]" : "border-white/10 bg-white/[.025]"}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-300">{payment.method.replaceAll("_", " ")} · {payment.purpose.replaceAll("_", " ")}</p><h3 className="mt-2 text-xl font-black">{payment.booking.user.displayName}</h3><p className="mt-1 text-sm text-zinc-400">{payment.booking.ride.title} · {payment.booking.origin?.city ?? "Starting group unavailable"} · {payment.booking.participants.length} {payment.booking.participants.length === 1 ? "person" : "people"}</p>{payment.booking.participants.length > 1 && <p className="mt-2 text-xs text-zinc-500">Party: {payment.booking.participants.map((participant) => `${participant.displayName} (${participant.role.toLowerCase()})`).join(", ")}</p>}<p className="mt-3 text-2xl font-black">₹{(payment.amountPaise / 100).toLocaleString("en-IN")}</p>{payment.submittedAt && <p className="mt-2 text-xs text-zinc-500">Submitted {payment.submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p>}{payment.dueAt && <p className="mt-1 text-xs text-zinc-500">Due {payment.dueAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p>}{payment.payeeVpaSnapshot && <p className="mt-2 text-xs text-zinc-500">Requested recipient: {payment.payeeNameSnapshot} · {payment.payeeVpaSnapshot}</p>}{payment.payerReference && <p className="mt-2 text-xs text-zinc-500">Payer reference: {payment.payerReference}</p>}</div><div className="flex flex-wrap gap-2">{payment.proofAsset && <a href={cloudinaryImageUrl(payment.proofAsset)} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold">View private proof</a>}<Link href={`/rides/${payment.booking.ride.slug}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold">View ride</Link></div></div><div className="mt-5 grid gap-3 sm:grid-cols-[auto_1fr]"><form action={reviewBookingPayment} className="relative"><input type="hidden" name="guildSlug" value={guild.slug} /><input type="hidden" name="paymentId" value={payment.id} /><input type="hidden" name="decision" value="CONFIRM" /><FormPendingSubmit idleLabel={payment.method === "CASH" ? `Confirm ${payment.purpose === "BALANCE" ? "balance" : "cash"} received` : `Confirm ${payment.purpose === "BALANCE" ? "balance" : "payment"}`} pendingLabel="Confirming…" overlayLabel="Confirming booking payment…" className="rounded-full bg-emerald-500 px-5 py-2.5 text-xs font-black text-black" /></form>{payment.status === "SUBMITTED" && <form action={reviewBookingPayment} className="relative flex flex-col gap-2 sm:flex-row"><input type="hidden" name="guildSlug" value={guild.slug} /><input type="hidden" name="paymentId" value={payment.id} /><input type="hidden" name="decision" value="REJECT" /><input required minLength={5} maxLength={1000} name="rejectionReason" placeholder="Reason visible to participant" className="field py-2 text-xs" /><FormPendingSubmit idleLabel="Reject proof" pendingLabel="Rejecting…" overlayLabel="Returning payment proof…" className="rounded-full border border-red-400/30 px-5 py-2.5 text-xs font-black text-red-300" /></form>}</div></article>) : <p className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">No payments are waiting for review.</p>}</div></section>}
      {canAdminister && guild.visibility && <>
        {activeSection === "profile" && <>
        <form action={updateGuildProfile} className="relative mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[.025] p-7">
          <input type="hidden" name="slug" value={guild.slug} />
          <p className="eyebrow">Guild Hall profile</p><h2 className="mt-3 text-2xl font-black">Identity and visibility</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold">Guild name<input required minLength={3} maxLength={160} name="name" defaultValue={guild.name} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold">Short name<input required minLength={2} maxLength={12} name="shortName" defaultValue={guild.shortName} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 uppercase outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold sm:col-span-2">Tagline<input required minLength={5} maxLength={240} name="tagline" defaultValue={guild.tagline} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold sm:col-span-2">Description<textarea required minLength={20} maxLength={5000} rows={5} name="description" defaultValue={guild.description} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold">Home city<input required minLength={2} maxLength={120} name="homeCity" defaultValue={homeCity} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold">Other operating cities<input maxLength={1000} name="operatingCities" defaultValue={operatingCities} placeholder="Bengaluru, Coimbatore, Erode" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /><span className="mt-1 block text-xs font-normal text-zinc-600">Comma-separated, up to 12 cities.</span></label>
            <label className="text-sm font-semibold">Founded year<input type="number" min="1900" max={new Date().getFullYear()} name="foundedYear" defaultValue={guild.foundedYear ?? ""} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold">Accent color<input type="color" name="accentColor" defaultValue={guild.accentColor} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-2 py-2" /></label>
            <label className="text-sm font-semibold">Specialties<input maxLength={500} name="specialties" defaultValue={guild.specialties.join(", ")} placeholder="Touring, Breakfast rides, Off-road" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold">Directory listing<select name="directoryVisibility" defaultValue={guild.visibility.directoryVisibility} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#101419] px-4 py-3"><option value="UNLISTED">Unlisted / private</option><option value="LISTED">Listed in marketplace</option></select></label>
            <label className="text-sm font-semibold">Guild Hall access<select name="guildHallAccess" defaultValue={guild.visibility.guildHallAccess} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#101419] px-4 py-3"><option value="PUBLIC">Public</option><option value="VERIFIED_USERS">Verified AtRide users</option><option value="GUILD_MEMBERS">Guild members</option><option value="INVITE_ONLY">Invite only</option></select></label>
            <label className="text-sm font-semibold">Website URL<input type="url" name="websiteUrl" defaultValue={guild.websiteUrl ?? ""} placeholder="https://example.com" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold">Instagram URL<input type="url" name="instagramUrl" defaultValue={guild.instagramUrl ?? ""} placeholder="https://instagram.com/…" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold sm:col-span-2">WhatsApp community/group URL<input type="url" name="whatsappUrl" defaultValue={guild.whatsappUrl ?? ""} placeholder="https://chat.whatsapp.com/…" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name="newcomerDisplayEnabled" defaultChecked={guild.newcomerDisplayEnabled} className="size-5 accent-orange-500" />Enable member-only newcomer display</label>
            <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name="awardsDisplayEnabled" defaultChecked={guild.awardsDisplayEnabled} className="size-5 accent-orange-500" />Enable member-only awards display</label>
          </div>
          <FormPendingSubmit idleLabel="Save Guild profile" pendingLabel="Saving…" overlayLabel="Saving Guild profile…" className="mt-7 rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white" />
        </form>

        <div className="mt-10"><p className="eyebrow">Brand media</p><h2 className="mt-3 text-2xl font-black">Logo, cover, and gallery</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <MediaUploader purpose="GUILD_LOGO" communitySlug={guild.slug} label="Guild logo" help="Square JPEG, PNG, or WebP up to 5 MB." fallbackUrl="/defaults/guild-avatar.png" currentAsset={guild.logoAsset ? { id: guild.logoAsset.id, url: cloudinaryImageUrl(guild.logoAsset) } : null} />
            <MediaUploader purpose="GUILD_COVER" communitySlug={guild.slug} label="Guild cover" help="A wide 16:9 image works best. Up to 10 MB." fallbackUrl="/defaults/guild-hall-cover.png" currentAsset={guild.coverAsset ? { id: guild.coverAsset.id, url: cloudinaryImageUrl(guild.coverAsset) } : null} />
          </div>
          <div className="mt-5"><MediaUploader purpose="GUILD_GALLERY" communitySlug={guild.slug} label="Add gallery image" help="Up to 12 images, 10 MB each." /></div>
          {!!guild.mediaAssets.length && <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{guild.mediaAssets.map((asset, index) => <MediaUploader key={asset.id} purpose="GUILD_GALLERY" communitySlug={guild.slug} label={`Gallery image ${index + 1}`} help="Published in this Guild Hall." currentAsset={{ id: asset.id, url: cloudinaryImageUrl(asset) }} removeOnly />)}</div>}
        </div>
        </>}

        {activeSection === "settings" && <>
        <section id="ride-policy-defaults" className="mt-10 scroll-mt-24"><p className="eyebrow">Ride Studio defaults</p><h2 className="mt-3 text-2xl font-black">Reusable rules and policies</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">Set these once for the Guild. A new ride copies the current defaults into its own versioned policy snapshot, which Ride Managers can adjust without changing other rides.</p><form action={updateGuildRidePolicyTemplates} className="relative mt-6 grid gap-5 rounded-3xl border border-white/10 bg-white/[.025] p-7 lg:grid-cols-2"><input type="hidden" name="slug" value={guild.slug} />{DEFAULT_GUILD_RIDE_POLICIES.map((policy) => <label key={policy.type} className="text-sm font-semibold">{policy.title}<textarea required minLength={10} rows={7} name={policy.field} defaultValue={guild.ridePolicyTemplates.find((template) => template.type === policy.type)?.content ?? policy.content} className="field text-xs leading-6" /></label>)}<div className="lg:col-span-2"><FormPendingSubmit idleLabel="Save default ride policies" pendingLabel="Saving…" overlayLabel="Saving Guild ride defaults…" className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white" /></div></form></section>

        <section id="embed-origins" className="mt-10 scroll-mt-24"><p className="eyebrow">White-label access</p><h2 className="mt-3 text-2xl font-black">Approved public widget websites</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">Allow only websites owned by this Guild to read its public upcoming-ride widget endpoint. Enter the exact HTTPS origin without a path. This never exposes draft, member, payment, staff-contact, or restricted-stay data.</p><form action={updateGuildEmbedOrigins} className="relative mt-6 rounded-3xl border border-white/10 bg-white/[.025] p-7"><input type="hidden" name="slug" value={guild.slug} /><label className="text-sm font-semibold">Approved origins<textarea name="embedOrigins" rows={5} defaultValue={guild.embedOrigins.map((entry) => entry.origin).join("\n")} placeholder={"https://royalravanas.example\nhttps://www.royalravanas.example"} className="field font-mono text-xs" /></label><p className="mt-3 text-xs text-zinc-600">Widget endpoint: /api/widgets/guilds/{guild.slug}/rides</p><FormPendingSubmit idleLabel="Save approved origins" pendingLabel="Saving…" overlayLabel="Saving widget access…" className="mt-5 rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white" /></form></section>
        </>}

        {activeSection === "operations" &&
        <section id="staff" className="mt-10 scroll-mt-24">
          <p className="eyebrow">People and permissions</p><h2 className="mt-3 text-2xl font-black">Members and Guild staff</h2>
          {canAdminister && <div id="join-links" className="mt-6 scroll-mt-24 rounded-3xl border border-white/10 bg-white/[.025] p-6">
            <h3 className="text-xl font-black">Participant invitation links</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Share a revocable link in WhatsApp or social channels. A rider who signs in through it, and completes onboarding if needed, is automatically added as a participant member—never as Guild staff.</p>
            <form action={createGuildJoinLink} className="relative mt-5 grid gap-4 md:grid-cols-[1fr_150px_150px_auto] md:items-end">
              <input type="hidden" name="slug" value={guild.slug} />
              <label className="text-sm font-semibold">Link label<input name="label" maxLength={120} defaultValue="General member invitation" className="field" /></label>
              <label className="text-sm font-semibold">Expires in<select name="expiryDays" defaultValue="30" className="field bg-[#101419]"><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option></select></label>
              <label className="text-sm font-semibold">Maximum joins<input name="maxUses" type="number" min="1" max="10000" placeholder="Unlimited" className="field" /></label>
              <FormPendingSubmit idleLabel="Create link" pendingLabel="Creating…" overlayLabel="Creating membership invitation…" className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white" />
            </form>
            {!!guild.joinLinks.length && <div className="mt-5 grid gap-3">{guild.joinLinks.map((link) => {
              const inactive = !!link.revokedAt || (!!link.expiresAt && link.expiresAt <= new Date()) || (link.maxUses !== null && link.useCount >= link.maxUses);
              return <div key={link.id} className="flex flex-col gap-3 rounded-2xl border border-white/8 p-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-bold">{link.label}</p><p className="mt-1 text-xs text-zinc-500">{link.useCount}{link.maxUses === null ? " joins" : `/${link.maxUses} joins`} · {link.expiresAt ? `expires ${link.expiresAt.toLocaleDateString("en-IN")}` : "no expiry"}{inactive ? " · inactive" : ""}</p></div><div className="flex flex-wrap gap-2">{!inactive && <CopyGuildJoinLink token={link.id} />}{!link.revokedAt && <form action={revokeGuildJoinLink} className="relative"><input type="hidden" name="slug" value={guild.slug} /><input type="hidden" name="linkId" value={link.id} /><FormPendingSubmit idleLabel="Revoke" pendingLabel="Revoking…" overlayLabel="Revoking membership invitation…" className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-bold text-red-300" /></form>}</div></div>;
            })}</div>}
          </div>}
          <form action={inviteGuildStaff} className="relative mt-6 grid gap-4 rounded-3xl border border-white/10 bg-white/[.025] p-6 md:grid-cols-[1fr_220px_auto] md:items-end">
            <input type="hidden" name="slug" value={guild.slug} />
            <label className="text-sm font-semibold">Verified account email<input required type="email" name="email" placeholder="rider@example.com" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold">Staff role<select name="role" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#101419] px-4 py-3"><option value="RIDE_MANAGER">Ride manager</option><option value="ADMIN">Administrator</option><option value="FINANCE">Finance</option><option value="MEMBER_MANAGER">Member manager</option></select></label>
            <FormPendingSubmit idleLabel="Send invitation" pendingLabel="Inviting…" overlayLabel="Creating Guild invitation…" className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white" />
          </form>
          {!!guild.invitations.length && <div className="mt-5 rounded-3xl border border-white/10 p-6"><h3 className="font-black">Pending invitations</h3><div className="mt-4 grid gap-3">{guild.invitations.map((invitation) => <div key={invitation.id} className="flex flex-col gap-3 rounded-2xl border border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{invitation.invitedEmail}</p><p className="mt-1 text-xs text-zinc-500">{invitation.role.replaceAll("_", " ")} · expires {invitation.expiresAt.toLocaleDateString("en-IN")}</p></div><form action={revokeGuildInvitation} className="relative"><input type="hidden" name="slug" value={guild.slug} /><input type="hidden" name="invitationId" value={invitation.id} /><FormPendingSubmit idleLabel="Revoke" pendingLabel="Revoking…" overlayLabel="Revoking invitation…" className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-bold text-red-300" /></form></div>)}</div></div>}
          <div className="mt-5 grid gap-4">{guild.memberships.map((member) => {
            const owner = member.roles.some(({ role }) => role === "OWNER");
            return <article key={member.id} className="rounded-3xl border border-white/10 bg-white/[.02] p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-black">{member.user.displayName}</h3><p className="mt-1 text-xs text-zinc-500">{member.user.contacts[0]?.displayValue ?? "No primary email"} · {member.status}</p><div className="mt-3 flex flex-wrap gap-2">{member.roles.length ? member.roles.map(({ role }) => <span key={role} className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-300">{role.replaceAll("_", " ")}</span>) : <span className="text-xs text-zinc-600">Participant member</span>}</div></div>{!owner && member.user.id !== session.userId && <form action={updateGuildMemberStatus} className="relative"><input type="hidden" name="slug" value={guild.slug} /><input type="hidden" name="membershipId" value={member.id} /><input type="hidden" name="status" value={member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} /><FormPendingSubmit idleLabel={member.status === "ACTIVE" ? "Suspend" : "Reactivate"} pendingLabel="Updating…" overlayLabel="Updating membership…" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold" /></form>}</div>
              {!owner && member.status === "ACTIVE" && <div className="mt-5 flex flex-wrap gap-2">{["ADMIN", "RIDE_MANAGER", "FINANCE", "MEMBER_MANAGER"].map((role) => { const assigned = member.roles.some((entry) => entry.role === role); return <form key={role} action={updateGuildMemberRole} className="relative"><input type="hidden" name="slug" value={guild.slug} /><input type="hidden" name="membershipId" value={member.id} /><input type="hidden" name="role" value={role} /><input type="hidden" name="operation" value={assigned ? "revoke" : "grant"} /><FormPendingSubmit idleLabel={`${assigned ? "Remove" : "Add"} ${role.replaceAll("_", " ")}`} pendingLabel="Updating…" overlayLabel="Updating Guild role…" className={`rounded-full px-3 py-2 text-xs font-bold ${assigned ? "border border-red-400/20 text-red-300" : "border border-white/15 text-zinc-300"}`} /></form>; })}</div>}
            </article>;
          })}</div>
        </section>
        }

        {activeSection === "log" &&
        <section className="mt-10"><p className="eyebrow">Security record</p><h2 className="mt-3 text-2xl font-black">Recent audit history</h2><div className="mt-5 overflow-hidden rounded-3xl border border-white/10">{guild.auditEvents.length ? guild.auditEvents.map((event) => <div key={event.id} className="flex flex-col gap-1 border-b border-white/8 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold">{event.action.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-zinc-600">by {event.actor?.displayName ?? "AtRide automation"}</p></div><time className="text-xs text-zinc-600">{event.createdAt.toLocaleString("en-IN")}</time></div>) : <p className="p-6 text-sm text-zinc-500">Privileged Guild changes will appear here.</p>}</div></section>
        }
      </>}
      <Link href={`/guilds/${guild.slug}`} className="mt-8 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold">View Guild Hall</Link>
    </section>
  );
}
