import Link from "next/link";

interface Props {
  back?: string;
  next: { href: string; label: string; ready: boolean; hint: string };
}

/**
 * Back / Next bar pinned to the bottom of the screen so it's always in thumb reach, padded clear of
 * the iPhone home indicator. Next stays disabled (with a reason) until the step has a result.
 */
export default function StepNav({ back, next }: Props) {
  return (
    <div className="sticky bottom-0 z-20 -mx-[max(1rem,env(safe-area-inset-left))] mt-10 border-t border-slate-200 bg-white/90 px-[max(1rem,env(safe-area-inset-left))] pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        {back ? (
          <Link href={back} className="pressable rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50">
            ← Back
          </Link>
        ) : (
          <span />
        )}
        <div className="flex min-w-0 items-center gap-3">
          {!next.ready && <p className="hidden text-right text-sm text-slate-500 sm:block">{next.hint}</p>}
          {next.ready ? (
            <Link href={next.href} className="pressable rounded-lg bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover">
              {next.label} →
            </Link>
          ) : (
            <button type="button" disabled className="cursor-not-allowed rounded-lg bg-slate-300 px-5 py-3 font-semibold text-white" title={next.hint}>
              {next.label} →
            </button>
          )}
        </div>
      </div>
      {!next.ready && <p className="mt-2 text-center text-xs text-slate-500 sm:hidden">{next.hint}</p>}
    </div>
  );
}
