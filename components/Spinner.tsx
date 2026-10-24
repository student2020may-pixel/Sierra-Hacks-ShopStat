export default function Spinner({ label }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 text-slate-600">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
