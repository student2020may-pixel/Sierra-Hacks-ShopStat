export default function HowItWorks() {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-8 sm:mb-12">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center space-y-4 hover:shadow-md transition-shadow duration-200">
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-[#22D3EE]/10" style={{ backgroundColor: "[COLOR 2]" + "20" }}>
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8"
                style={{ color: "[COLOR 2]" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Upload your insurer scorecard
            </h3>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center space-y-4 hover:shadow-md transition-shadow duration-200">
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-[#22D3EE]/10" style={{ backgroundColor: "[COLOR 2]" + "20" }}>
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8"
                style={{ color: "[COLOR 2]" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">
              See your shop’s stat chart
            </h3>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center space-y-4 hover:shadow-md transition-shadow duration-200">
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-[#22D3EE]/10" style={{ backgroundColor: "[COLOR 2]" + "20" }}>
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8"
                style={{ color: "[COLOR 2]" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Get a fix list that targets slow repairs
            </h3>
          </div>
        </div>
      </div>
    </section>
  );
}
