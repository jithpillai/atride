import { redirect } from "next/navigation";

import { ProfileFields } from "@/components/profile-fields";
import { requireSession } from "@/server/auth/authorization";
import { completeOnboarding } from "@/server/profile/actions";

type Props = { searchParams: Promise<{ error?: string }> };

export const metadata = { title: "Complete your profile", robots: { index: false, follow: false } };

export default async function OnboardingPage({ searchParams }: Props) {
  const session = await requireSession("/onboarding");
  if (session.user.profile?.onboardingCompletedAt) redirect("/account");
  const hasError = (await searchParams).error === "invalid";

  return (
    <section className="mx-auto min-h-[70vh] max-w-3xl px-5 py-14 lg:px-8">
      <p className="eyebrow">One account, every Guild</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Complete your rider profile</h1>
      <p className="mt-4 max-w-2xl leading-7 text-zinc-400">This information stays private by default. Guild staff receive only the details required for a ride you join.</p>
      {hasError && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">Check the required fields, phone format, and acknowledgements.</p>}
      <form action={completeOnboarding} className="mt-8 rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
        <ProfileFields values={{ displayName: session.user.displayName }} />
        <div className="mt-7 grid gap-3">
          <label className="flex items-start gap-3 text-sm leading-6 text-zinc-300"><input required type="checkbox" name="acceptTerms" className="mt-1 size-4 accent-orange-500" /><span>I accept the @Ride terms for account and ride-platform use.</span></label>
          <label className="flex items-start gap-3 text-sm leading-6 text-zinc-300"><input required type="checkbox" name="acceptPrivacy" className="mt-1 size-4 accent-orange-500" /><span>I understand that my profile is private and relevant details are shared only with Guilds whose rides I join.</span></label>
        </div>
        <button className="mt-8 rounded-full bg-orange-500 px-7 py-3.5 text-sm font-black text-white transition hover:bg-orange-400">Complete profile</button>
      </form>
    </section>
  );
}
