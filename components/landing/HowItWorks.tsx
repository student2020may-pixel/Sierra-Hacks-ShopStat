const STEPS = [
  {
    title: "Upload your insurer scorecard",
    detail: "A photo, screenshot, or PDF works.",
    icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
  },
  {
    title: "See your shop’s stat chart",
    detail: "Each metric scored against your insurer’s target.",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    title: "Get a fix list that targets slow repairs",
    detail: "Built from your scores and the jobs that ran long.",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  },
];

export default function HowItWorks() {
  return (
    <section className="px-safe w-full bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-ink sm:text-5xl">How it works</h2>
        <ol className="mx-auto mt-14 max-w-md space-y-8 md:grid md:max-w-none md:grid-cols-3 md:gap-8 md:space-y-0">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-5 md:flex-col md:items-center md:text-center">
              {/* Connector to the next step: vertical on phones, horizontal from md up. */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-16 left-7 h-[calc(100%-2.5rem)] w-px -translate-x-1/2 bg-gradient-to-b from-primary/40 to-primary/5 md:top-7 md:left-[calc(50%+2.25rem)] md:h-px md:w-[calc(100%-2.5rem)] md:translate-x-0 md:bg-gradient-to-r"
                />
              )}
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                </svg>
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-ink ring-4 ring-white">
                  {i + 1}
                </span>
              </span>
              <div className="pt-1 md:pt-3">
                <h3 className="text-xl font-semibold tracking-tight text-ink">{step.title}</h3>
                <p className="mt-1.5 text-slate-600">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
