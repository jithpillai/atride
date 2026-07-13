import Link from "next/link";
import { notFound } from "next/navigation";

import { FormPendingSubmit } from "@/components/pending-feedback";
import { MediaUploader } from "@/components/media-uploader";
import { db } from "@/lib/db";
import { requireGuildManager } from "@/server/auth/authorization";
import { inviteGuildStaff, revokeGuildInvitation, updateGuildEmbedOrigins, updateGuildMemberRole, updateGuildMemberStatus, updateGuildProfile, updateGuildRidePolicyTemplates } from "@/server/guild/actions";
import { DEFAULT_GUILD_RIDE_POLICIES } from "@/server/guild/default-ride-policies";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";

type WorkspaceSection = "operations" | "profile" | "settings" | "log";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ section?: string; saved?: string; error?: string; staffSaved?: string; staffError?: string; policySaved?: string; embedSaved?: string; embedError?: string }> };

export const metadata = { title: "Manage Guild", robots: { index: false, follow: false } };

export default async function GuildManagePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { session, membership } = await requireGuildManager(slug);
  const [guild, state] = await Promise.all([db.community.findUnique({
    where: { slug },
    include: {
      visibility: true,
      locations: { orderBy: [{ isHome: "desc" }, { city: "asc" }] },
      logoAsset: true,
      coverAsset: true,
      mediaAssets: { where: { purpose: "GUILD_GALLERY" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      memberships: {
        orderBy: { createdAt: "asc" },
        include: { roles: { orderBy: { role: "asc" } }, user: { select: { id: true, displayName: true, contacts: { where: { type: "EMAIL", isPrimary: true }, take: 1 } } } },
      },
      invitations: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 20 },
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
  }), searchParams]);
  if (!guild) notFound();
  const canAdminister = membership.roles.some(({ role }) => role === "OWNER" || role === "ADMIN");
  const requestedSection = state.section;
  const activeSection: WorkspaceSection = canAdminister && requestedSection && ["profile", "settings", "log"].includes(requestedSection)
    ? requestedSection as WorkspaceSection
    : "operations";
  const workspaceSections: Array<{ id: WorkspaceSection; label: string; description: string }> = [
    { id: "operations", label: "Rides & Roles", description: "Rides, members, and staff" },
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
          {workspaceSections.filter((section) => canAdminister || section.id === "operations").map((section) => {
            const active = section.id === activeSection;
            return <Link key={section.id} href={`/guilds/${guild.slug}/manage?section=${section.id}`} aria-current={active ? "page" : undefined} className={`group border-b-2 px-4 py-4 text-left transition ${active ? "border-orange-500 text-white" : "border-transparent text-zinc-500 hover:border-white/20 hover:text-zinc-200"}`}><span className="block text-sm font-black">{section.label}</span><span className={`mt-1 block text-[11px] ${active ? "text-orange-300" : "text-zinc-600 group-hover:text-zinc-500"}`}>{section.description}</span></Link>;
          })}
        </div>
      </nav>
      {state.saved === "1" && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Guild profile saved.</p>}
      {state.error && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">Check the highlighted Guild details and try again.</p>}
      {state.staffSaved && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Guild staff settings updated.</p>}
      {state.staffError && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">That staff change could not be completed. Protected Owner and self-access rules may apply.</p>}
      {state.policySaved && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Default ride rules saved. New rides will start with these policies.</p>}
      {state.embedSaved && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Approved public widget origins saved.</p>}
      {state.embedError && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">Enter one complete HTTPS origin per line, without paths—for example, https://www.example.com.</p>}
      {activeSection === "operations" && <><div className="mt-10 rounded-3xl border border-white/10 p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Ride operations</p><h2 className="mt-2 text-2xl font-black">Ride workspace</h2></div><Link href={`/guilds/${guild.slug}/rides/new`} className="rounded-full bg-orange-500 px-5 py-2.5 text-center text-sm font-black text-white">Create ride draft</Link></div>
        <div className="mt-5 grid gap-3">
          {guild.rides.length ? guild.rides.map((ride) => (
            <div key={ride.id} className="flex flex-col gap-2 rounded-2xl border border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-bold">{ride.title}</p><p className="mt-1 text-xs text-zinc-500">{ride.status} · {ride.startsAt.toLocaleDateString("en-IN")}</p></div>
              <div className="flex items-center gap-3"><p className="text-sm font-bold text-orange-300">{ride.bookedSlots}/{ride.totalSlots} booked</p><Link href={`/guilds/${guild.slug}/rides/${ride.id}/edit`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold">Edit package</Link></div>
            </div>
          )) : <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-zinc-500">No rides yet. Create the Guild&apos;s first ride draft.</p>}
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-3xl font-black">{guild._count.rides}</p><p className="mt-2 text-sm text-zinc-500">Rides</p></article>
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-3xl font-black">{guild._count.memberships}</p><p className="mt-2 text-sm text-zinc-500">Members</p></article>
      </div></>}
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
        <section className="mt-10"><p className="eyebrow">Security record</p><h2 className="mt-3 text-2xl font-black">Recent audit history</h2><div className="mt-5 overflow-hidden rounded-3xl border border-white/10">{guild.auditEvents.length ? guild.auditEvents.map((event) => <div key={event.id} className="flex flex-col gap-1 border-b border-white/8 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold">{event.action.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-zinc-600">by {event.actor.displayName}</p></div><time className="text-xs text-zinc-600">{event.createdAt.toLocaleString("en-IN")}</time></div>) : <p className="p-6 text-sm text-zinc-500">Privileged Guild changes will appear here.</p>}</div></section>
        }
      </>}
      <Link href={`/guilds/${guild.slug}`} className="mt-8 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold">View Guild Hall</Link>
    </section>
  );
}
