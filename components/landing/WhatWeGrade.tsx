import Reveal from "@/components/lux/Reveal";

const METRICS = [
  { name: "Cycle time", line: "How many days a car spends in your shop, from drop-off to pickup.", lower: true },
  { name: "Customer satisfaction", line: "How happy customers say they were with the repair.", lower: false },
  { name: "Repair cost", line: "What your average repair costs compared with what the insurer expects.", lower: true },
  { name: "Supplement rate", line: "How often an estimate has to be revised after the car is taken apart.", lower: true },
  { name: "Parts usage", line: "How often alternate or recycled parts are used instead of new ones.", lower: false },
  { name: "On-time delivery", line: "How often a car is ready on the day you promised.", lower: false },
];

export default function WhatWeGrade() {
  return (
    <section className="px-safe bg-night py-24 text-bone sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-xs tracking-[0.25em] text-gold uppercase">What we grade</p>
          <h2 className="mt-4 font-serif text-5xl sm:text-6xl">
            Six numbers decide <span className="text-gold italic">your grade.</span>
          </h2>
        </Reveal>
        <ol className="mt-14 border-t border-line">
          {METRICS.map((m, i) => (
            <Reveal
              key={m.name}
              as="li"
              className="grid grid-cols-[3rem_1fr] gap-x-4 gap-y-2 border-b border-line py-7 sm:grid-cols-[5rem_1fr_auto] sm:items-baseline sm:gap-x-8"
            >
                <span className="font-serif text-2xl text-gold italic sm:text-3xl">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-serif text-3xl sm:text-4xl">{m.name}</h3>
                  <p className="mt-1 text-bone/70">{m.line}</p>
                </div>
                <span className="col-start-2 justify-self-start rounded-full border border-line px-3 py-1 text-xs tracking-[0.12em] text-muted uppercase sm:col-start-auto sm:justify-self-end">
                  {m.lower ? "Lower is better" : "Higher is better"}
                </span>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
