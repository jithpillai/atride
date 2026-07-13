import { redirect } from "next/navigation";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { ImageWithFallback } from "@/components/image-with-fallback";
import { FormPendingSubmit } from "@/components/pending-feedback";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/server/auth/session";
import { acceptGuildInvitation } from "@/server/guild/actions";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";

export const metadata = { title: "Your account", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ inviteAccepted?: string; inviteError?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!session.user.profile?.onboardingCompletedAt) redirect("/onboarding");

  const email = session.user.contacts.find((contact) => contact.type === "EMAIL");
  const [state, invitations] = await Promise.all([
    searchParams,
    email?.verifiedAt ? db.communityInvitation.findMany({
      where: { invitedEmail: email.normalizedValue, status: "PENDING", expiresAt: { gt: new Date() } },
      include: { community: { select: { name: true, slug: true } }, invitedBy: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
    }) : [],
  ]);
  const manageableMemberships = session.user.communityMemberships.filter((membership) => membership.roles.length > 0);

  return (
    <section className="mx-auto min-h-[70vh] max-w-5xl px-5 py-16 lg:px-8">
      <div className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your AtRide account</p>
          <div className="mt-3 flex items-center gap-4">
            <ImageWithFallback src={session.user.profile.avatarAsset ? cloudinaryImageUrl(session.user.profile.avatarAsset) : "/defaults/user-avatar.png"} fallbackSrc="/defaults/user-avatar.png" alt="" width={64} height={64} className="size-16 rounded-2xl object-cover" />
            <h1 className="text-4xl font-black tracking-tight text-white">Welcome, {session.user.displayName}</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
            <span>{email?.displayValue}</span>
            <span aria-hidden="true" className="text-zinc-700">·</span>
            {email?.verifiedAt ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                <span aria-hidden="true" className="inline-grid size-4 place-items-center rounded-full bg-emerald-500 text-[10px] font-black leading-none text-white">✓</span>
                Email verified
              </span>
            ) : (
              <span className="font-semibold text-amber-400">Email pending</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {manageableMemberships.map((membership) => <Link key={membership.id} href={`/guilds/${membership.community.slug}/manage`} className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-400">Manage {membership.community.name}</Link>)}
          <LogoutButton />
        </div>
      </div>

      {state.inviteAccepted && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Guild staff invitation accepted. Your new access is active now.</p>}
      {state.inviteError && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">That Guild invitation is invalid, expired, or belongs to another account.</p>}

      {!!invitations.length && <section id="invitations" className="mt-8 scroll-mt-24 rounded-3xl border border-orange-400/20 bg-orange-400/[.035] p-7"><p className="eyebrow">Guild invitations</p><h2 className="mt-3 text-2xl font-black">Staff access awaiting your approval</h2><div className="mt-5 grid gap-3">{invitations.map((invitation) => <article key={invitation.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{invitation.community.name}</p><p className="mt-1 text-sm text-zinc-400">{invitation.role.replaceAll("_", " ")} · invited by {invitation.invitedBy.displayName}</p><p className="mt-1 text-xs text-zinc-600">Expires {invitation.expiresAt.toLocaleDateString("en-IN")}</p></div><form action={acceptGuildInvitation} className="relative"><input type="hidden" name="invitationId" value={invitation.id} /><FormPendingSubmit idleLabel="Accept invitation" pendingLabel="Accepting…" overlayLabel="Activating Guild access…" className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black text-white" /></form></article>)}</div></section>}

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Link href="/account/profile" className="rounded-3xl border border-white/10 bg-white/[.025] p-7 transition hover:border-orange-400/30 hover:bg-orange-400/[.035]">
          <p className="eyebrow">Participant profile</p>
          <h2 className="mt-3 text-2xl font-black">Personal and ride details</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm leading-6">
            <span className="text-zinc-500">{session.user.profile.homeCity}</span>
            <span aria-hidden="true" className="text-zinc-700">·</span>
            {session.user.profile.phoneVerifiedAt ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                <span aria-hidden="true" className="inline-grid size-4 place-items-center rounded-full bg-emerald-500 text-[10px] font-black leading-none text-white">✓</span>
                Phone verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-400">
                <span aria-hidden="true" className="inline-grid size-4 place-items-center rounded-full bg-amber-500 text-[10px] font-black leading-none text-black">!</span>
                Phone unverified
              </span>
            )}
          </div>
        </Link>

        <Link href="/account/vehicles" className="rounded-3xl border border-white/10 bg-white/[.025] p-7 transition hover:border-orange-400/30 hover:bg-orange-400/[.035]">
          <p className="eyebrow">Vehicle garage</p>
          <h2 className="mt-3 text-2xl font-black">Manage your vehicles</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Add a bike now, with cars and 4×4 vehicles supported by the same garage.</p>
        </Link>

        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-7">
          <p className="eyebrow">Platform access</p>
          <h2 className="mt-3 text-2xl font-black">Roles</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {session.user.platformRoles.length ? session.user.platformRoles.map(({ role }) => (
              <span key={role} className="rounded-full bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-300">{role.replaceAll("_", " ")}</span>
            )) : <p className="text-sm text-zinc-500">Standard participant account</p>}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-7">
          <p className="eyebrow">Guild relationships</p>
          <h2 className="mt-3 text-2xl font-black">Memberships</h2>
          <div className="mt-5 grid gap-3">
            {session.user.communityMemberships.length ? session.user.communityMemberships.map((membership) => (
              <div key={membership.id} className="rounded-2xl border border-white/8 p-4">
                <p className="font-bold text-white">{membership.community.name}</p>
                <p className="mt-1 text-xs text-zinc-500">{membership.roles.map(({ role }) => role.replaceAll("_", " ")).join(" · ") || "Member"}</p>
              </div>
            )) : <p className="text-sm text-zinc-500">Your confirmed Guild relationships will appear here.</p>}
          </div>
        </article>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {session.user.platformRoles.some(({ role }) => role === "PLATFORM_ADMIN") && (
          <a href="/admin" className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black text-white">Open platform admin</a>
        )}
      </div>
    </section>
  );
}
