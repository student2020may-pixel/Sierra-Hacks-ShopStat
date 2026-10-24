import type { Metadata } from "next";
import scorecardData from "@/data/scorecard.json";
import { formatValue, meetsTarget } from "@/lib/format";
import type { Scorecard } from "@/lib/types";

export const metadata: Metadata = { title: "Granite Mutual – DRP Scorecard" };

const scorecard = scorecardData as Scorecard;

function letterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function variance(shopValue: number, target: number, unit: string): string {
  const diff = shopValue - target;
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
  const abs = Math.abs(diff);
  if (unit === "$") return `${sign}$${abs.toLocaleString("en-US")}`;
  if (unit === "%") return `${sign}${abs} pts`;
  if (unit === "days") return `${sign}${abs.toFixed(1)} d`;
  return `${sign}${abs}`;
}

export default function MockScorecardPage() {
  const { shop, insurer, metrics } = scorecard;
  const overall = Math.round(metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length);
  const below = metrics.filter((m) => !meetsTarget(m));

  return (
    <main className="min-h-screen bg-stone-200 px-4 py-10 print:bg-white print:p-0">
      <article className="mx-auto max-w-[850px] bg-white font-serif text-stone-900 shadow-xl print:shadow-none">
        {/* Letterhead */}
        <header className="flex items-center justify-between border-b-4 border-[#1f3a5f] px-10 pt-8 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-[#1f3a5f] font-sans text-xl font-black text-white">
              GM
            </div>
            <div>
              <p className="font-sans text-xl font-bold tracking-wide text-[#1f3a5f]">{insurer.name.toUpperCase()}</p>
              <p className="font-sans text-xs tracking-widest text-stone-500 uppercase">
                Claims Operations · {insurer.program}
              </p>
            </div>
          </div>
          <div className="text-right font-sans text-xs text-stone-500">
            <p>Report No. GM-DRP-26Q3-40217</p>
            <p>Issued {new Date(scorecard.issuedOn + "T12:00:00").toLocaleDateString("en-US", { dateStyle: "long" })}</p>
            <p className="mt-1 font-semibold text-red-700">CONFIDENTIAL</p>
          </div>
        </header>

        <section className="px-10 pt-6">
          <h1 className="text-center text-2xl font-bold tracking-tight">Repair Facility Performance Scorecard</h1>
          <p className="mt-1 text-center font-sans text-sm text-stone-600">Reporting Period: {scorecard.period}</p>

          {/* Shop details + overall grade */}
          <div className="mt-6 grid grid-cols-[1fr_auto] gap-6 border border-stone-300">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 font-sans text-sm">
              <div>
                <dt className="text-xs text-stone-500 uppercase">Facility</dt>
                <dd className="font-semibold">{shop.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500 uppercase">Facility ID</dt>
                <dd className="font-semibold">{shop.shopId}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500 uppercase">Address</dt>
                <dd>{shop.address}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500 uppercase">Market</dt>
                <dd>{shop.region}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500 uppercase">Repairs Reviewed</dt>
                <dd>{scorecard.repairsReviewed}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500 uppercase">Market Rank</dt>
                <dd>
                  {scorecard.regionalRank.rank} of {scorecard.regionalRank.of}
                </dd>
              </div>
            </dl>
            <div className="flex w-40 flex-col items-center justify-center border-l border-stone-300 bg-stone-50 p-4">
              <p className="font-sans text-xs tracking-wider text-stone-500 uppercase">Overall</p>
              <p className="text-6xl leading-none font-bold text-[#1f3a5f]">{letterGrade(overall)}</p>
              <p className="mt-1 font-sans text-sm text-stone-600">{overall} / 100</p>
            </div>
          </div>
        </section>

        {/* Metrics table */}
        <section className="px-10 pt-6">
          <h2 className="border-b border-stone-300 pb-1 font-sans text-sm font-bold tracking-wider text-[#1f3a5f] uppercase">
            Key Performance Indicators
          </h2>
          <table className="mt-2 w-full font-sans text-sm">
            <thead>
              <tr className="bg-[#1f3a5f] text-left text-xs text-white uppercase">
                <th className="px-3 py-2 font-semibold">Metric</th>
                <th className="px-3 py-2 text-right font-semibold">Facility</th>
                <th className="px-3 py-2 text-right font-semibold">Program Target</th>
                <th className="px-3 py-2 text-right font-semibold">Variance</th>
                <th className="px-3 py-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => {
                const ok = meetsTarget(m);
                return (
                  <tr key={m.key} className={i % 2 ? "bg-stone-50" : ""}>
                    <td className="border-b border-stone-200 px-3 py-2.5">
                      <span className="font-medium">{m.label}</span>
                      <span className="block text-xs text-stone-500">
                        {m.higherIsBetter ? "Higher is better" : "Lower is better"}
                      </span>
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2.5 text-right font-semibold tabular-nums">
                      {formatValue(m.shopValue, m.unit)}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2.5 text-right tabular-nums">
                      {formatValue(m.target, m.unit)}
                    </td>
                    <td
                      className={`border-b border-stone-200 px-3 py-2.5 text-right tabular-nums ${ok ? "text-stone-600" : "font-semibold text-red-700"}`}
                    >
                      {variance(m.shopValue, m.target, m.unit)}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2.5 text-center">
                      <span
                        className={`inline-block rounded-sm px-2 py-0.5 text-xs font-bold ${
                          ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {ok ? "MEETS" : "BELOW"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Reviewer notes */}
        <section className="px-10 pt-6">
          <h2 className="border-b border-stone-300 pb-1 font-sans text-sm font-bold tracking-wider text-[#1f3a5f] uppercase">
            Program Reviewer Comments
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            {shop.name} did not meet program targets in {below.length} of {metrics.length} categories this period.
            Cycle time and on-time delivery remain significantly below program standards and are the primary factors
            in the facility&apos;s market ranking. Cost control and alternate parts utilization are favorable. Facility
            is placed on <span className="font-semibold">Performance Watch</span> and will be re-evaluated at the end
            of Q4 2026. Continued underperformance may result in reduced assignment volume.
          </p>
        </section>

        <footer className="mt-8 flex items-end justify-between border-t border-stone-300 px-10 py-6 font-sans text-xs text-stone-500">
          <div>
            <p className="font-serif text-base text-stone-800 italic">R. Delgado</p>
            <p>Regional DRP Manager, Central Valley</p>
          </div>
          <p className="max-w-xs text-right">
            Metrics calculated from closed claims during the reporting period. Fictional document for demonstration
            purposes only.
          </p>
        </footer>
      </article>
    </main>
  );
}
