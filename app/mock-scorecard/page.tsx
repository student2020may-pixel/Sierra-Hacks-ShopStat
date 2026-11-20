import type { Metadata } from "next";
import sample from "@/data/sample-scorecards.json";
import { formatValue, formatVariance, meetsTarget } from "@/lib/format";
import { isScored, type InsurerScorecard } from "@/lib/types";

export const metadata: Metadata = { title: "Sample DRP performance summary" };

const scorecards = sample.scorecards as InsurerScorecard[];

/**
 * A fictional DRP performance summary covering four insurers in one document, like the ones shops
 * keep. Upload a screenshot or PDF of this page to test reading a multi-insurer scorecard.
 */
export default function MockScorecardPage() {
  return (
    <main className="min-h-svh bg-slate-200 px-3 py-6 sm:px-4 sm:py-10 print:bg-white print:p-0">
      <article className="mx-auto max-w-[850px] bg-white px-5 py-6 font-sans text-slate-900 shadow-xl sm:px-10 sm:py-8 print:shadow-none">
        <header className="border-b-4 border-slate-800 pb-4">
          <p className="text-xs tracking-widest text-slate-500 uppercase">{sample.shop}</p>
          <h1 className="mt-1 font-serif text-2xl font-bold">{sample.title}</h1>
          <p className="mt-1 text-sm text-slate-600">Reporting period: {sample.period}</p>
          <p className="mt-2 text-xs font-semibold text-red-700">Sample data: fictional numbers, not from any insurer.</p>
        </header>

        {scorecards.map((card) => (
          <section key={card.insurer} className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-300 pb-1">
              <h2 className="text-lg font-bold">{card.insurer} DRP</h2>
              <p className="text-sm text-slate-600">Repairs reviewed: {card.repair_count}</p>
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="bg-slate-800 text-left text-xs text-white uppercase">
                    <th className="px-3 py-2 font-semibold">KPI</th>
                    <th className="px-3 py-2 text-right font-semibold">Shop</th>
                    <th className="px-3 py-2 text-right font-semibold">Target</th>
                    <th className="px-3 py-2 text-right font-semibold">Variance</th>
                    <th className="px-3 py-2 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {card.kpis.filter(isScored).map((k, i) => {
                    const ok = meetsTarget(k);
                    return (
                      <tr key={k.label} className={i % 2 ? "bg-slate-50" : ""}>
                        <td className="border-b border-slate-200 px-3 py-2">
                          <span className="font-medium">{k.label}</span>
                          <span className="block text-xs text-slate-500">{k.higherIsBetter ? "Higher is better" : "Lower is better"}</span>
                        </td>
                        <td className="border-b border-slate-200 px-3 py-2 text-right font-semibold whitespace-nowrap tabular-nums">
                          {formatValue(k.value, k.unit)}
                        </td>
                        <td className="border-b border-slate-200 px-3 py-2 text-right whitespace-nowrap tabular-nums">{formatValue(k.target, k.unit)}</td>
                        <td className={`border-b border-slate-200 px-3 py-2 text-right tabular-nums ${ok ? "text-slate-600" : "font-semibold text-red-700"}`}>
                          {formatVariance(k.value, k.target, k.unit)}
                        </td>
                        <td className="border-b border-slate-200 px-3 py-2 text-center">
                          <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-bold ${ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {ok ? "MEETS" : "BELOW"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </article>
    </main>
  );
}
