"use client";

import { useFormStatus } from "react-dom";

export function PendingOverlay({ show, label, fixed = false }: { show: boolean; label: string; fixed?: boolean }) {
  if (!show) return null;
  return (
    <div className={`${fixed ? "fixed" : "absolute"} inset-0 z-50 grid place-items-center bg-[#101419]/85 backdrop-blur-sm`} aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3 rounded-full border border-orange-400/20 bg-black/50 px-5 py-3 text-sm font-bold text-white shadow-xl">
        <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-orange-200/30 border-t-orange-400" />
        {label}
      </div>
    </div>
  );
}

export function FormPendingSubmit({
  idleLabel,
  pendingLabel,
  overlayLabel = pendingLabel,
  className,
}: {
  idleLabel: string;
  pendingLabel: string;
  overlayLabel?: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <PendingOverlay show={pending} label={overlayLabel} />
      <button type="submit" disabled={pending} className={`${className} disabled:cursor-wait disabled:opacity-60`}>
        {pending ? pendingLabel : idleLabel}
      </button>
    </>
  );
}
