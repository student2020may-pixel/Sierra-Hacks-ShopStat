import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Upload and Jobs became steps 1 and 2 of the guided assessment; keep old links working.
  async redirects() {
    return [
      { source: "/assessment", destination: "/assessment/scorecard", permanent: false },
      { source: "/upload", destination: "/assessment/scorecard", permanent: false },
      { source: "/jobs", destination: "/assessment/jobs", permanent: false },
      // The results page was replaced by step 3, grading an estimate.
      { source: "/results", destination: "/assessment/estimate", permanent: false },
    ];
  },
};

export default nextConfig;
