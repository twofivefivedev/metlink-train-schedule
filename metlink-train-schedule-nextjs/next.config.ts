import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // instrumentationHook is now available by default in Next.js 16
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
