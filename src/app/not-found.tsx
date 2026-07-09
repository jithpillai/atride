import Link from "next/link";

export default function NotFound() {
  return <section className="mx-auto flex min-h-[65vh] max-w-3xl items-center px-5 py-20 text-center"><div className="w-full"><p className="text-7xl font-black text-orange-500">404</p><h1 className="mt-5 text-3xl font-black">That road isn’t on our map.</h1><p className="mt-3 text-zinc-400">The Guild or ride may be private, unpublished, or no longer available.</p><Link href="/" className="mt-8 inline-block rounded-full bg-white px-6 py-3 text-sm font-black text-black">Back to AtRide</Link></div></section>;
}
