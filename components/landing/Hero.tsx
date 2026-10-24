import Link from "next/link";

export default function Hero() {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24 bg-white">
      <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
          Get families back on the road faster.
        </h1>
        <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
          ShopStats turns your insurance report card into a clear plan to cut
          repair times.
        </p>
        <div className="pt-4">
          <Link
            href="/upload"
            className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl bg-[#0F4C81] text-white shadow-lg hover:shadow-xl hover:bg-[#0d3f6a] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#22D3EE]/30"
          >
            Upload your scorecard
          </Link>
        </div>
      </div>
    </section>
  );
}
