"use client";

import { useActionState } from "react";

import { FormPendingSubmit } from "@/components/pending-feedback";
import { RideDateFields } from "@/components/ride-date-fields";
import { createRideDraft, type CreateRideDraftState } from "@/server/ride/actions";

type Values = NonNullable<CreateRideDraftState["values"]>;

export function CreateRideDraftForm({ guildSlug, defaults }: { guildSlug: string; defaults: Values }) {
  const [state, action] = useActionState(createRideDraft, { values: defaults });
  const values = state.values ?? defaults;
  return <>
    {state.error && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">{state.error}</p>}
    <form action={action} className="relative mt-8 rounded-3xl border border-white/10 bg-white/[.025] p-7">
      <input type="hidden" name="guildSlug" value={guildSlug} />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold sm:col-span-2">Ride title<input required minLength={5} maxLength={180} name="title" defaultValue={values.title} placeholder="Agumbe Monsoon Trail" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
        <label className="text-sm font-semibold sm:col-span-2">URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" minLength={3} maxLength={100} name="slug" defaultValue={values.slug} placeholder="agumbe-monsoon-trail" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /><span className="mt-1 block text-xs font-normal text-zinc-600">Lowercase letters, numbers, and hyphens. For example: agumbe2026 or agumbe-2026.</span></label>
        <label className="text-sm font-semibold sm:col-span-2">Short summary<textarea required minLength={20} maxLength={1000} rows={3} name="summary" defaultValue={values.summary} placeholder="A three-day guided ride through the Western Ghats…" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
        <label className="text-sm font-semibold">Primary starting city<input required name="originCity" defaultValue={values.originCity} placeholder="Bengaluru" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
        <label className="text-sm font-semibold">Destination<input required name="destination" defaultValue={values.destination} placeholder="Agumbe" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-orange-500" /></label>
        <RideDateFields startsAt={values.startsAt} endsAt={values.endsAt} />
      </div>
      <FormPendingSubmit idleLabel="Create draft and continue" pendingLabel="Creating…" overlayLabel="Creating ride draft…" className="mt-7 rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white" />
    </form>
  </>;
}
