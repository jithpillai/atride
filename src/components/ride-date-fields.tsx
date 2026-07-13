"use client";

import { useRef } from "react";

function shiftLocal(value: string, deltaMs: number) {
  if (!value) return value;
  const shifted = new Date(new Date(value).getTime() + deltaMs);
  const local = new Date(shifted.getTime() - shifted.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function RideDateFields({ startsAt, endsAt, registrationClosesAt, balanceDueAt, commercial = false }: {
  startsAt: string; endsAt: string; registrationClosesAt?: string; balanceDueAt?: string; commercial?: boolean;
}) {
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const registrationRef = useRef<HTMLInputElement>(null);
  const balanceRef = useRef<HTMLInputElement>(null);
  const previousStart = useRef(startsAt);
  const previousRegistration = useRef(registrationClosesAt ?? "");

  function updateRelatedDates() {
    const nextStart = startRef.current?.value ?? "";
    const previous = previousStart.current;
    if (!nextStart) return;
    const delta = previous ? new Date(nextStart).getTime() - new Date(previous).getTime() : 0;
    if (endRef.current) {
      if (!endRef.current.value) endRef.current.value = nextStart;
      else if (delta) endRef.current.value = shiftLocal(endRef.current.value, delta);
      endRef.current.min = nextStart;
    }
    for (const input of [registrationRef.current, balanceRef.current]) {
      if (!input) continue;
      if (input.value && delta) input.value = shiftLocal(input.value, delta);
      input.max = nextStart;
    }
    previousStart.current = nextStart;
  }

  function mirrorRegistrationToBalance() {
    const nextRegistration = registrationRef.current?.value ?? "";
    if (balanceRef.current && (!balanceRef.current.value || balanceRef.current.value === previousRegistration.current)) {
      balanceRef.current.value = nextRegistration;
    }
    previousRegistration.current = nextRegistration;
  }

  return <>
    <label className="text-sm font-semibold">Starts<input ref={startRef} required type="datetime-local" name="startsAt" defaultValue={startsAt} onFocus={() => { previousStart.current = startRef.current?.value ?? startsAt; }} onChange={updateRelatedDates} className="field" /></label>
    <label className="text-sm font-semibold">Ends<input ref={endRef} required type="datetime-local" name="endsAt" min={startsAt} defaultValue={endsAt} className="field" /><span className="mt-1 block text-xs font-normal text-zinc-600">Moves with the start date; edit it for shorter or longer rides.</span></label>
    {commercial && <>
      <label className="text-sm font-semibold">Registration closes<input ref={registrationRef} type="datetime-local" name="registrationClosesAt" max={startsAt} defaultValue={registrationClosesAt} onFocus={() => { previousRegistration.current = registrationRef.current?.value ?? ""; }} onChange={mirrorRegistrationToBalance} className="field" /><span className="mt-1 block text-xs font-normal text-zinc-600">Pre-filled five days before departure.</span></label>
      <label className="text-sm font-semibold">Balance due<input ref={balanceRef} type="datetime-local" name="balanceDueAt" max={startsAt} defaultValue={balanceDueAt} className="field" /><span className="mt-1 block text-xs font-normal text-zinc-600">Defaults to registration close; edit it when the payment schedule differs.</span></label>
    </>}
  </>;
}
