"use client";

import { useState } from "react";

export function ShareParticipantList({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <div className="rounded-3xl border border-emerald-400/15 bg-emerald-400/[.035] p-6">
    <p className="eyebrow text-emerald-300">Quick sharing</p>
    <h2 className="mt-3 text-xl font-black">Numbered WhatsApp list</h2>
    <p className="mt-2 text-sm leading-6 text-zinc-500">Only confirmed participant names, starting cities, roles, and diet preferences are included. Phone, medical, emergency, vehicle, and payment details stay out of WhatsApp.</p>
    <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/8 bg-black/20 p-4 text-xs leading-6 text-zinc-300">{message}</pre>
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" onClick={copy} className="cursor-pointer rounded-full border border-white/15 px-5 py-2.5 text-sm font-black hover:border-white/30">{copied ? "Copied" : "Copy list"}</button>
      <a href={shareUrl} target="_blank" rel="noreferrer" className="cursor-pointer rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-black text-black hover:bg-emerald-400">Open WhatsApp</a>
    </div>
  </div>;
}
