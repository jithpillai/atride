import Link from "next/link";
import { notFound } from "next/navigation";

import { FormPendingSubmit } from "@/components/pending-feedback";
import { MediaUploader } from "@/components/media-uploader";
import { db } from "@/lib/db";
import { requireGuildManager } from "@/server/auth/authorization";
import { updateGuildProfile } from "@/server/guild/actions";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export const metadata = { title: "Manage Guild", robots: { index: false, follow: false } };

export default async function GuildManagePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { membership } = await requireGuildManager(slug);
  const [guild, state] = await Promise.all([db.community.findUnique({
    where: { slug },
    include: {
      visibility: true,
      locations: { orderBy: [{ isHome: "desc" }, { city: "asc" }] },
      logoAsset: true,
      coverAsset: true,
      mediaAssets: { where: { purpose: "GUILD_GALLERY" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
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
  const homeCity = guild.locations.find((location) => location.isHome)?.city ?? guild.locations[0]?.city ?? "";

  return (
    <section className="mx-auto min-h-[70vh] max-w-6xl px-5 py-16 lg:px-8">
      <p className="eyebrow">Guild workspace</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Manage {guild.name}</h1>
      <p className="mt-3 text-zinc-400">Your access: {membership.roles.map(({ role }) => role.replaceAll("_", " ")).join(" · ")}</p>
      {state.saved === "1" && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Guild profile saved.</p>}
      {state.error && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">Check the highlighted Guild details and try again.</p>}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><p className="text-4xl font-black">{guild._count.rides}</p><p className="mt-2 text-sm text-zinc-500">Rides</p></article>
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><p className="text-4xl font-black">{guild._count.memberships}</p><p className="mt-2 text-sm text-zinc-500">Members</p></article>
      </div>
      {canAdminister && guild.visibility && <>
        <form action={updateGuildProfile} className="relative mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[.025] p-7">
          <input type="hidden" name="slug" value={guild.slug} />
          <p className="eyebrow">Guild Hall profile</p><h2 className="mt-3 text-2xl font-black">Identity and visibility</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold">Guild name<input required minLength={3} maxLength={160} name="name" defaultValue={guild.name} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold">Short name<input required minLength={2} maxLength={12} name="shortName" defaultValue={guild.shortName} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 uppercase outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold sm:col-span-2">Tagline<input required minLength={5} maxLength={240} name="tagline" defaultValue={guild.tagline} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold sm:col-span-2">Description<textarea required minLength={20} maxLength={5000} rows={5} name="description" defaultValue={guild.description} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold">Home city<input required minLength={2} maxLength={120} name="homeCity" defaultValue={homeCity} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold">Founded year<input type="number" min="1900" max={new Date().getFullYear()} name="foundedYear" defaultValue={guild.foundedYear ?? ""} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold">Accent color<input type="color" name="accentColor" defaultValue={guild.accentColor} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-2 py-2" /></label>
            <label className="text-sm font-semibold">Specialties<input maxLength={500} name="specialties" defaultValue={guild.specialties.join(", ")} placeholder="Touring, Breakfast rides, Off-road" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
            <label className="text-sm font-semibold">Directory listing<select name="directoryVisibility" defaultValue={guild.visibility.directoryVisibility} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#101419] px-4 py-3"><option value="UNLISTED">Unlisted / private</option><option value="LISTED">Listed in marketplace</option></select></label>
            <label className="text-sm font-semibold">Guild Hall access<select name="guildHallAccess" defaultValue={guild.visibility.guildHallAccess} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#101419] px-4 py-3"><option value="PUBLIC">Public</option><option value="VERIFIED_USERS">Verified AtRide users</option><option value="GUILD_MEMBERS">Guild members</option><option value="INVITE_ONLY">Invite only</option></select></label>
          </div>
          <FormPendingSubmit idleLabel="Save Guild profile" pendingLabel="Saving…" overlayLabel="Saving Guild profile…" className="mt-7 rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white" />
        </form>

        <div className="mt-10"><p className="eyebrow">Brand media</p><h2 className="mt-3 text-2xl font-black">Logo, cover, and gallery</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <MediaUploader purpose="GUILD_LOGO" communitySlug={guild.slug} label="Guild logo" help="Square JPEG, PNG, or WebP up to 5 MB." currentAsset={guild.logoAsset ? { id: guild.logoAsset.id, url: cloudinaryImageUrl(guild.logoAsset) } : null} />
            <MediaUploader purpose="GUILD_COVER" communitySlug={guild.slug} label="Guild cover" help="A wide 16:9 image works best. Up to 10 MB." currentAsset={guild.coverAsset ? { id: guild.coverAsset.id, url: cloudinaryImageUrl(guild.coverAsset) } : null} />
          </div>
          <div className="mt-5"><MediaUploader purpose="GUILD_GALLERY" communitySlug={guild.slug} label="Add gallery image" help="Up to 12 images, 10 MB each." /></div>
          {!!guild.mediaAssets.length && <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{guild.mediaAssets.map((asset, index) => <MediaUploader key={asset.id} purpose="GUILD_GALLERY" communitySlug={guild.slug} label={`Gallery image ${index + 1}`} help="Published in this Guild Hall." currentAsset={{ id: asset.id, url: cloudinaryImageUrl(asset) }} removeOnly />)}</div>}
        </div>
      </>}
      <div className="mt-10 rounded-3xl border border-white/10 p-7">
        <h2 className="text-2xl font-black">Ride workspace</h2>
        <div className="mt-5 grid gap-3">
          {guild.rides.map((ride) => (
            <div key={ride.id} className="flex flex-col gap-2 rounded-2xl border border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-bold">{ride.title}</p><p className="mt-1 text-xs text-zinc-500">{ride.status} · {ride.startsAt.toLocaleDateString("en-IN")}</p></div>
              <p className="text-sm font-bold text-orange-300">{ride.bookedSlots}/{ride.totalSlots} booked</p>
            </div>
          ))}
        </div>
      </div>
      <Link href={`/guilds/${guild.slug}`} className="mt-8 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold">View Guild Hall</Link>
    </section>
  );
}
