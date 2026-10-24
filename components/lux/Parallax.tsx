"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion, useScrollFrame } from "@/lib/useReducedMotion";

/**
 * Moves its content at `speed` × the scroll speed (0.85 = a little slower than the page), centered so
 * it sits in its normal place when it's in the middle of the screen. Only from `minWidth` up: in a
 * single phone column, drifting content runs into its neighbors.
 */
export default function Parallax({
  children,
  speed = 0.85,
  className = "",
  minWidth = 1024,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
  minWidth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    setWide(mq.matches);
    const onChange = () => {
      setWide(mq.matches);
      if (!mq.matches && ref.current) ref.current.style.transform = "";
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [minWidth]);
  const active = wide && !reduced;

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.parentElement!.getBoundingClientRect();
    const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
    el.style.transform = `translate3d(0, ${(-(1 - speed) * offset).toFixed(1)}px, 0)`;
  }, [speed]);

  useScrollFrame(update, active);

  return (
    <div className={className}>
      <div ref={ref} style={{ willChange: active ? "transform" : undefined }}>
        {children}
      </div>
    </div>
  );
}
