"use client";

import { FormEvent, useState } from "react";

export function MockEmailLogin() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "done">("email");
  const [error, setError] = useState("");

  function requestOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setStep("otp");
  }

  function verifyOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (otp !== "123456") {
      setError("For this development flow, use 123456.");
      return;
    }
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-8 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-400 text-2xl font-black text-emerald-950">✓</div>
        <h2 className="mt-5 text-2xl font-black text-white">Email verified</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">The UI flow is working. Account sessions and real email delivery arrive in Phase 2.</p>
      </div>
    );
  }

  return (
    <form onSubmit={step === "email" ? requestOtp : verifyOtp} className="rounded-3xl border border-white/10 bg-[#14181f] p-7 shadow-2xl shadow-black/30">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-orange-400">Development preview</p>
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
            placeholder="123456"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-center text-xl font-black tracking-[.35em] text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500"
          />
        </label>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-400">{error}</p>}
      <button type="submit" className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-sm font-black text-white transition hover:bg-orange-400">
        {step === "email" ? "Send email code" : "Verify email"}
      </button>
      {step === "otp" && (
        <button type="button" onClick={() => setStep("email")} className="mt-4 w-full text-sm font-semibold text-zinc-400 hover:text-white">Use a different email</button>
      )}
      <p className="mt-5 text-center text-xs text-zinc-600">No email is sent yet. Development code: 123456.</p>
    </form>
  );
}
