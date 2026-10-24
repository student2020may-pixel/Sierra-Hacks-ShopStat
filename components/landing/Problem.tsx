import Reveal from "@/components/lux/Reveal";
import WordsLightUp from "@/components/lux/WordsLightUp";
import CountUp from "./CountUp";

const PARAGRAPH =
  "Insurers grade collision shops on cycle time, satisfaction and cost. Those grades decide where the work goes. Most shops see them once a quarter, with no detail on which jobs hurt them.";

const STATS = [
  {
    value: 19.3,
    decimals: 1,
    suffix: " days",
    label: "average days to get a car back after a claim",
    source: { name: "J.D. Power 2025", href: "https://www.jdpower.com/business/press-releases/2025-us-auto-claims-satisfaction-study" },
  },
  {
    value: 46.7,
    decimals: 1,
    suffix: "%",
    label: "share of repair appraisals handled through insurer programs",
    source: { name: "CCC 2026", href: "https://www.repairerdrivennews.com/2026/04/10/ccc-report-shows-shift-to-drp-and-ai-appraisals/" },
  },
  {
    text: "Quarterly",
    label: "how often many shops see their insurer scores",
    source: { name: "FenderBender", href: "https://www.fenderbender.com/articles/6674-maximizing-insurer-scorecard-ratings" },
  },
];

export default function Problem() {
  return (
    <section id="problem" className="px-safe scroll-mt-16 bg-night py-24 text-bone sm:py-32">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs tracking-[0.25em] text-gold uppercase">The problem</p>
        <WordsLightUp text={PARAGRAPH} className="mt-6 max-w-5xl font-serif text-[2rem] leading-[1.15] sm:text-5xl lg:text-6xl" />

        <div className="mt-20 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 90} className="bg-night p-7 sm:p-8">
              <div className="font-serif text-6xl text-bone sm:text-7xl">
                {"value" in s && s.value !== undefined ? <CountUp value={s.value} decimals={s.decimals} suffix={s.suffix} /> : s.text}
              </div>
              <p className="mt-3 text-bone/80">{s.label}</p>
              <a href={s.source.href} target="_blank" rel="noopener noreferrer" className="link-lux mt-6 inline-block text-xs tracking-[0.15em] text-muted uppercase hover:text-gold">
                Source: {s.source.name} ↗
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
