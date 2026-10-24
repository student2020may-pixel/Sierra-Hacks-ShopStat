"use client";

import { useCallback, useRef } from "react";
import { useReducedMotion, useScrollFrame } from "@/lib/useReducedMotion";

const DIM = 0.2;

/**
 * Each word starts at 20% opacity and lights up as the paragraph scrolls through the viewport:
 * nothing lit when its top reaches 85% of the screen height, everything lit by the time its bottom
 * passes 40%. Progress follows the scroll position, so scrolling back dims the words again.
 */
export default function WordsLightUp({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const words = text.split(" ");

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh * 0.85;
    const end = vh * 0.4 - rect.height;
    const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
    const lit = progress * words.length;
    el.querySelectorAll<HTMLSpanElement>("[data-word]").forEach((span, i) => {
      span.style.opacity = String(DIM + (1 - DIM) * Math.min(1, Math.max(0, lit - i)));
    });
  }, [words.length]);

  useScrollFrame(update, !reduced);

  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i} data-word style={{ opacity: reduced ? 1 : DIM, transition: "opacity 120ms linear" }}>
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
