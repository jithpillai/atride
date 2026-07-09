import type { Metadata } from "next";

import { MockEmailLogin } from "@/components/mock-email-login";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_25%,rgba(255,90,24,.18),transparent_25rem)]" />
      <div className="mx-auto grid min-h-[72vh] max-w-5xl items-center gap-12 px-5 py-16 md:grid-cols-2 lg:px-8">
        <div><p className="eyebrow">One rider identity</p><h1 className="mt-4 text-5xl font-black tracking-[-.05em]">Every Guild.<br /><span className="text-orange-500">Every role.</span></h1><p className="mt-6 max-w-md text-base leading-8 text-zinc-400">Your AtRide account will keep bookings, captain assignments, ride progress, and private Ride Passport history together without making your profile public.</p></div>
        <MockEmailLogin />
      </div>
    </section>
  );
}
