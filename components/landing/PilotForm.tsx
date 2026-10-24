"use client";

import { useState } from "react";
import Reveal from "@/components/lux/Reveal";

/** TODO: replace with the team's real inbox before sharing the site. */
const PILOT_EMAIL = "YOUR-TEAM-EMAIL@example.com";

const METRICS = ["Cycle time", "On-time delivery", "Supplement rate", "Customer satisfaction", "Parts usage", "Repair cost"];

/** Collects a pilot request and opens the visitor's email app with it filled in (nothing is sent to a server). */
export default function PilotForm() {
  const [chosen, setChosen] = useState<string[]>([]);
  const [opened, setOpened] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const body = [
      `Name: ${get("name")}`,
      `Shop: ${get("shop")}`,
      `Email: ${get("email")}`,
      get("phone") && `Phone: ${get("phone")}`,
      chosen.length > 0 && `Metrics we care about: ${chosen.join(", ")}`,
      get("notes") && `\nNotes:\n${get("notes")}`,
    ]
      .filter(Boolean)
      .join("\n");
    const subject = `ShopStats pilot request: ${get("shop")}`;
    window.location.href = `mailto:${PILOT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  }

  const toggle = (m: string) => setChosen((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  return (
    <section id="pilot" className="px-safe scroll-mt-16 bg-night pb-24 text-bone sm:pb-32">
      <Reveal className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="text-xs tracking-[0.25em] text-gold uppercase">Request a pilot</p>
          <h2 className="mt-4 font-serif text-5xl sm:text-6xl">
            Tell us about <span className="text-gold italic">your shop.</span>
          </h2>
          <p className="mt-5 max-w-sm text-bone/70">This opens your email app with your request filled in. Nothing is sent until you press send there.</p>
        </div>

        <form onSubmit={submit} className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="field">
            <input id="pf-name" name="name" required placeholder=" " autoComplete="name" />
            <label htmlFor="pf-name">Your name</label>
          </div>
          <div className="field">
            <input id="pf-shop" name="shop" required placeholder=" " autoComplete="organization" />
            <label htmlFor="pf-shop">Shop name</label>
          </div>
          <div className="field">
            <input id="pf-email" name="email" type="email" required placeholder=" " autoComplete="email" />
            <label htmlFor="pf-email">Email</label>
          </div>
          <div className="field">
            <input id="pf-phone" name="phone" type="tel" inputMode="tel" placeholder=" " autoComplete="tel" />
            <label htmlFor="pf-phone">Phone (optional)</label>
          </div>
          <div className="field sm:col-span-2">
            <textarea id="pf-notes" name="notes" rows={3} placeholder=" " className="resize-none" />
            <label htmlFor="pf-notes">Notes (optional)</label>
          </div>

          <fieldset className="sm:col-span-2">
            <legend className="text-sm text-muted">Which metrics matter most to you?</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {METRICS.map((m) => {
                const on = chosen.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(m)}
                    className={`pressable rounded-full border px-4 py-2 text-sm transition-colors ${
                      on ? "border-gold bg-gold text-night" : "border-line text-bone/80 hover:border-gold/60"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <button type="submit" className="btn-lux btn-lux-solid">
              Request a pilot <span className="arrow" aria-hidden>→</span>
            </button>
            {opened && (
              <p className="text-sm text-bone/70" role="status">
                Your email app should open now. If it doesn’t, email <span className="text-gold">{PILOT_EMAIL}</span>.
              </p>
            )}
          </div>
        </form>
      </Reveal>
    </section>
  );
}
