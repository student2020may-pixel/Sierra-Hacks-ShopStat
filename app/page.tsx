import Link from "next/link";

const STEPS = [
  { title: "Scorecard", body: "Upload your latest insurer scorecard, in any format." },
  { title: "Your last cars", body: "Upload your recent jobs: a CSV or Excel export, a PDF, or a screenshot." },
  { title: "Grade an estimate", body: "Upload any estimate and see how it would move your scorecard before you send it." },
];

export default function Home() {
  return (
    <main className="px-safe mx-auto max-w-3xl pt-16 pb-24 text-bone sm:pt-24">
      <h1 className="font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">
        See how an estimate moves your <span className="text-gold italic">insurer scorecard.</span>
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-bone/75">
        Grade any repair estimate against your insurer&apos;s targets, using your own scorecard and recent jobs.
      </p>
      <Link href="/assessment/scorecard" className="btn-lux btn-lux-solid mt-8">
        Start <span className="arrow" aria-hidden>→</span>
      </Link>

      <ol className="mt-16 divide-y divide-line border-y border-line">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-5 py-5">
            <span className="w-8 shrink-0 font-serif text-2xl text-gold italic tabular-nums">0{i + 1}</span>
            <div>
              <h2 className="text-lg font-medium">{s.title}</h2>
              <p className="mt-1 text-bone/70">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-10 text-sm text-muted">
        Files are sent to OpenAI (or Google Gemini as a backup) only to read the numbers, and aren&apos;t saved by ShopStats.
        Your results stay in this browser tab. Built by Ishaan &amp; Sidhak.
      </p>
    </main>
  );
}
