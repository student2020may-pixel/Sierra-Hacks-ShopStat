"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 900;
/** Strong ease-out: most of the movement happens early, so the number settles instead of crawling in. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Counts up to `value` the first time it scrolls into view. The server renders the final value,
 * so it's correct without JavaScript; with reduced motion it simply stays at the final value.
 */
export default function CountUp({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Only animate numbers that start below the fold; one already on screen just stays put.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setShown(0);
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION_MS);
          setShown(value * easeOut(t));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}
