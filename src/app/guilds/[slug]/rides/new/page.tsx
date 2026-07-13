import Link from "next/link";

import { CreateRideDraftForm } from "@/components/create-ride-draft-form";
import { requireRideManager } from "@/server/auth/authorization";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "Create ride draft", robots: { index: false, follow: false } };

function localDate(days: number, hour: number) {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(hour, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:00`;
}

export default async function NewRidePage({ params }: Props) {
  const { slug } = await params;
  await requireRideManager(slug);
  return <section className="mx-auto min-h-[70vh] max-w-4xl px-5 py-16 lg:px-8">
    <Link href={`/guilds/${slug}/manage`} className="text-sm font-bold text-zinc-500 hover:text-white">← Guild workspace</Link>
    <p className="eyebrow mt-10">Phase 4 · Ride studio</p><h1 className="mt-3 text-4xl font-black tracking-tight">Create a ride draft</h1>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">Start with the public identity and dates. The complete package, origins, accommodation, rules, and publishing checks follow in the editor.</p>
    <CreateRideDraftForm guildSlug={slug} defaults={{ title: "", slug: "", summary: "", originCity: "", destination: "", startsAt: localDate(30, 5), endsAt: localDate(32, 20) }} />
  </section>;
}
