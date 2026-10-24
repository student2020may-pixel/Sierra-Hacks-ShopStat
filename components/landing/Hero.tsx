import Link from "next/link";
import StatSheet from "@/components/StatSheet";
import { sampleScorecard } from "@/lib/sample";

const HEADLINE = ["Get", "families", "back", "on", "the", "road"];

export default function Hero() {
  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden bg-night text-bone">
      <div aria-hidden className="absolute top-1/4 right-[-15%] -z-10 h-[36rem] w-[36rem] rounded-full bg-gold/10 blur-3xl" />

      <div className="px-safe mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 pt-[calc(6rem+env(safe-area-inset-top))] pb-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <h1 className="font-serif text-[3.4rem] leading-[0.98] tracking-tight sm:text-7xl lg:text-[5.75rem]">
            {HEADLINE.map((w, i) => (
              <span key={w + i} className="rise-word" style={{ ["--i" as string]: i }}>
                {w}&nbsp;
              </span>
            ))}
            <span className="rise-word text-gold italic" style={{ ["--i" as string]: HEADLINE.length }}>
              faster.
            </span>
          </h1>
          <p className="rise-word mt-7 max-w-lg text-lg leading-relaxed text-bone/75 sm:text-xl" style={{ ["--i" as string]: HEADLINE.length + 2 }}>
            ShopStats turns your insurance report card into a clear plan to cut repair times.
          </p>
          <div className="rise-word mt-9 flex flex-col gap-3 sm:flex-row" style={{ ["--i" as string]: HEADLINE.length + 3 }}>
            <Link href="/assessment/scorecard" className="btn-lux btn-lux-solid">
              Start shop assessment <span className="arrow" aria-hidden>→</span>
            </Link>
            <Link href="/results?sample=1" className="btn-lux">
              See a sample report <span className="arrow" aria-hidden>→</span>
            </Link>
          </div>
        </div>

        {/* In place of a photo: the product itself, the stat sheet for the fictional sample shop, with a slow zoom. */}
        <figure className="rise-word mx-auto w-full max-w-md lg:max-w-none" style={{ ["--i" as string]: 4 }}>
          <div className="overflow-hidden rounded-3xl border border-line bg-night-2 p-3 shadow-2xl shadow-black/60">
            <div className="slow-zoom">
              <StatSheet metrics={sampleScorecard.metrics} />
            </div>
          </div>
          <figcaption className="mt-3 text-center text-xs tracking-[0.2em] text-muted uppercase">{sampleScorecard.shop.name} · sample</figcaption>
        </figure>
      </div>

      <div className="px-safe mx-auto grid w-full max-w-6xl grid-cols-3 items-end gap-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-[11px] tracking-[0.18em] text-muted uppercase sm:text-xs">
        <p>Built at Sierra Hacks 2026</p>
        <a href="#problem" className="pressable flex flex-col items-center gap-2 justify-self-center" aria-label="Scroll to the problem">
          <span>Scroll</span>
          <span aria-hidden className="scroll-cue relative block h-10 w-px overflow-hidden bg-line" />
        </a>
        <p className="text-right">37.80° N · 121.22° W</p>
      </div>
    </section>
  );
}
