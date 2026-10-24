"use client";

import Link from "next/link";
import { useState } from "react";
import MetricCard from "@/components/MetricCard";
import Notice from "@/components/Notice";
import Spinner from "@/components/Spinner";
import { save, SCORE_KEY } from "@/lib/storage";
import type { ScoreResponse } from "@/lib/types";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreResponse | null>(null);

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setError(null);
    setResult(null);
  }

  async function submit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/score", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.metrics) {
        setError(data?.error ?? "Something went wrong scoring that file. Please try again.");
        return;
      }
      setResult(data as ScoreResponse);
      save(SCORE_KEY, data);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-primary">Upload your insurer scorecard</h1>
      <p className="mt-2 text-slate-600">
        Drop in a photo, screenshot, or PDF of your scorecard. We&apos;ll score each metric and explain it in plain
        English.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-slate-300 bg-white hover:border-slate-400"
        }`}
      >
        <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        {file ? (
          <>
            <p className="font-medium text-ink">{file.name}</p>
            <p className="mt-1 text-sm text-slate-500">{(file.size / 1024).toFixed(0)} KB · click to choose another</p>
          </>
        ) : (
          <>
            <p className="font-medium text-ink">Drag a file here, or click to choose</p>
            <p className="mt-1 text-sm text-slate-500">PNG, JPG, WebP, GIF, or PDF · up to 10 MB</p>
          </>
        )}
      </label>

      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={submit}
          disabled={!file || loading}
          className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Score my scorecard
        </button>
        {loading && <Spinner label="Reading your scorecard… this takes about 10–20 seconds." />}
      </div>

      {error && (
        <div className="mt-6">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      {result && (
        <section className="mt-10">
          {result.notice && (
            <div className="mb-6">
              <Notice kind="info">{result.notice}</Notice>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-primary">Your scores</h2>
            <Link href="/jobs" className="text-sm font-semibold text-primary hover:text-primary-hover">
              Next: check your jobs →
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.metrics.map((m) => (
              <MetricCard key={m.key} metric={m} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
