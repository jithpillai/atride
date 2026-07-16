"use client";

import { useMemo, useState } from "react";

import { buildExternalRideAssistantPrompt, parseRideAssistantInput, type RideAssistantDraft, type RideAssistantFormInput } from "@/server/ai/ride-assistant";

type DraftField = Exclude<keyof RideAssistantDraft, "missingFacts">;
type ApiResult = { ok: boolean; message?: string; draft?: RideAssistantDraft; usage?: { inputTokens?: number; outputTokens?: number }; remaining?: { user: number; ride: number } };

const fields: Array<{ key: DraftField; label: string; rows: number }> = [
  { key: "description", label: "Public description", rows: 6 },
  { key: "origins", label: "Starting groups", rows: 5 },
  { key: "itinerary", label: "Day-wise itinerary", rows: 7 },
  { key: "roomSummary", label: "Room and occupancy summary", rows: 3 },
  { key: "amenities", label: "Amenities", rows: 2 },
  { key: "participantNote", label: "Accommodation instructions", rows: 3 },
  { key: "inclusions", label: "Inclusions", rows: 5 },
  { key: "exclusions", label: "Exclusions", rows: 5 },
  { key: "addOns", label: "Optional add-ons", rows: 4 },
  { key: "meals", label: "Meals", rows: 5 },
  { key: "activities", label: "Activities and sightseeing", rows: 5 },
];

const assistantSectionForField: Record<DraftField, string> = {
  description: "description", origins: "origins", itinerary: "itinerary", roomSummary: "accommodation", amenities: "accommodation", participantNote: "accommodation",
  inclusions: "inclusions", exclusions: "exclusions", addOns: "addOns", meals: "meals", activities: "activities",
};

const inputNames: Array<keyof RideAssistantFormInput> = [
  "title", "summary", "description", "destination", "startsAt", "endsAt", "price", "confirmationDeposit", "totalSlots", "waitlistCapacity", "distanceKm", "vehicleType", "vehicleRequirements", "difficulty", "origins", "itinerary", "propertyName", "propertyLocality", "checkInAt", "checkOutAt", "roomSummary", "amenities", "participantNote", "inclusions", "exclusions", "addOns", "meals", "activities",
];

function formValues(form: HTMLFormElement) {
  const data = new FormData(form);
  return parseRideAssistantInput(Object.fromEntries(inputNames.map((name) => [name, String(data.get(name) ?? "")])));
}

function setFormValue(form: HTMLFormElement, name: string, value: string) {
  const element = form.elements.namedItem(name);
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) return;
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export function RideAiAssistant({ guildSlug, rideId, enabled }: { guildSlug: string; rideId: string; enabled: boolean }) {
  const [sourceAnnouncement, setSourceAnnouncement] = useState("");
  const [draft, setDraft] = useState<RideAssistantDraft | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [remaining, setRemaining] = useState<{ user: number; ride: number } | null>(null);
  const selectedCount = useMemo(() => fields.filter(({ key }) => selected[key]).length, [selected]);

  function containingForm(element: HTMLElement) {
    const form = element.closest("form");
    if (!(form instanceof HTMLFormElement)) throw new Error("The Ride Studio form is unavailable.");
    return form;
  }

  async function generate(event: React.MouseEvent<HTMLButtonElement>, requestedField?: DraftField) {
    setPending(true); setError(""); setNotice("");
    try {
      const form = containingForm(event.currentTarget);
      const requestedSections = requestedField ? [assistantSectionForField[requestedField]] : undefined;
      const response = await fetch("/api/rides/assistant/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ guildSlug, rideId, ride: formValues(form), sourceAnnouncement, requestedSections }) });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.ok || !result.draft) throw new Error(result.message ?? "The Ride Assistant could not generate content.");
      if (requestedField) {
        setDraft((current) => current ? { ...current, [requestedField]: result.draft?.[requestedField] ?? current[requestedField], missingFacts: result.draft?.missingFacts ?? current.missingFacts } : result.draft ?? null);
        setSelected((current) => ({ ...current, [requestedField]: Boolean(result.draft?.[requestedField]?.trim()) }));
      } else {
        setDraft(result.draft);
        setSelected(Object.fromEntries(fields.map(({ key }) => [key, Boolean(result.draft?.[key]?.trim())])));
      }
      setRemaining(result.remaining ?? null);
      setNotice(requestedField ? `${fields.find(({ key }) => key === requestedField)?.label ?? "Section"} regenerated. Review it before applying.` : "Draft ready. Review every selected section before applying it to the form.");
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "The Ride Assistant could not generate content.");
    } finally { setPending(false); }
  }

  async function copyPrompt(event: React.MouseEvent<HTMLButtonElement>, openGemini: boolean) {
    setError("");
    try {
      const form = containingForm(event.currentTarget);
      const geminiWindow = openGemini ? window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer") : null;
      await navigator.clipboard.writeText(buildExternalRideAssistantPrompt(formValues(form), sourceAnnouncement));
      setNotice(openGemini ? "Complete prompt copied. Paste it into the Gemini window that opened." : "Complete Gemini prompt copied.");
      if (openGemini && !geminiWindow) setNotice("Prompt copied, but the browser blocked the Gemini window. Open gemini.google.com and paste it there.");
    } catch { setError("The browser could not copy the prompt. Check clipboard permission and try again."); }
  }

  function updateDraft(key: DraftField, value: string) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  }

  function apply(event: React.MouseEvent<HTMLButtonElement>) {
    if (!draft) return;
    const form = containingForm(event.currentTarget);
    for (const { key } of fields) if (selected[key] && draft[key].trim()) setFormValue(form, key, draft[key]);
    setNotice(`${selectedCount} reviewed section${selectedCount === 1 ? "" : "s"} applied to the unsaved form. Use “Save complete ride package” when ready.`);
    setDraft(null);
  }

  return <section className="relative rounded-3xl border border-orange-400/25 bg-orange-400/[.035] p-7">
    {pending && <div className="absolute inset-0 z-20 grid place-items-center rounded-3xl bg-[#0b0f12]/85 backdrop-blur-sm"><div className="text-center"><span className="mx-auto block size-7 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" /><p className="mt-3 text-sm font-black text-orange-200">Generating a structured ride draft…</p></div></div>}
    <p className="eyebrow">4 · @Ride AI assistant</p>
    <h2 className="mt-3 text-2xl font-black">Generate the remaining ride content</h2>
    <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400"><strong className="text-zinc-200">How it works:</strong> @Ride uses the factual fields above and Guild policy context to draft starting groups, itinerary, stay notes, meals, activities, inclusions, and exclusions. Missing facts are flagged instead of intentionally invented. Suggestions are never saved automatically—review and apply them first.</p>
    <label className="mt-6 block text-sm font-semibold">Optional original WhatsApp or ride announcement<textarea name="aiSourceAnnouncement" value={sourceAnnouncement} onChange={(event) => setSourceAnnouncement(event.target.value)} rows={7} className="field" placeholder="Paste an existing organizer announcement to extract factual ride details. Leave empty when the fields above already contain everything known." /></label>
    <p className="mt-3 text-xs leading-6 text-amber-300/80">Before pasting, remove participant names, phone numbers, medical information, payment evidence, and private invite links. @Ride also filters common identifiers before an internal AI request.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" disabled={!enabled || pending} onClick={(event) => generate(event)} className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">Generate with @Ride AI</button>
      <button type="button" disabled={pending} onClick={(event) => copyPrompt(event, false)} className="rounded-full border border-orange-400/30 px-5 py-3 text-sm font-black text-orange-200">Copy complete prompt</button>
      <button type="button" disabled={pending} onClick={(event) => copyPrompt(event, true)} className="rounded-full border border-white/15 px-5 py-3 text-sm font-black">Copy prompt &amp; open Gemini ↗</button>
    </div>
    {!enabled && <p className="mt-4 text-sm font-semibold text-amber-300">Internal generation is disabled in this environment. The external Gemini actions remain available.</p>}
    <p className="mt-4 text-xs leading-6 text-zinc-500"><strong className="text-zinc-400">Using Gemini directly:</strong> the complete prompt is copied to your clipboard and Gemini opens separately. Paste it there. Gemini cannot automatically return its response to @Ride, so review and copy the result back manually.</p>
    {error && <p role="alert" className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-semibold text-red-300">{error}</p>}
    {notice && <p aria-live="polite" className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-300">{notice}</p>}
    {remaining && <p className="mt-3 text-xs text-zinc-600">Daily generation allowance remaining: {remaining.ride} for this ride, {remaining.user} for your account.</p>}

    {draft && <div className="mt-8 border-t border-white/10 pt-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Review before applying</p><h3 className="mt-2 text-xl font-black">Select only accurate sections</h3></div><button type="button" disabled={!selectedCount} onClick={apply} className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-black disabled:opacity-40">Apply {selectedCount || "selected"} to form</button></div>
      {!!draft.missingFacts.length && <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-4"><p className="text-sm font-black text-amber-300">Needs organizer confirmation</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-6 text-amber-100/70">{draft.missingFacts.map((fact, index) => <li key={`${fact}-${index}`}>{fact}</li>)}</ul></div>}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">{fields.map(({ key, label, rows }) => <div key={key} className="rounded-2xl border border-white/10 bg-black/10 p-4"><div className="flex items-center justify-between gap-3"><label className="flex items-center gap-3 text-sm font-black"><input type="checkbox" checked={Boolean(selected[key])} disabled={!draft[key].trim()} onChange={(event) => setSelected((current) => ({ ...current, [key]: event.target.checked }))} className="size-5 accent-orange-500" />{label}</label><button type="button" disabled={!enabled || pending} onClick={(event) => generate(event, key)} className="rounded-full border border-orange-400/25 px-3 py-1.5 text-[11px] font-black text-orange-200 disabled:opacity-40">Regenerate</button></div><textarea value={draft[key]} onChange={(event) => updateDraft(key, event.target.value)} rows={rows} className="field mt-3 font-mono text-xs" placeholder="No content generated for this section." /></div>)}</div>
    </div>}
  </section>;
}
