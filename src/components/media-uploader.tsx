"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { PendingOverlay } from "@/components/pending-feedback";
import type { SupportedMediaPurpose } from "@/server/media/policy";

type SignResult = {
  ok: boolean; message?: string; cloudName?: string; apiKey?: string; timestamp?: number;
  publicId?: string; overwrite?: boolean; deliveryType?: string; signature?: string; maxBytes?: number;
};

export function MediaUploader({
  purpose,
  communitySlug,
  currentAsset,
  label,
  help,
  removeOnly = false,
}: {
  purpose: SupportedMediaPurpose;
  communitySlug?: string;
  currentAsset?: { id: string; url: string } | null;
  label: string;
  help: string;
  removeOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Uploading image…");
  const [error, setError] = useState("");

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return setError("Choose an image first.");
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) return setError("Use a JPEG, PNG, or WebP image.");
    setBusyLabel(`Uploading ${label.toLowerCase()}…`);
    setBusy(true);
    setError("");
    try {
      const signResponse = await fetch("/api/media/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ purpose, communitySlug }),
      });
      const signed = await signResponse.json() as SignResult;
      if (!signResponse.ok || !signed.ok || !signed.cloudName || !signed.apiKey || !signed.timestamp || !signed.publicId || !signed.deliveryType || !signed.signature || !signed.maxBytes) {
        throw new Error(signed.message ?? "Unable to authorize this upload.");
      }
      if (file.size > signed.maxBytes) throw new Error(`This image is larger than ${Math.round(signed.maxBytes / 1024 / 1024)} MB.`);
      const form = new FormData();
      form.set("file", file);
      form.set("api_key", signed.apiKey);
      form.set("timestamp", String(signed.timestamp));
      form.set("public_id", signed.publicId);
      form.set("overwrite", "false");
      form.set("type", signed.deliveryType);
      form.set("signature", signed.signature);
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`, { method: "POST", body: form });
      const uploaded = await uploadResponse.json() as { public_id?: string; error?: { message?: string } };
      if (!uploadResponse.ok || !uploaded.public_id) throw new Error(uploaded.error?.message ?? "Cloudinary could not upload the image.");
      const completeResponse = await fetch("/api/media/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ purpose, communitySlug, publicId: uploaded.public_id }),
      });
      const completed = await completeResponse.json() as { ok: boolean; message?: string };
      if (!completeResponse.ok || !completed.ok) throw new Error(completed.message ?? "Unable to save the uploaded image.");
      window.location.reload();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload the image.");
      setBusy(false);
    }
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
        body: JSON.stringify({ assetId: currentAsset.id, communitySlug }),
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
      {currentAsset && <Image src={currentAsset.url} alt={label} width={640} height={360} className="mt-4 max-h-52 w-full rounded-2xl object-cover" />}
      {!removeOnly && <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="mt-4 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:font-bold file:text-white" />}
      <div className="mt-4 flex flex-wrap gap-2">
        {!removeOnly && <button type="button" onClick={upload} disabled={busy} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{currentAsset ? "Replace image" : "Upload image"}</button>}
        {currentAsset && <button type="button" onClick={remove} disabled={busy} className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-bold text-red-300 disabled:opacity-50">Remove</button>}
      </div>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-400">{error}</p>}
    </div>
  );
}
