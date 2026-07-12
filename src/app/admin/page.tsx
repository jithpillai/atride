import Link from "next/link";

import { FormPendingSubmit } from "@/components/pending-feedback";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/server/auth/authorization";
import { createGuild, setGuildStatus } from "@/server/guild/actions";

type Props = { searchParams: Promise<{ guildCreated?: string; guildError?: string }> };

export const metadata = { title: "Platform administration", robots: { index: false, follow: false } };

export default async function PlatformAdminPage({ searchParams }: Props) {
  const [session, guildCount, userCount, upcomingRideCount, guilds, state] = await Promise.all([
    requirePlatformAdmin(),
    db.community.count({ where: { status: "ACTIVE" } }),
    db.user.count({ where: { status: "ACTIVE" } }),
    db.ride.count({ where: { status: "PUBLISHED", startsAt: { gt: new Date() } } }),
    db.community.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        locations: { where: { isHome: true }, take: 1 },
        memberships: {
          where: { roles: { some: { role: "OWNER" } } },
          take: 1,
          include: { user: { include: { contacts: { where: { type: "EMAIL" }, take: 1 } } } },
        },
      },
    }),
    searchParams,
  ]);

  return (
    <section className="mx-auto min-h-[70vh] max-w-6xl px-5 py-16 lg:px-8">
      <p className="eyebrow">AtRide operations</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Platform administration</h1>
      <p className="mt-3 text-zinc-400">Signed in as {session.user.displayName}. This boundary is restricted to platform administrators.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          [guildCount, "Active Guilds"],
          [upcomingRideCount, "Upcoming rides"],
          [userCount, "Active accounts"],
        ].map(([value, label]) => (
          <article key={label} className="rounded-3xl border border-white/10 bg-white/[.025] p-7">
            <p className="text-4xl font-black text-white">{value}</p>
            <p className="mt-2 text-sm text-zinc-500">{label}</p>
          </article>
        ))}
      </div>
      {state.guildCreated === "1" && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Guild created in draft state and its first Owner assigned.</p>}
      {state.guildError && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">{state.guildError === "owner" ? "The Owner must already have an active AtRide account with a verified email." : state.guildError === "duplicate" ? "That Guild slug is already in use." : "Check the Guild details and try again."}</p>}

      <form action={createGuild} className="relative mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[.025] p-7">
        <p className="eyebrow">Onboard a Guild</p>
        <h2 className="mt-3 text-2xl font-black">Create draft and assign Owner</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">The Owner must sign into AtRide at least once before the Guild is created.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-zinc-200">Guild name<input required minLength={3} maxLength={160} name="name" placeholder="Royal Ravanas" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-orange-500" /></label>
          <label className="text-sm font-semibold text-zinc-200">URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" minLength={3} maxLength={80} name="slug" placeholder="royal-ravanas" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-orange-500" /></label>
          <label className="text-sm font-semibold text-zinc-200">Owner’s verified email<input required type="email" maxLength={320} name="ownerEmail" placeholder="owner@example.com" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-orange-500" /></label>
          <label className="text-sm font-semibold text-zinc-200">Home city<input required minLength={2} maxLength={120} name="homeCity" placeholder="Bengaluru" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-orange-500" /></label>
        </div>
        <FormPendingSubmit idleLabel="Create draft Guild" pendingLabel="Creating…" overlayLabel="Creating Guild and assigning Owner…" className="mt-6 rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white" />
      </form>

      <div className="mt-10">
        <div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Guild registry</p><h2 className="mt-2 text-2xl font-black">Review and approve</h2></div><span className="text-sm text-zinc-500">{guilds.length} total</span></div>
        <div className="mt-5 grid gap-4">
          {guilds.map((guild) => (
            <article key={guild.id} className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[.025] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-xs font-bold uppercase tracking-[.14em] text-orange-400">{guild.status} · {guild.locations[0]?.city ?? "No home city"}</p><h3 className="mt-2 text-xl font-black">{guild.name}</h3><p className="mt-1 text-sm text-zinc-500">/{guild.slug} · Owner: {guild.memberships[0]?.user.contacts[0]?.displayValue ?? "Not assigned"}</p></div>
                <div className="flex flex-wrap gap-2">
                  {guild.status !== "ACTIVE" && <form action={setGuildStatus}><input type="hidden" name="id" value={guild.id} /><input type="hidden" name="status" value="ACTIVE" /><FormPendingSubmit idleLabel="Approve" pendingLabel="Approving…" overlayLabel="Approving Guild…" className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-black text-black" /></form>}
                  {guild.status === "ACTIVE" && <form action={setGuildStatus}><input type="hidden" name="id" value={guild.id} /><input type="hidden" name="status" value="SUSPENDED" /><FormPendingSubmit idleLabel="Suspend" pendingLabel="Suspending…" overlayLabel="Suspending Guild…" className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-bold text-red-300" /></form>}
                  {guild.status === "ACTIVE" && <Link href={`/guilds/${guild.slug}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold">View Guild Hall</Link>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <Link href="/account" className="mt-8 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold">Back to account</Link>
    </section>
  );
}
