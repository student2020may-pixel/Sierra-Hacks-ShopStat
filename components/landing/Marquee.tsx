const ITEMS = ["Cycle time", "On-time delivery", "Supplement rate", "Customer satisfaction", "Parts usage", "Repair cost"];

/** Infinite ticker: two identical rows slide left by half their width, so the loop is seamless. */
export default function Marquee() {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {ITEMS.map((item) => (
        <li key={item} className="flex items-center whitespace-nowrap">
          <span className="px-8 font-serif text-4xl text-bone italic sm:text-6xl">{item}</span>
          <span aria-hidden className="text-2xl text-gold">✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="What insurers grade" className="marquee overflow-hidden border-y border-line bg-night py-8">
      <div className="marquee-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
