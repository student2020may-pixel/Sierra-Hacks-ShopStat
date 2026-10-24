import Reveal from "@/components/lux/Reveal";

const STEPS = [
  { title: "Upload your scorecard", detail: "A photo, PDF or screenshot of your insurer scorecard." },
  { title: "Add repair orders", detail: "Last quarter’s jobs as a CSV, or up to 10 typed in by hand." },
  { title: "Analyze", detail: "Each metric scored against its target, and the jobs that ran long flagged." },
  { title: "Fix what matters", detail: "A short fix list for the weakest metrics, with an estimate of days saved." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-safe scroll-mt-16 bg-night py-24 text-bone sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-xs tracking-[0.25em] text-gold uppercase">How it works</p>
          <h2 className="mt-4 font-serif text-5xl sm:text-6xl">
            Four steps to <span className="text-gold italic">a fix list.</span>
          </h2>
        </Reveal>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} as="li" delay={i * 90} className="flex h-full flex-col bg-night p-7">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-4xl text-gold italic">{String(i + 1).padStart(2, "0")}</span>
                  {i < STEPS.length - 1 && (
                    <span aria-hidden className="text-muted">
                      →
                    </span>
                  )}
                </div>
                <h3 className="mt-8 font-serif text-3xl">{s.title}</h3>
                <p className="mt-2 text-bone/70">{s.detail}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
