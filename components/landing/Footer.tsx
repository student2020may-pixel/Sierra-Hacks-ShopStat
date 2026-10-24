export default function Footer() {
  return (
    <footer className="px-safe w-full border-t border-slate-200 bg-white pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <p className="text-sm font-medium text-ink">Built at Sierra Hacks 2026</p>
        <p className="text-sm text-slate-600">Team: Ishaan Bhatnagar and Sidhak Makkar</p>
      </div>
    </footer>
  );
}
