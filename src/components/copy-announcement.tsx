"use client";

import { useState } from "react";

export function CopyAnnouncement({ content, stale }: { content: string; stale: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <div className="mt-5">
    {stale && <p className="mb-3 rounded-xl border border-amber-400/20 bg-amber-400/[.06] p-3 text-xs font-semibold text-amber-300">Ride details changed after this announcement was generated. Regenerate it before sharing.</p>}
    <textarea readOnly value={content} rows={18} className="field font-mono text-xs leading-6" />
    <button type="button" onClick={copy} className="mt-3 rounded-full border border-orange-400/30 px-5 py-2.5 text-sm font-black text-orange-300">{copied ? "Copied ✓" : "Copy WhatsApp-ready announcement"}</button>
  </div>;
}
