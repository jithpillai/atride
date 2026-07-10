import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requireGuildManager } from "@/server/auth/authorization";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "Manage Guild", robots: { index: false, follow: false } };

export default async function GuildManagePage({ params }: Props) {
  const { slug } = await params;
  const { membership } = await requireGuildManager(slug);
  const guild = await db.community.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      _count: { select: { memberships: true, rides: true } },
      rides: {
        orderBy: { startsAt: "asc" },
        take: 4,
        select: { id: true, title: true, status: true, startsAt: true, bookedSlots: true, totalSlots: true },
      },
    },
  });
  if (!guild) notFound();

  return (
    <section className="mx-auto min-h-[70vh] max-w-6xl px-5 py-16 lg:px-8">
      <p className="eyebrow">Guild workspace</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Manage {guild.name}</h1>
      <p className="mt-3 text-zinc-400">Your access: {membership.roles.map(({ role }) => role.replaceAll("_", " ")).join(" · ")}</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><p className="text-4xl font-black">{guild._count.rides}</p><p className="mt-2 text-sm text-zinc-500">Rides</p></article>
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-7"><p className="text-4xl font-black">{guild._count.memberships}</p><p className="mt-2 text-sm text-zinc-500">Members</p></article>
      </div>
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
