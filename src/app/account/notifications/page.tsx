import Link from "next/link";
import { redirect } from "next/navigation";

import { FormPendingSubmit } from "@/components/pending-feedback";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/server/auth/session";
import { markAllNotificationsRead, markNotificationRead } from "@/server/notifications/inbox-actions";

export const metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default async function NotificationCentrePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const items = await db.notificationInboxItem.findMany({
    where: { recipientUserId: session.userId },
    include: { community: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = items.filter((item) => !item.readAt).length;

  return <section className="mx-auto min-h-[70vh] max-w-4xl px-5 py-16 lg:px-8">
    <Link href="/account" className="text-sm font-bold text-zinc-400 transition hover:text-white">← Account</Link>
    <div className="mt-8 flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="eyebrow">Notification centre</p><h1 className="mt-3 text-4xl font-black tracking-tight">Ride updates and actions</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">A compact operational inbox—not a permanent message archive. Booking, payment, and ride records remain available in their canonical pages.</p></div>
      {unread > 0 && <form action={markAllNotificationsRead} className="relative"><FormPendingSubmit idleLabel={`Mark all ${unread} read`} pendingLabel="Updating…" overlayLabel="Updating notifications…" className="rounded-full border border-orange-400/30 px-5 py-2.5 text-sm font-black text-orange-300" /></form>}
    </div>

    <div className="mt-8 grid gap-4">
      {items.length ? items.map((item) => <article key={item.id} className={`rounded-3xl border p-6 ${item.readAt ? "border-white/10 bg-white/[.02]" : "border-orange-400/25 bg-orange-400/[.045]"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className={`size-2 rounded-full ${item.readAt ? "bg-zinc-700" : "bg-orange-400"}`} aria-hidden="true" /><p className="text-xs font-bold uppercase tracking-[.16em] text-zinc-500">{item.community.name}</p></div>
            <h2 className="mt-3 text-lg font-black text-white">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{item.body}</p>
            <p className="mt-3 text-xs text-zinc-600">{item.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {item.actionUrl && <Link href={item.actionUrl} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-white transition hover:bg-orange-400">Open</Link>}
            {!item.readAt && <form action={markNotificationRead} className="relative"><input type="hidden" name="notificationId" value={item.id} /><FormPendingSubmit idleLabel="Mark read" pendingLabel="Saving…" overlayLabel="Updating notification…" className="rounded-full border border-white/15 px-4 py-2 text-xs font-black text-zinc-300" /></form>}
          </div>
        </div>
      </article>) : <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center"><p className="text-xl font-black">No notifications yet</p><p className="mt-2 text-sm text-zinc-500">Booking, payment, waitlist, and important ride updates will appear here.</p></div>}
    </div>
    <p className="mt-8 text-xs leading-5 text-zinc-600">Read ordinary items are removed after 30 days; unread ordinary items after 90 days. Critical unresolved actions will be retained until acknowledged or resolved.</p>
  </section>;
}
