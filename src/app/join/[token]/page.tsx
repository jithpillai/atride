import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AutoJoinSubmit } from "@/components/guild-join-link";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/server/auth/session";
import { acceptGuildJoinLink } from "@/server/guild/actions";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> };

export const metadata = { title: "Join a Guild", robots: { index: false, follow: false } };

export default async function JoinGuildPage({ params, searchParams }: Props) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) notFound();
  const query = await searchParams;
  const now = new Date();
  const link = await db.communityJoinLink.findFirst({
    where: { id: token, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    include: { community: { select: { slug: true, name: true, tagline: true } } },
  });
  if (!link) notFound();
  if (link.maxUses !== null && link.useCount >= link.maxUses) notFound();
  const returnTo = `/join/${token}`;
  const session = await getCurrentSession();
  if (session && !session.user.profile?.onboardingCompletedAt) redirect(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);

  return <section className="mx-auto grid min-h-[68vh] max-w-2xl place-items-center px-5 py-16 text-center">
    <div className="w-full rounded-3xl border border-white/10 bg-white/[.025] p-8 sm:p-12">
      <p className="eyebrow">Guild invitation</p>
      <h1 className="mt-4 text-4xl font-black">Join {link.community.name}</h1>
      <p className="mx-auto mt-4 max-w-lg leading-7 text-zinc-400">{link.community.tagline}</p>
      {query.error && <p className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-semibold text-red-300">This invitation is no longer available.</p>}
      {!session ? <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="mt-8 inline-flex rounded-full bg-orange-500 px-7 py-3.5 text-sm font-black text-white">Sign in or create an account</Link> :
        <form action={acceptGuildJoinLink} className="relative mt-8"><input type="hidden" name="linkId" value={link.id} /><AutoJoinSubmit /><p className="mt-4 text-xs text-zinc-600">Your verified AtRide account will be added as a participant member.</p></form>}
    </div>
  </section>;
}
