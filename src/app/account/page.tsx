import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentSession } from "@/server/auth/session";

export const metadata = { title: "Your account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const email = session.user.contacts.find((contact) => contact.type === "EMAIL");

  return (
    <section className="mx-auto min-h-[70vh] max-w-5xl px-5 py-16 lg:px-8">
      <div className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your AtRide account</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Welcome, {session.user.displayName}</h1>
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
        <LogoutButton />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
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
        {session.user.communityMemberships.flatMap((membership) =>
          membership.roles.length ? [
            <a key={membership.id} href={`/guilds/${membership.community.slug}/manage`} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold">
              Manage {membership.community.name}
            </a>,
          ] : [],
        )}
      </div>
    </section>
  );
}
