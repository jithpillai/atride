import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile-form";
import { requireSession } from "@/server/auth/authorization";
import { emptyProfileFormState } from "@/server/profile/validation";

export const metadata = { title: "Complete your profile", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ returnTo?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const query = await searchParams;
  const returnTo = query.returnTo?.startsWith("/") && !query.returnTo.startsWith("//") ? query.returnTo : "/account?onboarding=complete";
  const session = await requireSession(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
  if (session.user.profile?.onboardingCompletedAt) redirect(returnTo);

  return (
    <section className="mx-auto min-h-[70vh] max-w-3xl px-5 py-14 lg:px-8">
      <p className="eyebrow">One account, every Guild</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Complete your rider profile</h1>
      <p className="mt-4 max-w-2xl leading-7 text-zinc-400">This information stays private by default. Guild staff receive only the details required for a ride you join.</p>
      <ProfileForm mode="onboarding" returnTo={returnTo} initialState={emptyProfileFormState({ displayName: session.user.displayName })} />
    </section>
  );
}
