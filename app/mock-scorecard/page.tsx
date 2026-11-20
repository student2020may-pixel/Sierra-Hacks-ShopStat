import type { Metadata } from "next";
import { slotKpis } from "@/lib/drp";
import { formatValue, formatVariance, meetsTarget } from "@/lib/format";
import { SAMPLE as sample } from "@/lib/sample";
import { isScored, type SlotCard } from "@/lib/types";

export const metadata: Metadata = { title: "Sample DRP KPI summary" };

/**
 * A fictional KPI summary for four insurers, laid out like a printed report. Upload a screenshot of
 * one insurer's section to test reading.
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

        {sample.insurers.map((ins) => {
          const card: SlotCard = { source: "sample", insurer: ins.insurer, period: sample.period, claims: ins.claims, values: ins.values };
          return (
            <section key={ins.insurer} className="mt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-300 pb-1">
                <h2 className="text-lg font-bold">{ins.insurer}</h2>
                <p className="text-sm text-slate-600">Claims: {ins.claims}</p>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-left text-xs text-white uppercase">
                      <th className="px-3 py-2 font-semibold">KPI Display Name</th>
                      <th className="px-3 py-2 text-right font-semibold">KPI Value</th>
                      <th className="px-3 py-2 text-right font-semibold">KPI Target</th>
                      <th className="px-3 py-2 text-right font-semibold">Variance</th>
                      <th className="px-3 py-2 text-center font-semibold"># Exceptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotKpis(card)
                      .filter(isScored)
                      .map((k, i) => {
                        const ok = meetsTarget(k);
                        return (
                          <tr key={k.id} className={i % 2 ? "bg-slate-50" : ""}>
                            <td className="border-b border-slate-200 px-3 py-2 font-medium">{k.label}</td>
                            <td className="border-b border-slate-200 px-3 py-2 text-right font-semibold whitespace-nowrap tabular-nums">{formatValue(k.value, k.unit)}</td>
                            <td className="border-b border-slate-200 px-3 py-2 text-right whitespace-nowrap tabular-nums">{formatValue(k.target, k.unit)}</td>
                            <td className={`border-b border-slate-200 px-3 py-2 text-right tabular-nums ${ok ? "text-slate-600" : "font-semibold text-red-700"}`}>
                              {formatVariance(k.value, k.target, k.unit)}
                            </td>
                            <td className="border-b border-slate-200 px-3 py-2 text-center font-bold">{ok ? 0 : 1}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </article>
    </main>
  );
}
