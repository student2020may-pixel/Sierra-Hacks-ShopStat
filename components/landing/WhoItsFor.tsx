import Parallax from "@/components/lux/Parallax";
import Reveal from "@/components/lux/Reveal";

const TOWNS = ["Manteca", "Stockton", "Modesto", "Tracy", "Lodi", "Fresno"];
const NOTES = [
  { title: "A photo, PDF or screenshot works", body: "Use whatever your insurer sends: a PDF from the portal, a screenshot, or a photo of the printout." },
  { title: "Repair orders as a CSV export", body: "Export last quarter's repair orders from your shop management software, or type up to 10 jobs by hand." },
  // Same wording as the scorecard step (true in code: in-memory only, store: false on every OpenAI call).
  { title: "How your file is handled", body: "Sent to OpenAI only to read the numbers, and not saved by ShopStats. Your results stay in this browser tab." },
];

export default function WhoItsFor() {
  return (
    <section className="px-safe overflow-hidden bg-night-2 py-16 text-bone sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <p className="text-xs tracking-[0.25em] text-gold uppercase">Who it’s for</p>
          <h2 className="mt-4 font-serif text-5xl leading-tight sm:text-6xl">
            Independent collision shops in the <span className="text-gold italic">Central Valley.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-bone/75">
            Built for independent body shops in the Central Valley, where most people depend on their car to get to work and school.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {TOWNS.map((t) => (
              <li key={t} className="rounded-full border border-line px-4 py-1.5 text-sm text-bone/80">
                {t}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* The notes column drifts at 85% scroll speed as one unit, so the cards never overlap. */}
        <Parallax speed={0.85}>
          <div className="space-y-4">
            {NOTES.map((n, i) => (
              <Reveal key={n.title} delay={i * 90} className="rounded-2xl border border-line bg-night p-6 sm:p-7">
                <p className="font-serif text-2xl text-gold italic">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 text-lg font-medium">{n.title}</h3>
                <p className="mt-1 text-bone/70">{n.body}</p>
              </Reveal>
            ))}
          </div>
        </Parallax>
      </div>
    </section>
  );
}
