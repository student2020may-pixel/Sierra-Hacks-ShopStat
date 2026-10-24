import Link from "next/link";

export default function WhoItsFor() {
  return (
    <section className="px-safe w-full bg-white pb-20 sm:pb-24">
      <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-ink px-6 py-14 text-center text-white sm:px-12 sm:py-20">
        <div aria-hidden className="absolute -bottom-24 left-1/2 -z-10 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-accent/25 blur-3xl" />
        <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Who it’s for</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
          Built for independent body shops in the Central Valley, where most people depend on their car to get to work
          and school.
        </p>
        <Link
          href="/upload"
          className="pressable mt-9 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-7 py-4 text-base font-semibold text-ink hover:bg-white"
        >
          Upload your scorecard <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
