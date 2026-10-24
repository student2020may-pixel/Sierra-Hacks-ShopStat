export default function Spinner({ label }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 text-bone/70">
      <span className="h-5 w-5 animate-spin-fast shrink-0 rounded-full border-2 border-white/20 border-t-gold" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
