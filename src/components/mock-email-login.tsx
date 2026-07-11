"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const googleErrors: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  google_invalid_flow: "The Google sign-in attempt expired or was invalid. Please try again.",
  google_unavailable: "Google sign-in is temporarily unavailable. Continue with email instead.",
  google_failed: "Google could not complete sign-in. Continue with email or try again.",
};

export function MockEmailLogin({ returnTo = "/account", googleError }: { returnTo?: string; googleError?: string }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [error, setError] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json() as { ok: boolean; message?: string; email?: string; developmentCode?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to send a code.");
      setEmail(result.email ?? email);
      setDevelopmentCode(result.developmentCode ?? "");
      setStep("otp");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send a code.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const result = await response.json() as { ok: boolean; message?: string; onboardingRequired?: boolean };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to verify the code.");
      window.location.assign(result.onboardingRequired ? "/onboarding" : returnTo);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify the code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={step === "email" ? requestOtp : verifyOtp} className="rounded-3xl border border-white/10 bg-[#14181f] p-7 shadow-2xl shadow-black/30">
      {step === "email" && (
        <>
          <Link href={`/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white px-5 py-3.5 text-sm font-black text-zinc-900 transition hover:bg-zinc-100">
            <Image src="/brand/google-logo.png" alt="" aria-hidden="true" width={40} height={20} className="h-5 w-10 object-contain" />
            Continue with Google
          </Link>
          {googleError && googleErrors[googleError] && <p role="alert" className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">{googleErrors[googleError]}</p>}
          <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-white/10" /><span className="text-xs font-bold uppercase tracking-[.14em] text-zinc-600">or</span><span className="h-px flex-1 bg-white/10" /></div>
        </>
      )}
      <p className="text-xs font-bold uppercase tracking-[.18em] text-orange-400">Secure email sign in</p>
      <h2 className="mt-3 text-2xl font-black text-white">{step === "email" ? "Continue with email" : "Check your inbox"}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        {step === "email" ? "We’ll use this for your common AtRide account." : `Enter the six-digit code sent to ${email}.`}
      </p>
      {step === "email" ? (
        <label className="mt-6 block text-sm font-semibold text-zinc-200">
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="rider@example.com"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
          />
        </label>
      ) : (
        <label className="mt-6 block text-sm font-semibold text-zinc-200">
          Verification code
          <input
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-center text-xl font-black tracking-[.35em] text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500"
          />
        </label>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-400">{error}</p>}
      {developmentCode && step === "otp" && (
        <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-200">
          Development code: <strong className="tracking-[.2em]">{developmentCode}</strong>
        </p>
      )}
      <button disabled={loading} type="submit" className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-sm font-black text-white transition hover:bg-orange-400 disabled:cursor-wait disabled:opacity-60">
        {loading ? "Please wait…" : step === "email" ? "Send email code" : "Verify email"}
      </button>
      {step === "otp" && (
        <button type="button" onClick={() => setStep("email")} className="mt-4 w-full text-sm font-semibold text-zinc-400 hover:text-white">Use a different email</button>
      )}
      <p className="mt-5 text-center text-xs text-zinc-600">The code is shown on-screen only when the local mock provider is enabled.</p>
    </form>
  );
}
