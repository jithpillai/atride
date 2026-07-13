"use client";

import { useActionState, useEffect, useRef } from "react";

import { FormPendingSubmit } from "@/components/pending-feedback";
import { ProfileFields } from "@/components/profile-fields";
import { completeOnboarding, updateProfile } from "@/server/profile/actions";
import type { ProfileFormState } from "@/server/profile/validation";

export function ProfileForm({ mode, initialState, savedPhone, phoneVerifiedAt, returnTo }: { mode: "onboarding" | "edit"; initialState: ProfileFormState; savedPhone?: string | null; phoneVerifiedAt?: Date | string | null; returnTo?: string }) {
  const action = mode === "onboarding" ? completeOnboarding : updateProfile;
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.revision > 0) {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    }
  }, [state.revision]);

  return (
    <form ref={formRef} action={formAction} className="relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
      {mode === "onboarding" && <input type="hidden" name="returnTo" value={returnTo ?? "/account?onboarding=complete"} />}
      {state.message && <p role="alert" className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">{state.message}</p>}
      <ProfileFields key={state.revision} values={state.values} errors={state.errors} mode={mode} savedPhone={savedPhone} phoneVerifiedAt={phoneVerifiedAt} />
      {mode === "onboarding" ? (
        <div className="mt-7 grid gap-3">
          <label className={`flex items-start gap-3 rounded-xl p-2 text-sm leading-6 ${state.errors.acceptTerms ? "bg-red-400/5 text-red-300" : "text-zinc-300"}`}><input required type="checkbox" name="acceptTerms" defaultChecked={state.values.acceptTerms} aria-invalid={state.errors.acceptTerms ? true : undefined} className="mt-1 size-4 accent-orange-500" /><span>I accept the @Ride terms for account and ride-platform use.{state.errors.acceptTerms && <span className="block text-xs font-semibold text-red-400">{state.errors.acceptTerms}</span>}</span></label>
          <label className={`flex items-start gap-3 rounded-xl p-2 text-sm leading-6 ${state.errors.acceptPrivacy ? "bg-red-400/5 text-red-300" : "text-zinc-300"}`}><input required type="checkbox" name="acceptPrivacy" defaultChecked={state.values.acceptPrivacy} aria-invalid={state.errors.acceptPrivacy ? true : undefined} className="mt-1 size-4 accent-orange-500" /><span>I understand that my profile is private and relevant details are shared only with Guilds whose rides I join.{state.errors.acceptPrivacy && <span className="block text-xs font-semibold text-red-400">{state.errors.acceptPrivacy}</span>}</span></label>
        </div>
      ) : (
        <div className="mt-7 rounded-2xl border border-white/8 bg-black/15 p-4 text-xs leading-6 text-zinc-500">Blood-group data is self-reported. Exact contact, emergency, and medical information is never part of your public profile.</div>
      )}
      <FormPendingSubmit
        idleLabel={mode === "onboarding" ? "Complete profile" : "Save profile"}
        pendingLabel="Please wait…"
        overlayLabel={mode === "onboarding" ? "Completing profile…" : "Saving profile…"}
        className="mt-8 rounded-full bg-orange-500 px-7 py-3.5 text-sm font-black text-white transition hover:bg-orange-400"
      />
    </form>
  );
}
