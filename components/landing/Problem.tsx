export default function Problem() {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-8 sm:mb-12">
          The problem
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center space-y-3 hover:shadow-md transition-shadow duration-200">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F4C81]" style={{ color: "[COLOR 1]" }}>
              19.3 days
            </div>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
              average time a repair takes
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center space-y-3 hover:shadow-md transition-shadow duration-200">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F4C81]" style={{ color: "[COLOR 1]" }}>
              46.7%
            </div>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
              share of repair appraisals handled through insurer programs
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center space-y-3 hover:shadow-md transition-shadow duration-200">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F4C81]" style={{ color: "[COLOR 1]" }}>
              Quarterly
            </div>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
              how often many shops see their insurer scores
            </p>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 text-center">
          Sources: J.D. Power 2025, CCC 2026, FenderBender
        </p>
      </div>
    </section>
  );
}
