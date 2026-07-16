import Image from "next/image";
import Link from "next/link";

import { db } from "@/lib/db";
import { getCurrentSession } from "@/server/auth/session";

export async function SiteHeader() {
  const session = await getCurrentSession();
  const unreadNotifications = session ? await db.notificationInboxItem.count({ where: { recipientUserId: session.userId, readAt: null } }) : 0;
  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0b0e12]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="AtRide home">
          <Image
            src="/brand/domain-lockup-dark.png"
            alt="AtRide"
            width={154}
            height={72}
            className="h-14 w-auto object-contain"
            priority
          />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-zinc-300 md:flex">
          <Link href="/#rides" className="transition hover:text-white">Find rides</Link>
          <Link href="/#guilds" className="transition hover:text-white">Explore Guilds</Link>
          <Link href="/#how-it-works" className="transition hover:text-white">How it works</Link>
        </nav>
        <div className="flex items-center gap-2">
          {session && <Link href="/account/notifications" aria-label={`${unreadNotifications} unread notifications`} className="relative grid size-11 place-items-center rounded-full border border-white/10 bg-white/[.025] text-lg transition hover:border-orange-400/40 hover:text-orange-300">♢{unreadNotifications > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-black leading-5 text-white">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}</Link>}
          <Link
            href={session ? "/account" : "/login"}
            className="rounded-full border border-orange-500/50 bg-orange-500/10 px-5 py-2.5 text-sm font-bold text-orange-300 transition hover:bg-orange-500 hover:text-white"
          >
            {session ? "Account" : "Sign in"}
          </Link>
        </div>
      </div>
    </header>
  );
}
