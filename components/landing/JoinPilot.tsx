import Reveal from "@/components/lux/Reveal";

// Planned features for the pilot, not in the app yet; the card says so.
const PLANNED = [
  { title: "Monthly tracking", body: "Upload each month’s scorecard and watch the trend, not just one quarter." },
  { title: "Score history", body: "Every metric over time, so you can see whether a fix actually worked." },
  { title: "Direct connection to shop software", body: "Repair orders pulled in automatically instead of exporting a CSV." },
];

export default function JoinPilot() {
  return (
    <section className="px-safe bg-night py-16 text-bone sm:py-24">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-gold/30 bg-night-2 p-7 sm:p-12">
        <div aria-hidden className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs tracking-[0.25em] text-gold uppercase">Join the pilot</p>
            <h2 className="mt-4 font-serif text-5xl leading-tight sm:text-6xl">
              Help shape <span className="text-gold italic">what’s next.</span>
            </h2>
            <p className="mt-5 max-w-md text-bone/75">
              We’re looking for a few Central Valley shops to try ShopStats on real scorecards. Pilot shops get what we’re building next:
            </p>
            <a href="#pilot" className="btn-lux btn-lux-solid mt-8">
              Request a pilot <span className="arrow" aria-hidden>→</span>
            </a>
          </div>
          <div>
            <ul className="divide-y divide-line border-y border-line">
              {PLANNED.map((p) => (
                <li key={p.title} className="py-5">
                  <p className="font-serif text-2xl">{p.title}</p>
                  <p className="mt-1 text-sm text-bone/70">{p.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Planned for the pilot; not in the app yet.</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
