import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://backend:8000/api/:path*",
      },
      {
        source: "/mcp/:path*",
        destination: "http://backend:8000/mcp/:path*",
      },
    ];
  },
};

export default nextConfig;
