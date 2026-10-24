export default function Footer() {
  return (
    <footer className="px-safe w-full border-t border-slate-200 bg-page pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pt-10">
      <div className="mx-auto max-w-6xl space-y-2 text-center">
        <p className="text-base font-medium text-ink sm:text-lg">Built at Sierra Hacks 2026</p>
        <p className="text-sm text-slate-600 sm:text-base">Team: Ishaan Bhatnagar and Sidhak Makkar</p>
      </div>
    </footer>
  );
}
