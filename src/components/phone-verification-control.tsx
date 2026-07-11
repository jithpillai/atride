"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";

import { getFirebasePhoneAuth } from "@/lib/firebase-client";
import { PendingOverlay } from "@/components/pending-feedback";

type ApiResult = { ok: boolean; message?: string; challengeToken?: string; phone?: string };

function normalizeForComparison(value: string) {
  const normalized = value.replace(/[\s()-]/g, "");
  if (/^\d{10}$/.test(normalized)) return `+91${normalized}`;
  if (/^91\d{10}$/.test(normalized)) return `+${normalized}`;
  return normalized;
}

export function PhoneVerificationControl({
  mode,
  inputId,
  savedPhone,
  verifiedAt,
}: {
  mode: "onboarding" | "edit";
  inputId: string;
  savedPhone: string;
  verifiedAt?: Date | string | null;
}) {
  const [currentPhone, setCurrentPhone] = useState(savedPhone);
  const [stage, setStage] = useState<"idle" | "sending" | "code" | "verifying" | "success">("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const challengeTokenRef = useRef("");
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) return;
    const update = () => setCurrentPhone(input.value);
    update();
    input.addEventListener("input", update);
    return () => input.removeEventListener("input", update);
  }, [inputId]);

  useEffect(() => () => recaptchaRef.current?.clear(), []);

  const savedNormalized = useMemo(() => normalizeForComparison(savedPhone), [savedPhone]);
  const currentNormalized = useMemo(() => normalizeForComparison(currentPhone), [currentPhone]);
  const changed = currentNormalized !== savedNormalized;

  async function beginVerification() {
    setError("");
    setStage("sending");
    try {
      const response = await fetch("/api/profile/phone-verification/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: savedPhone }),
      });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.ok || !result.challengeToken || !result.phone) {
        throw new Error(result.message ?? "Unable to start phone verification.");
      }

      const auth = getFirebasePhoneAuth();
      recaptchaRef.current?.clear();
      recaptchaRef.current = new RecaptchaVerifier(auth, "firebase-phone-recaptcha", { size: "invisible" });
      confirmationRef.current = await signInWithPhoneNumber(auth, result.phone, recaptchaRef.current);
      challengeTokenRef.current = result.challengeToken;
      setStage("code");
    } catch (verificationError) {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      setError(verificationError instanceof Error ? verificationError.message : "Unable to send the verification code.");
      setStage("idle");
    }
  }

  async function confirmCode() {
    if (!confirmationRef.current || !/^\d{6}$/.test(code)) {
      setError("Enter the six-digit verification code.");
      return;
    }
    setError("");
    setStage("verifying");
    try {
      const credential = await confirmationRef.current.confirm(code);
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/profile/phone-verification/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeToken: challengeTokenRef.current, idToken }),
      });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to confirm phone verification.");
      setStage("success");
      await signOut(getFirebasePhoneAuth()).catch(() => undefined);
      window.location.assign("/account/profile?phoneVerified=1");
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "The verification code could not be confirmed.");
      setStage("code");
    }
  }

  if (mode === "onboarding") {
    return <span className="font-normal text-zinc-500">· Verify after completing your profile</span>;
  }
  if (verifiedAt && !changed) {
    return <span className="font-normal text-emerald-400">· ✓ Verified</span>;
  }

  return (
    <div className="relative mt-2 overflow-hidden rounded-2xl border border-white/8 bg-black/15 p-3">
      <PendingOverlay show={stage === "sending" || stage === "verifying"} label={stage === "sending" ? "Sending verification code…" : "Verifying phone…"} />
      {changed ? (
        <p className="text-xs font-semibold leading-5 text-amber-300">Save the changed number before verifying it. Changing a verified number removes its verification.</p>
      ) : stage === "code" || stage === "verifying" ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label="Phone verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            className="min-w-36 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
          />
          <button type="button" disabled={stage === "verifying"} onClick={confirmCode} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-white disabled:opacity-60">
            {stage === "verifying" ? "Verifying…" : "Confirm code"}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-amber-300">· Unverified</span>
          <button type="button" disabled={!savedPhone || stage === "sending" || stage === "success"} onClick={beginVerification} className="rounded-full border border-orange-400/40 px-4 py-2 text-xs font-black text-orange-300 transition hover:bg-orange-400/10 disabled:cursor-not-allowed disabled:opacity-50">
            {stage === "sending" ? "Sending code…" : stage === "success" ? "Verified" : "Verify now"}
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs font-semibold leading-5 text-red-400">{error}</p>}
      <div id="firebase-phone-recaptcha" />
    </div>
  );
}
