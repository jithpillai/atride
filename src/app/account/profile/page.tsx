import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileFields } from "@/components/profile-fields";
import { requireSession } from "@/server/auth/authorization";
import { updateProfile } from "@/server/profile/actions";

type Props = { searchParams: Promise<{ error?: string; saved?: string }> };

export const metadata = { title: "Edit profile", robots: { index: false, follow: false } };

export default async function ProfilePage({ searchParams }: Props) {
  const session = await requireSession("/account/profile");
  const profile = session.user.profile;
  if (!profile?.onboardingCompletedAt) redirect("/onboarding");
  const state = await searchParams;

  return (
    <section className="mx-auto min-h-[70vh] max-w-3xl px-5 py-14 lg:px-8">
      <Link href="/account" className="text-sm font-semibold text-zinc-400 hover:text-white">← Account</Link>
      <p className="eyebrow mt-8">Private participant record</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Profile and ride preferences</h1>
      {state.saved === "1" && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">Profile saved.</p>}
      {state.error && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">Check the required fields and use phone numbers with a country code.</p>}
      <form action={updateProfile} className="mt-8 rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
        <ProfileFields values={{ displayName: session.user.displayName, ...profile }} />
        <div className="mt-7 rounded-2xl border border-white/8 bg-black/15 p-4 text-xs leading-6 text-zinc-500">Your phone remains unverified until a compliant verification channel is introduced. Exact contact and emergency information is never part of your public profile.</div>
        <button className="mt-8 rounded-full bg-orange-500 px-7 py-3.5 text-sm font-black text-white transition hover:bg-orange-400">Save profile</button>
      </form>
    </section>
  );
}
