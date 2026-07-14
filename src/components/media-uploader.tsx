"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { ImageWithFallback } from "@/components/image-with-fallback";
import { PendingOverlay } from "@/components/pending-feedback";
import type { SupportedMediaPurpose } from "@/server/media/policy";

type SignResult = {
  ok: boolean; message?: string; cloudName?: string; apiKey?: string; timestamp?: number;
  publicId?: string; overwrite?: boolean; deliveryType?: string; signature?: string; maxBytes?: number;
};

export function MediaUploader({
  purpose,
  communitySlug,
  rideId,
  bookingPaymentId,
  currentAsset,
  label,
  help,
  removeOnly = false,
  fallbackUrl,
}: {
  purpose: SupportedMediaPurpose;
  communitySlug?: string;
  rideId?: string;
  bookingPaymentId?: string;
  currentAsset?: { id: string; url: string } | null;
  label: string;
  help: string;
  removeOnly?: boolean;
  fallbackUrl?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Uploading image…");
  const [error, setError] = useState("");
  const [payerReference, setPayerReference] = useState("");
  const [previews, setPreviews] = useState<Array<{ name: string; url: string }>>([]);
  const galleryPurpose = purpose === "GUILD_GALLERY" || purpose === "RIDE_GALLERY";
  useEffect(() => () => { previews.forEach((preview) => URL.revokeObjectURL(preview.url)); }, [previews]);
  const previewClass = purpose === "USER_AVATAR" || purpose === "GUILD_LOGO"
    ? "aspect-square w-40"
    : purpose === "GUILD_COVER" || purpose === "RIDE_COVER"
      ? "aspect-[16/6] w-full max-w-xl"
      : "aspect-[4/3] w-64 max-w-full";

  async function upload() {
    const files = Array.from(inputRef.current?.files ?? []);
    if (!files.length) return setError("Choose at least one image first.");
    if (purpose === "PAYMENT_PROOF" && payerReference.trim().length < 6) return setError("Enter the UTR or UPI Transaction ID shown in your payment app.");
    if (files.some((file) => !new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type))) return setError("Use only JPEG, PNG, or WebP images.");
    if (galleryPurpose && files.length > 12) return setError("Select no more than 12 images at once.");
    setBusyLabel(`Uploading ${files.length === 1 ? label.toLowerCase() : `${files.length} images`}…`);
    setBusy(true);
    setError("");
    try {
      for (const file of files) {
        const signResponse = await fetch("/api/media/sign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ purpose, communitySlug, rideId, bookingPaymentId }) });
        const signed = await signResponse.json() as SignResult;
        if (!signResponse.ok || !signed.ok || !signed.cloudName || !signed.apiKey || !signed.timestamp || !signed.publicId || !signed.deliveryType || !signed.signature || !signed.maxBytes) throw new Error(signed.message ?? "Unable to authorize this upload.");
        if (file.size > signed.maxBytes) throw new Error(`${file.name} is larger than ${Math.round(signed.maxBytes / 1024 / 1024)} MB.`);
        const form = new FormData();
        form.set("file", file); form.set("api_key", signed.apiKey); form.set("timestamp", String(signed.timestamp)); form.set("public_id", signed.publicId); form.set("overwrite", "false"); form.set("type", signed.deliveryType); form.set("signature", signed.signature);
        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`, { method: "POST", body: form });
        const uploaded = await uploadResponse.json() as { public_id?: string; error?: { message?: string } };
        if (!uploadResponse.ok || !uploaded.public_id) throw new Error(uploaded.error?.message ?? `Cloudinary could not upload ${file.name}.`);
        const completeResponse = await fetch("/api/media/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ purpose, communitySlug, rideId, bookingPaymentId, publicId: uploaded.public_id, payerReference: purpose === "PAYMENT_PROOF" ? payerReference.trim() : undefined }) });
        const completed = await completeResponse.json() as { ok: boolean; message?: string };
        if (!completeResponse.ok || !completed.ok) throw new Error(completed.message ?? `Unable to save ${file.name}.`);
      }
      window.location.reload();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload the image.");
      setBusy(false);
    }
  }

  function previewSelection() {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    const files = Array.from(inputRef.current?.files ?? []);
    setPreviews(files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })));
    setError("");
  }

  async function remove() {
    if (!currentAsset) return;
    setBusyLabel(`Removing ${label.toLowerCase()}…`);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/media/remove", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: currentAsset.id, communitySlug, rideId, bookingPaymentId }),
      });
      const result = await response.json() as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to remove the image.");
      window.location.reload();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove the image.");
      setBusy(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/15 p-5">
      <PendingOverlay show={busy} label={busyLabel} />
      <p className="text-sm font-black text-white">{label}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{help}</p>
      {(currentAsset?.url || fallbackUrl) && <ImageWithFallback src={currentAsset?.url ?? fallbackUrl!} fallbackSrc={fallbackUrl ?? "/defaults/guild-avatar.png"} alt={currentAsset ? label : `Default ${label.toLowerCase()}`} width={640} height={360} className={`mt-4 rounded-2xl bg-white/[.035] object-contain ${previewClass}`} />}
      {purpose === "PAYMENT_PROOF" && <label className="mt-4 block text-xs font-bold text-zinc-300">UTR or UPI Transaction ID<input value={payerReference} onChange={(event) => setPayerReference(event.target.value)} minLength={6} maxLength={80} placeholder="For example: 624518739201" className="field mt-2 py-2.5 text-sm" /></label>}
      {!removeOnly && <input ref={inputRef} type="file" multiple={galleryPurpose} accept="image/jpeg,image/png,image/webp" onChange={previewSelection} className="mt-4 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:font-bold file:text-white" />}
      {!!previews.length && <div className={`mt-4 grid gap-3 ${galleryPurpose ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1"}`}>{previews.map((preview) => <div key={preview.url}><Image src={preview.url} alt={`Selected preview: ${preview.name}`} width={320} height={240} unoptimized className={`${galleryPurpose ? "aspect-[4/3] w-full" : previewClass} rounded-2xl bg-white/[.035] object-contain`} /><p className="mt-1 truncate text-[10px] text-zinc-600">{preview.name}</p></div>)}</div>}
      <div className="mt-4 flex flex-wrap gap-2">
        {!removeOnly && <button type="button" onClick={upload} disabled={busy} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{previews.length > 1 ? `Upload ${previews.length} images` : currentAsset ? "Replace image" : "Upload image"}</button>}
        {currentAsset && <button type="button" onClick={remove} disabled={busy} className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-bold text-red-300 disabled:opacity-50">Remove</button>}
      </div>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-400">{error}</p>}
    </div>
  );
}
