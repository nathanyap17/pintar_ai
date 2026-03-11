import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Allow production builds even if lint warnings exist
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds even with type errors (IDE env issues)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
