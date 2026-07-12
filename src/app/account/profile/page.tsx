import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile-form";
import { MediaUploader } from "@/components/media-uploader";
import { requireSession } from "@/server/auth/authorization";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";
import { emptyProfileFormState } from "@/server/profile/validation";

type Props = { searchParams: Promise<{ saved?: string; phoneVerified?: string }> };

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
      {state.phoneVerified === "1" && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">✓ Phone number verified.</p>}
      <div className="mt-8">
        <MediaUploader
          purpose="USER_AVATAR"
          label="Profile image"
          help="Optional and private by default. JPEG, PNG, or WebP up to 5 MB."
          fallbackUrl="/defaults/user-avatar.png"
          currentAsset={profile.avatarAsset ? { id: profile.avatarAsset.id, url: cloudinaryImageUrl(profile.avatarAsset, "f_auto,q_auto") } : null}
        />
      </div>
      <ProfileForm mode="edit" initialState={emptyProfileFormState({ displayName: session.user.displayName, ...profile })} savedPhone={profile.operationalPhone} phoneVerifiedAt={profile.phoneVerifiedAt} />
    </section>
  );
}
