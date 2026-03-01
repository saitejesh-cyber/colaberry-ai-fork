/**
 * SEO utility functions for consistent meta tag generation across pages.
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";

const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

const TWITTER_HANDLE = "@colaberry";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type SeoMeta = {
  title: string;
  description: string;
  canonical?: string;
  ogType?: "website" | "article";
  ogImage?: string | null;
  ogImageAlt?: string;
  noindex?: boolean;
};

export type SeoTagDefinition =
  | { key: string; name: string; content: string }
  | { key: string; property: string; content: string }
  | { key: "canonical"; rel: "canonical"; href: string };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Build an absolute canonical URL from a path segment. */
export function canonicalUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
}

/** Resolve the best og:image — fall back to default brand image. */
export function resolveOgImage(image?: string | null): string {
  if (!image) return DEFAULT_OG_IMAGE;
  // Already absolute
  if (/^https?:\/\//i.test(image)) return image;
  // Relative path → make absolute
  return `${SITE_URL}${image.startsWith("/") ? image : `/${image}`}`;
}

/**
 * Generate an array of `<meta>` / `<link>` JSX-compatible objects
 * for use inside `<Head>` via `.map()`.
 *
 * Usage:
 * ```tsx
 * import { seoTags, type SeoMeta } from "@/lib/seo";
 * // inside component:
 * <Head>
 *   <title>{meta.title}</title>
 *   {seoTags(meta).map(({ key, ...props }) => (
 *     props.rel ? <link key={key} {...props} /> : <meta key={key} {...props} />
 *   ))}
 * </Head>
 * ```
 */
export function seoTags(meta: SeoMeta) {
  const ogImage = resolveOgImage(meta.ogImage);
  const ogType = meta.ogType ?? "website";
  const canonical = meta.canonical ?? SITE_URL;

  const tags: SeoTagDefinition[] = [
    // Basic
    { key: "desc", name: "description", content: meta.description },

    // Open Graph
    { key: "og:title", property: "og:title", content: meta.title },
    { key: "og:desc", property: "og:description", content: meta.description },
    { key: "og:type", property: "og:type", content: ogType },
    { key: "og:url", property: "og:url", content: canonical },
    { key: "og:image", property: "og:image", content: ogImage },
    { key: "og:site", property: "og:site_name", content: "Colaberry AI" },

    // Twitter Card
    { key: "tw:card", name: "twitter:card", content: "summary_large_image" },
    { key: "tw:site", name: "twitter:site", content: TWITTER_HANDLE },
    { key: "tw:title", name: "twitter:title", content: meta.title },
    { key: "tw:desc", name: "twitter:description", content: meta.description },
    { key: "tw:image", name: "twitter:image", content: ogImage },

    // Canonical (rendered as <link>)
    { key: "canonical", rel: "canonical", href: canonical },
  ];

  if (meta.ogImageAlt) {
    tags.push({ key: "og:image:alt", property: "og:image:alt", content: meta.ogImageAlt });
    tags.push({ key: "tw:image:alt", name: "twitter:image:alt", content: meta.ogImageAlt });
  }

  if (meta.noindex) {
    tags.push({ key: "robots", name: "robots", content: "noindex,nofollow" });
  }

  return tags;
}
