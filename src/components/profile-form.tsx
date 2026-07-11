"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { ProfileFields } from "@/components/profile-fields";
import { completeOnboarding, updateProfile } from "@/server/profile/actions";
import type { ProfileFormState } from "@/server/profile/validation";

function PendingSubmit({ mode }: { mode: "onboarding" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <>
      {pending && (
        <div className="absolute inset-0 z-20 grid place-items-center rounded-3xl bg-[#101419]/85 backdrop-blur-sm" aria-live="polite">
          <div className="flex items-center gap-3 rounded-full border border-orange-400/20 bg-black/40 px-5 py-3 text-sm font-bold text-white shadow-xl">
            <span className="size-5 animate-spin rounded-full border-2 border-orange-200/30 border-t-orange-400" />
            {mode === "onboarding" ? "Completing profile…" : "Saving profile…"}
          </div>
        </div>
      )}
      <button disabled={pending} className="mt-8 rounded-full bg-orange-500 px-7 py-3.5 text-sm font-black text-white transition hover:bg-orange-400 disabled:cursor-wait disabled:opacity-60">
        {pending ? "Please wait…" : mode === "onboarding" ? "Complete profile" : "Save profile"}
      </button>
    </>
  );
}

export function ProfileForm({ mode, initialState }: { mode: "onboarding" | "edit"; initialState: ProfileFormState }) {
  const action = mode === "onboarding" ? completeOnboarding : updateProfile;
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.revision > 0) {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    }
  }, [state.revision]);

  return (
    <form ref={formRef} action={formAction} className="relative mt-8 rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
      {state.message && <p role="alert" className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">{state.message}</p>}
      <ProfileFields key={state.revision} values={state.values} errors={state.errors} />
      {mode === "onboarding" ? (
        <div className="mt-7 grid gap-3">
          <label className={`flex items-start gap-3 rounded-xl p-2 text-sm leading-6 ${state.errors.acceptTerms ? "bg-red-400/5 text-red-300" : "text-zinc-300"}`}><input required type="checkbox" name="acceptTerms" defaultChecked={state.values.acceptTerms} aria-invalid={state.errors.acceptTerms ? true : undefined} className="mt-1 size-4 accent-orange-500" /><span>I accept the @Ride terms for account and ride-platform use.{state.errors.acceptTerms && <span className="block text-xs font-semibold text-red-400">{state.errors.acceptTerms}</span>}</span></label>
          <label className={`flex items-start gap-3 rounded-xl p-2 text-sm leading-6 ${state.errors.acceptPrivacy ? "bg-red-400/5 text-red-300" : "text-zinc-300"}`}><input required type="checkbox" name="acceptPrivacy" defaultChecked={state.values.acceptPrivacy} aria-invalid={state.errors.acceptPrivacy ? true : undefined} className="mt-1 size-4 accent-orange-500" /><span>I understand that my profile is private and relevant details are shared only with Guilds whose rides I join.{state.errors.acceptPrivacy && <span className="block text-xs font-semibold text-red-400">{state.errors.acceptPrivacy}</span>}</span></label>
        </div>
      ) : (
        <div className="mt-7 rounded-2xl border border-white/8 bg-black/15 p-4 text-xs leading-6 text-zinc-500">Phone and blood-group data remain unverified. Exact contact, emergency, and medical information is never part of your public profile.</div>
      )}
      <PendingSubmit mode={mode} />
    </form>
  );
}
