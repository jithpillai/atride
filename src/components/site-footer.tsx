import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/8 bg-[#090b0f]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <Image src="/brand/domain-lockup-dark.png" alt="AtRide" width={150} height={70} className="h-14 w-auto" />
          <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">
            One place for road-adventure communities to publish, organize, and run memorable rides.
          </p>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Explore</p>
          <div className="mt-4 grid gap-3 text-sm text-zinc-400">
            <Link href="/#rides">Upcoming rides</Link>
            <Link href="/#guilds">Guild directory</Link>
            <Link href="/login">Rider sign in</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Launch cities</p>
          <p className="mt-4 text-sm leading-7 text-zinc-400">Bengaluru · Chennai · Coimbatore</p>
          <p className="mt-5 text-xs text-zinc-600">Sample content for the Phase 1 development build.</p>
        </div>
      </div>
    </footer>
  );
}
