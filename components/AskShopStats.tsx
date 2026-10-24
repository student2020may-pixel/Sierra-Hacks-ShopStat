"use client";

import { useRef, useState } from "react";
import Spinner from "@/components/Spinner";
import { answerFromData, MAX_QUESTION_LENGTH, SUGGESTED_QUESTIONS, type AskRequest, type AskResponse } from "@/lib/ask";

type Context = Omit<AskRequest, "question">;
interface Exchange {
  id: number;
  question: string;
  answer: AskResponse | null; // null while loading
}

/** Most recent first; older exchanges drop off so the section stays short. */
const MAX_EXCHANGES = 4;

export default function AskShopStats({ context }: { context: Context }) {
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const nextId = useRef(0);
  const loading = exchanges.some((e) => e.answer === null);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    setQuestion("");
    const id = nextId.current++;
    setExchanges((prev) => [{ id, question: q, answer: null }, ...prev].slice(0, MAX_EXCHANGES));

    let answer: AskResponse;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, question: q }),
        signal: AbortSignal.timeout(55_000), // a little past the server's 40s AI timeout
      });
      const data = await res.json().catch(() => null);
      if (res.status === 400 && data?.error) {
        setExchanges((prev) => prev.filter((e) => e.id !== id));
        setError(data.error);
        return;
      }
      if (!res.ok || typeof data?.answer !== "string") throw new Error();
      answer = data as AskResponse;
    } catch {
      // Server unreachable or timed out: answer the suggested questions from the numbers we already have.
      const fromData = answerFromData({ ...context, question: q });
      answer = fromData
        ? { answer: fromData, source: "data", notice: "We couldn't reach the server. This answer was worked out directly from your numbers." }
        : { answer: "I can't answer that one right now. Try one of the suggested questions.", source: "data", notice: "We couldn't reach the server." };
    }
    setExchanges((prev) => prev.map((e) => (e.id === id ? { ...e, answer } : e)));
  }

  return (
    <section className="rounded-xl border border-line bg-night-2 p-4  sm:p-6">
      <h2 className="font-serif text-3xl font-normal text-bone">Ask ShopStats</h2>
      <p className="mt-1 text-sm text-bone/70">Answers use only your scorecard, your slow jobs, and your fix list.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => ask(q)}
            disabled={loading}
            className="pressable rounded-full border border-gold/30 bg-gold/10 px-3 py-2 text-sm font-medium text-gold hover:bg-gold/20 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <label htmlFor="ask-input" className="sr-only">
          Your question
        </label>
        <input
          id="ask-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder="Ask about your scores or jobs…"
          enterKeyHint="send"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-white/20 bg-night-2 px-3 py-2.5 text-bone placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="pressable rounded-full bg-gold px-5 py-2.5 font-semibold text-night hover:bg-bone disabled:cursor-not-allowed disabled:bg-white/10"
        >
          Ask
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-danger-soft">{error}</p>}

      {exchanges.length > 0 && (
        <ul className="mt-5 space-y-3">
          {exchanges.map((e) => (
            <li key={e.id} className="animate-enter rounded-lg bg-night p-4">
              <p className="text-sm font-semibold [overflow-wrap:anywhere] text-bone">{e.question}</p>
              {e.answer === null ? (
                <div className="mt-2">
                  <Spinner label="Thinking it through…" />
                </div>
              ) : (
                <div className="animate-enter">
                  <p className="mt-1.5 leading-relaxed [overflow-wrap:anywhere] text-bone/85">{e.answer.answer}</p>
                  {e.answer.notice && <p className="mt-2 text-xs text-muted">{e.answer.notice}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
