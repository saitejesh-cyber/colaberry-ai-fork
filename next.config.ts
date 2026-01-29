import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/podcasts", destination: "/resources/podcasts" },
      { source: "/podcast/:slug", destination: "/resources/podcasts/:slug" },
    ];
  },
};

export default nextConfig;
