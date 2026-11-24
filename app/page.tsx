import Link from "next/link";

/** Three tools, used in any order: each works on its own and uses whatever the others have. */
const OPTIONS = [
  {
    href: "/assessment/estimate",
    title: "Grade an estimate",
    body: "Upload any estimate, with damage photos if you have them. Get its KPI grade, what it does to your averages, and a photo check.",
  },
  {
    href: "/assessment/scorecard",
    title: "DRP KPIs",
    body: "Enter each insurer's KPI values and targets (CSAA, GEICO, Travelers, Farmers) from CCC screenshots or by hand.",
  },
  {
    href: "/assessment/jobs",
    title: "Your last cars",
    body: "Upload recent jobs (CSV, Excel, PDF or screenshot) so days-in-the-shop predictions fit your shop.",
  },
];

export default function Home() {
  return (
    <main className="px-safe mx-auto max-w-4xl pt-16 pb-24 text-bone sm:pt-24">
      <h1 className="font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">
        See how an estimate moves your <span className="text-gold italic">insurer scorecard.</span>
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-bone/75">Pick what you want to do. Each one works on its own, in any order.</p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <li key={o.href}>
            <Link
              href={o.href}
              className="pressable group flex h-full flex-col rounded-2xl border border-line bg-night-2 p-5 transition-colors hover:border-gold/60"
            >
              <h2 className="font-serif text-2xl text-bone group-hover:text-gold">{o.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-bone/70">{o.body}</p>
              <span className="mt-4 text-sm font-semibold text-gold">
                Open <span aria-hidden>→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-muted">
        Files are sent to OpenAI (or Google Gemini as a backup) only to read the numbers, and aren&apos;t saved by ShopStats.
        Your numbers stay in this browser tab. Built by Ishaan &amp; Sidhak.
      </p>
    </main>
  );
}
