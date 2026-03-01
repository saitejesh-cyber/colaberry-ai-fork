import Head from "next/head";
import Layout from "../components/Layout";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../lib/seo";

export default function CookiePolicyPage() {
  const seoMeta: SeoMeta = {
    title: "Cookie Policy | Colaberry AI",
    description: "Colaberry AI cookie policy with cookie categories and user preference controls.",
    canonical: buildCanonical("/cookie-policy"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Cookie Policy",
          "description": "Colaberry AI cookie policy with cookie categories and user preference controls.",
          "url": buildCanonical("/cookie-policy"),
          "publisher": { "@type": "Organization", "name": "Colaberry AI" },
        }) }} />
      </Head>

      <section className="mx-auto w-full max-w-4xl">
        <div className="surface-panel border border-zinc-200/80 bg-white/95 px-6 py-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/85 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#4F2AA3]/15 bg-[#F3EEFF] px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[#2B0F63] dark:border-[#7B5CE0]/20 dark:bg-[#18233A] dark:text-[#C4B3FF]">
            Legal
          </div>
          <h1 className="mt-4 font-sans text-display-sm sm:text-display-md font-bold text-zinc-900 dark:text-zinc-100">
            Cookie Policy
          </h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            Last updated: February 17, 2026
          </p>

          <div className="mt-6 space-y-6 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
            <section>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Essential cookies</h2>
              <p>
                Required for authentication state, security controls, and basic site functionality. These cookies
                cannot be disabled.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Analytics cookies</h2>
              <p>
                Used to measure usage patterns, page performance, and feature engagement so we can improve product
                quality and UX.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Advertising cookies</h2>
              <p>
                Used for campaign attribution and personalized marketing. These are optional and off by default until
                accepted.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Manage preferences</h2>
              <p>
                You can update your consent anytime using the Cookie Preferences control available on every page.
                Changes are applied immediately and stored in your browser.
              </p>
            </section>
          </div>
        </div>
      </section>
    </Layout>
  );
}
