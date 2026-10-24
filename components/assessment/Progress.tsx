const STEPS = ["Insurer scorecard", "Recent jobs", "Your results"];

/** "Step 1 of 3" header with a segmented bar; done and current steps fill in. */
export default function Progress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gold">
        Step {step} of {STEPS.length}
        <span className="font-normal text-muted"> · {STEPS[step - 1]}</span>
      </p>
      <ol className="mt-2 grid grid-cols-3 gap-1.5" aria-label="Assessment progress">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i + 1 === step ? "step" : undefined}>
            <span className="sr-only">
              {label}
              {i + 1 < step ? " (done)" : i + 1 === step ? " (current)" : ""}
            </span>
            <span
              aria-hidden
              className={`block h-1.5 rounded-full transition-colors duration-300 ${i + 1 <= step ? "bg-gold" : "bg-white/10"}`}
            />
            <span aria-hidden className={`mt-1.5 hidden text-xs sm:block ${i + 1 <= step ? "text-bone" : "text-muted"}`}>
              {label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
