const STEPS = [
  { title: "Upload", detail: "Your insurer scorecard and last quarter’s jobs. A photo, screenshot, PDF, or CSV works." },
  { title: "Analyze", detail: "Each metric scored against your insurer’s target, and the jobs that ran long flagged." },
  { title: "Improve", detail: "A short fix list aimed at the slowest repairs, with an estimate of the days it could save." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-safe w-full scroll-mt-20 bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">How it works</h2>
        <ol className="mx-auto mt-10 max-w-md space-y-8 md:grid md:max-w-none md:grid-cols-3 md:gap-8 md:space-y-0">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-5 md:flex-col md:items-center md:text-center">
              {/* Connector to the next step: vertical on phones, horizontal from md up. */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-16 left-7 h-[calc(100%-2.5rem)] w-px -translate-x-1/2 bg-gradient-to-b from-primary/40 to-primary/5 md:top-7 md:left-[calc(50%+2.25rem)] md:h-px md:w-[calc(100%-2.5rem)] md:translate-x-0 md:bg-gradient-to-r"
                />
              )}
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary font-mono text-xl font-bold text-white shadow-lg shadow-primary/25">
                {i + 1}
              </span>
              <div className="pt-1 md:pt-3">
                <h3 className="text-2xl font-semibold tracking-tight text-ink">{step.title}</h3>
                <p className="mt-1.5 text-slate-600">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
