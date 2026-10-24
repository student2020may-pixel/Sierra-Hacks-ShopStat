"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion, useScrollFrame } from "@/lib/useReducedMotion";

export interface Shot {
  src: string;
  width: number;
  height: number;
  title: string;
  caption: string;
}

/**
 * Desktop: the header and row pin while vertical scrolling slides the screenshots sideways.
 * The pinned frame is only as tall as its content, so there's no empty band above or below.
 * Phones (and reduced motion): a swipeable row with scroll-snap.
 */
/** How far the row must slide so the last card ends with the same gap as the first. */
function slideDistance(track: HTMLElement): number {
  // scrollWidth leaves out the row's right padding; clientWidth leaves out the page scrollbar.
  return Math.max(0, track.scrollWidth + parseFloat(getComputedStyle(track).paddingRight) - track.clientWidth);
}

export default function HorizontalGallery({ shots, header }: { shots: Shot[]; header?: ReactNode }) {
  const section = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [wide, setWide] = useState(false);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setWide(mq.matches);
    const onChange = () => setWide(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const pinned = wide && !reduced;

  // The section is the frame plus the sideways distance, so one pixel down moves the row one pixel left.
  useEffect(() => {
    if (!pinned) return setHeight(null);
    const measure = () => {
      const distance = track.current ? slideDistance(track.current) : 0;
      setHeight((frame.current?.offsetHeight ?? window.innerHeight) + distance);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [pinned, shots.length]);

  const update = useCallback(() => {
    const s = section.current;
    const f = frame.current;
    const t = track.current;
    if (!s || !f || !t) return;
    const distance = slideDistance(t);
    // The frame sticks once it's vertically centered (or at the top, if it's taller than the screen).
    const stickAt = Math.max(0, (window.innerHeight - f.offsetHeight) / 2);
    f.style.top = `${stickAt}px`;
    const progress = Math.min(1, Math.max(0, (stickAt - s.getBoundingClientRect().top) / Math.max(1, distance)));
    t.style.transform = `translate3d(${(-progress * distance).toFixed(1)}px, 0, 0)`;
  }, []);
  useScrollFrame(update, pinned);

  const cards = shots.map((s) => (
    <figure key={s.src} className="w-[78vw] shrink-0 snap-center sm:w-[52vw] md:w-[38rem]">
      {/* Same 16:10 frame for every shot so the row reads evenly; taller shots crop from the top. */}
      <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-night-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- static screenshots with fixed dimensions */}
        <img src={s.src} width={s.width} height={s.height} alt={s.caption} loading="lazy" className="h-full w-full object-cover object-left-top" />
      </div>
      <figcaption className="mt-4">
        <p className="font-serif text-2xl text-bone">{s.title}</p>
        <p className="mt-1 text-sm text-muted">{s.caption}</p>
      </figcaption>
    </figure>
  ));

  if (!pinned) {
    return (
      <>
        {header}
        <div className="px-safe flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ overscrollBehaviorX: "contain" }}>
          {cards}
        </div>
      </>
    );
  }

  return (
    <div ref={section} style={{ height: height ?? undefined }} className="relative">
      <div ref={frame} className="sticky top-0 overflow-hidden py-6">
        {header}
        <div ref={track} className="flex gap-8 px-[8vw] will-change-transform">
          {cards}
        </div>
      </div>
    </div>
  );
}
