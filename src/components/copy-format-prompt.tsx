"use client";

import { useState } from "react";

export function CopyFormatPrompt({ section, format, example, rideContext }: { section: string; format: string; example: string; rideContext: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const prompt = `Create content for the AtRide “${section}” field using the saved Ride Studio details below as the primary source. An original WhatsApp or ride announcement is optional supplemental context.\n\nSaved Ride Studio details:\n${rideContext}\n\nRequired output format — return only one record per line, with no bullets, headings, markdown table, code fence, or explanation:\n${format}\n\nExample:\n${example}\n\nUse only facts present in the saved details or optional announcement. Do not invent missing prices, properties, dates, inclusions, activities, or policies. When a required fact is unavailable, write “To be confirmed”. Reconcile duplicate wording, but do not replace a saved AtRide fact with a conflicting announcement value.\n\nOptional original WhatsApp or ride announcement:\n[OPTIONAL — PASTE THE ORIGINAL MESSAGE HERE, OR LEAVE THIS SECTION EMPTY]`;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <button type="button" onClick={copy} className="mt-3 rounded-full border border-orange-400/30 bg-orange-400/[.06] px-4 py-2 text-xs font-black text-orange-300 transition hover:bg-orange-400/15">{copied ? "Copied ✓" : "Copy prompt for Gemini"}</button>;
}
