"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { PendingOverlay } from "@/components/pending-feedback";

export function CopyGuildJoinLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/join/${token}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <button type="button" onClick={copy} className="rounded-full border border-orange-400/30 px-4 py-2 text-xs font-black text-orange-300 hover:bg-orange-500/10">{copied ? "Copied" : "Copy invitation link"}</button>;
}

export function AutoJoinSubmit() {
  const { pending } = useFormStatus();
  const button = useRef<HTMLButtonElement>(null);
  const triggered = useRef(false);
  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    button.current?.click();
  }, []);
  return <><PendingOverlay show={pending} label="Adding you to the Guild…" fixed /><button ref={button} type="submit" className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white">{pending ? "Joining…" : "Join Guild"}</button></>;
}
