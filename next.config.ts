import type { NextConfig } from "next";
import { getMcpRedirects } from "./src/lib/mcp-slug-aliases";

const cmsUrl = process.env.NEXT_PUBLIC_CMS_URL;
const vtonUrl = process.env.NEXT_PUBLIC_VTON_URL || "https://vton-demo-956818257204.us-east1.run.app";
// Voice Agent demo Cloud Run service in colaberryaiwebsite. Origin only
// (no path) — used for CSP frame-src + Permissions-Policy microphone allowlist.
const voiceAgentOrigin =
  process.env.NEXT_PUBLIC_VOICE_AGENT_ORIGIN ||
  "https://voice-agent-demo-ucwuixvwga-ue.a.run.app";
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
  poweredByHeader: false, // Remove X-Powered-By: Next.js (OWASP A05 info disclosure)
  images: {
    qualities: [75, 90],
    formats: ["image/avif", "image/webp"],
    remotePatterns: cmsRemotePattern ? [cmsRemotePattern] : [],
    localPatterns: [
      {
        pathname: "/media/hero/**",
      },
      {
        pathname: "/media/hero/**",
        search: "?v=*",
      },
      {
        pathname: "/media/podcast/**",
      },
      {
        pathname: "/media/podcast/**",
        search: "?v=*",
      },
    ],
  },
  async redirects() {
    const mcpRedirects = getMcpRedirects();
    return [
      ...mcpRedirects,
      // Legacy colaberry.ai/episodes → new podcast URLs (301 permanent)
      {
        source: "/episodes",
        destination: "/resources/podcasts",
        permanent: true,
      },
      {
        source: "/episodes/:slug",
        destination: "/resources/podcasts/:slug",
        permanent: true,
      },
    ];
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
            key: "X-XSS-Protection",
            value: "0",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: `camera=(self "${vtonUrl}"), microphone=(self "${vtonUrl}" "${voiceAgentOrigin}"), geolocation=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()`,
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Content-Security-Policy",
                  // SHA-256 hash used for inline theme script instead of per-request nonce.
                  // Nonces require SSR for every page (to inject nonce into HTML), but this site
                  // uses getStaticProps + ISR — pre-rendered HTML can't contain per-request nonces.
                  // SHA-256 is the correct CSP approach for Pages Router with ISR/SSG.
                  value: [
                    "default-src 'self'",
                    "script-src 'self' 'sha256-CdQGV8nBFFKUGZSKmXZWMSImilQGgmVGWzhkZ5MUiII=' https://www.googletagmanager.com https://www.google-analytics.com https://www.buzzsprout.com",
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                    "font-src 'self' https://fonts.gstatic.com data:",
                    `img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com ${cmsUrl ? new URL(cmsUrl).origin : ""}`.trim(),
                    `connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com https://www.buzzsprout.com https://www.buzzsprout.com ${cmsUrl || ""}`.trim(),
                    "media-src 'self' https://www.buzzsprout.com https://www.buzzsprout.com",
                    `frame-src 'self' https://www.buzzsprout.com https://substack.com https://www.colaberry.online ${vtonUrl} ${voiceAgentOrigin}`,
                    "object-src 'none'",
                    "frame-ancestors 'self'",
                    "base-uri 'self'",
                    "form-action 'self' https://www.colaberry.online",
                  ].join("; "),
                },
              ]
            : []),
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
      {
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/og/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
