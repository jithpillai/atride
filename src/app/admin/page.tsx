import Link from "next/link";

import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/server/auth/authorization";

export const metadata = { title: "Platform administration", robots: { index: false, follow: false } };

export default async function PlatformAdminPage() {
  const [session, guildCount, userCount, upcomingRideCount] = await Promise.all([
    requirePlatformAdmin(),
    db.community.count({ where: { status: "ACTIVE" } }),
    db.user.count({ where: { status: "ACTIVE" } }),
    db.ride.count({ where: { status: "PUBLISHED", startsAt: { gt: new Date() } } }),
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
      <Link href="/account" className="mt-8 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold">Back to account</Link>
    </section>
  );
}
