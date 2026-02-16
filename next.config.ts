import type { NextConfig } from "next";

const cmsUrl = process.env.NEXT_PUBLIC_CMS_URL;
const cmsRemotePattern = (() => {
  if (!cmsUrl) return null;
  try {
    const url = new URL(cmsUrl);
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port || "",
      pathname: "/uploads/**",
    };
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: cmsRemotePattern ? [cmsRemotePattern] : [],
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
      { source: "/articles", destination: "/resources/articles" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      {
        source: "/(.*)",
        has: [{ type: "header", key: "x-forwarded-proto", value: "https" }],
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
