/** Gray placeholder with the same footprint as the content it stands in for, so nothing jumps when it arrives. */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-white/[0.07] ${className}`} />;
}
