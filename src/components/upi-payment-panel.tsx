"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { buildUpiPaymentUri, upiPaymentNote, upiTransactionReference } from "@/lib/upi";

export function UpiPaymentPanel({
  paymentId,
  vpa,
  payeeName,
  amountPaise,
  rideTitle,
  participantName,
  instructions,
}: {
  paymentId: string;
  vpa: string;
  payeeName: string;
  amountPaise: number;
  rideTitle: string;
  participantName: string;
  instructions?: string | null;
}) {
  const [copied, setCopied] = useState<"vpa" | "amount" | null>(null);
  const amount = (amountPaise / 100).toFixed(2);
  const transactionReference = upiTransactionReference(paymentId);
  const uri = useMemo(() => buildUpiPaymentUri({
    vpa,
    payeeName,
    amountPaise,
    transactionReference,
    note: upiPaymentNote(participantName, rideTitle),
  }), [amountPaise, participantName, payeeName, rideTitle, transactionReference, vpa]);

  async function copy(value: string, field: "vpa" | "amount") {
    await navigator.clipboard.writeText(value);
    setCopied(field);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return <section className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-400/[.035] p-4">
    <p className="text-xs font-black uppercase tracking-wider text-orange-300">Pay directly to the Guild</p>
    <div className="mt-4 grid gap-5">
      <div className="w-fit rounded-2xl bg-white p-3" aria-label="UPI payment QR code">
        <QRCodeSVG value={uri} size={120} level="M" includeMargin={false} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-black text-white">{payeeName}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2"><code className="break-all text-xs text-zinc-300">{vpa}</code><button type="button" onClick={() => copy(vpa, "vpa")} className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-black">{copied === "vpa" ? "Copied" : "Copy UPI ID"}</button></div>
        <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-lg font-black text-white">₹{Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span><button type="button" onClick={() => copy(amount, "amount")} className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-black">{copied === "amount" ? "Copied" : "Copy amount"}</button></div>
        <a href={uri} className="mt-4 inline-flex rounded-full bg-orange-500 px-5 py-3 text-xs font-black text-white hover:bg-orange-400">Open any UPI app</a>
      </div>
    </div>
    {instructions && <p className="mt-4 whitespace-pre-line text-xs leading-5 text-zinc-400">{instructions}</p>}
    <p className="mt-4 text-xs font-bold leading-5 text-amber-300">Before authorizing, verify that your UPI app shows <strong>{payeeName}</strong> and exactly ₹{Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}. @Ride never receives this money.</p>
    <p className="mt-2 text-[11px] leading-5 text-zinc-500">After payment, enter the bank-generated UTR or UPI Transaction ID in the proof form below. The QR&apos;s @Ride reference is only for matching this booking.</p>
  </section>;
}
