import Link from "next/link";
import { redirect } from "next/navigation";

import { FormPendingSubmit } from "@/components/pending-feedback";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/server/auth/session";
import { updateNotificationPreferences } from "@/server/notifications/preference-actions";

export const metadata = { title: "Notification preferences", robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{ saved?: string }> };

export default async function NotificationPreferencesPage({ searchParams }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?returnTo=%2Faccount%2Fnotifications%2Fpreferences");
  const [preferences, state] = await Promise.all([
    db.userNotificationPreference.findUnique({ where: { userId: session.userId } }),
    searchParams,
  ]);
  const emailRideReminders = preferences?.emailRideReminders ?? true;
  const emailRoutineAnnouncements = preferences?.emailRoutineAnnouncements ?? true;

  return <section className="mx-auto min-h-[70vh] max-w-3xl px-5 py-16 lg:px-8">
    <Link href="/account/notifications" className="text-sm font-bold text-zinc-400 transition hover:text-white">← Notifications</Link>
    <div className="mt-8 border-b border-white/10 pb-8"><p className="eyebrow">Communication preferences</p><h1 className="mt-3 text-4xl font-black tracking-tight">Choose optional email</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-500">Your @Ride inbox remains the canonical notification centre. These controls reduce optional email only; they never suppress booking, payment, waitlist, cancellation, important, critical, or safety messages.</p></div>
    {state.saved && <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.07] p-4 text-sm font-bold text-emerald-300">Notification preferences saved.</p>}
    <form action={updateNotificationPreferences} className="relative mt-8 rounded-3xl border border-white/10 bg-white/[.025] p-7">
      <div className="grid gap-4">
        <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-white/10 p-5"><input type="checkbox" name="emailRideReminders" defaultChecked={emailRideReminders} className="mt-1 size-5 accent-orange-500" /><span><strong className="block text-white">Upcoming-ride reminder email</strong><span className="mt-1 block text-sm leading-6 text-zinc-500">Email me during the daily reminder window before a confirmed ride.</span></span></label>
        <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-white/10 p-5"><input type="checkbox" name="emailRoutineAnnouncements" defaultChecked={emailRoutineAnnouncements} className="mt-1 size-5 accent-orange-500" /><span><strong className="block text-white">Routine ride announcement email</strong><span className="mt-1 block text-sm leading-6 text-zinc-500">Email normal organizer updates. Important and critical announcements are always delivered.</span></span></label>
      </div>
      <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[.035] p-4 text-xs leading-6 text-amber-100/80"><strong>Always on:</strong> authentication, reservation and waitlist actions, payment obligations and decisions, postponements, cancellations, refund actions, and important or critical operational messages.</div>
      <FormPendingSubmit idleLabel="Save preferences" pendingLabel="Saving…" overlayLabel="Saving notification preferences…" className="mt-6 rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-white hover:bg-orange-400" />
    </form>
  </section>;
}
