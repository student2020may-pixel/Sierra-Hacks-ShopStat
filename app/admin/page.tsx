"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Notice from "@/components/Notice";
import Spinner from "@/components/Spinner";

/** Where to go after unlocking: the page that sent us here, if it's one of ours. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin")
      .then((r) => r.json())
      .then((d) => setUnlocked(Boolean(d?.unlocked)))
      .catch(() => setUnlocked(false));
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.unlocked) {
        // Full navigation, so the server sees the new cookie.
        window.location.assign(nextPath());
        return;
      } else {
        setError(data?.error ?? "Wrong code.");
      }
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function lock() {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/admin", { method: "DELETE" });
      setUnlocked(false);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-safe mx-auto max-w-md pt-12 pb-24">
      <p className="text-xs tracking-[0.25em] text-gold uppercase">Admin</p>
      <h1 className="mt-4 font-serif text-4xl font-normal tracking-tight text-bone sm:text-5xl">Enter the access code</h1>
      <p className="mt-3 text-bone/70">ShopStats is private for now. The code unlocks it on this browser for 7 days.</p>

      {unlocked === null ? (
        <div className="mt-8">
          <Spinner label="Checking…" />
        </div>
      ) : unlocked ? (
        <div className="mt-8 space-y-4 animate-enter">
          <Notice kind="info">Unlocked on this browser.</Notice>
          <div className="flex flex-wrap gap-3">
            <Link href="/assessment/scorecard" className="btn-lux btn-lux-solid">
              Start <span className="arrow" aria-hidden>→</span>
            </Link>
            <button type="button" onClick={lock} disabled={busy} className="btn-lux disabled:opacity-50">
              Lock
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={unlock} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs tracking-[0.2em] text-muted uppercase">Admin code</span>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="mt-2 block w-full rounded-lg border border-line bg-night-2 px-4 py-3 font-mono text-base text-bone outline-none focus:border-gold/60"
            />
          </label>
          <button type="submit" disabled={busy || !code.trim()} className="btn-lux btn-lux-solid disabled:opacity-50">
            Unlock <span className="arrow" aria-hidden>→</span>
          </button>
          {error && (
            <div className="animate-enter">
              <Notice kind="error">{error}</Notice>
            </div>
          )}
        </form>
      )}
    </main>
  );
}
