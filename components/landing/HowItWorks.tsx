const STEPS = [
  { title: "Upload your insurer scorecard", detail: "A photo, screenshot, or PDF works." },
  { title: "See your shop’s stat chart", detail: "Each metric scored against your insurer’s target." },
  { title: "Get a fix list that targets slow repairs", detail: "Built from your scores and the jobs that ran long." },
];

export default function HowItWorks() {
  return (
    <section className="px-safe w-full bg-page py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center text-3xl font-bold text-ink sm:mb-14 sm:text-4xl lg:text-5xl">How it works</h2>
        <ol className="mx-auto max-w-md space-y-6 md:grid md:max-w-none md:grid-cols-3 md:gap-8 md:space-y-0">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
              {/* Connector to the next step: vertical on phones, horizontal from md up. */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-16 left-7 h-[calc(100%-3rem)] w-0.5 -translate-x-1/2 bg-primary/20 md:top-7 md:left-[calc(50%+2.25rem)] md:h-0.5 md:w-[calc(100%-2.5rem)] md:translate-x-0"
                />
              )}
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-md shadow-primary/20">
                {i + 1}
              </span>
              <div className="pt-2 md:pt-0">
                <h3 className="text-xl font-semibold text-ink sm:text-2xl">{step.title}</h3>
                <p className="mt-1 text-slate-600">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
