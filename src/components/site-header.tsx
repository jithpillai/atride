import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0b0e12]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="AtRide home">
          <Image
            src="/brand/domain-lockup.png"
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
        <Link
          href="/login"
          className="rounded-full border border-orange-500/50 bg-orange-500/10 px-5 py-2.5 text-sm font-bold text-orange-300 transition hover:bg-orange-500 hover:text-white"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
