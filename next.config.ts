import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/media/hero/**",
      },
      {
        pathname: "/media/hero/**",
        search: "?v=*",
      },
    ],
  },
  async rewrites() {
    return [
      { source: "/podcasts", destination: "/resources/podcasts" },
      { source: "/podcast/:slug", destination: "/resources/podcasts/company?slug=:slug" },
      { source: "/resources/podcasts/company/:slug", destination: "/resources/podcasts/company?slug=:slug" },
    ];
  },
};

export default nextConfig;
