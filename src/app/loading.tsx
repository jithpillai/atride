export default function Loading() {
  return <div className="grid min-h-[65vh] place-items-center" aria-live="polite" aria-busy="true"><div className="flex items-center gap-3 rounded-full border border-orange-400/20 bg-black/50 px-5 py-3 text-sm font-bold text-white"><span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-orange-200/30 border-t-orange-400" />Loading page…</div></div>;
}
