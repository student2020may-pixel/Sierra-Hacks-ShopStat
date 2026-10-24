import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Upload and Jobs became steps 1 and 2 of the guided assessment; keep old links working.
  async redirects() {
    return [
      { source: "/assessment", destination: "/assessment/scorecard", permanent: false },
      { source: "/upload", destination: "/assessment/scorecard", permanent: false },
      { source: "/jobs", destination: "/assessment/jobs", permanent: false },
    ];
  },
};

export default nextConfig;
