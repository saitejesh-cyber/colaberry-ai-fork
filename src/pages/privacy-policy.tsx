import Head from "next/head";
import Layout from "../components/Layout";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../lib/seo";

export default function PrivacyPolicyPage() {
  const seoMeta: SeoMeta = {
    title: "Privacy Policy | Colaberry AI",
    description: "Colaberry AI privacy policy covering data collection, newsletter subscriptions, analytics, and user rights.",
    canonical: buildCanonical("/privacy-policy"),
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
          "name": "Privacy Policy",
          "description": "Colaberry AI privacy policy covering data collection, newsletter subscriptions, analytics, and user rights.",
          "url": buildCanonical("/privacy-policy"),
          "publisher": { "@type": "Organization", "name": "Colaberry AI" },
        }) }} />
      </Head>

      <section className="mx-auto w-full max-w-4xl">
        <div className="surface-panel border border-zinc-200/80 bg-white/95 px-6 py-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/85 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#4F2AA3]/15 bg-[#F3EEFF] px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[#2B0F63] dark:border-[#7B5CE0]/20 dark:bg-[#18233A] dark:text-[#C4B3FF]">
            Legal
          </div>
          <h1 className="mt-4 font-sans text-display-sm sm:text-display-md font-bold text-zinc-900 dark:text-zinc-100">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            Last updated: February 17, 2026
          </p>

          <div className="mt-6 space-y-6 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
            <section>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">What we collect</h2>
              <p>
                We collect information you submit directly (such as newsletter email addresses and demo requests),
                product usage events needed for platform reliability, and optional analytics data when consent is
                granted.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">How we use data</h2>
              <p>
                We use data to deliver requested services, improve product quality, respond to support or demo
                inquiries, and operate security controls. We do not sell personal data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Cookie and tracking choices</h2>
              <p>
                Essential cookies are always enabled for security and core navigation. Analytics and advertising
                cookies are optional and can be updated at any time through Cookie Preferences.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Retention and security</h2>
              <p>
                We keep data only as long as needed for business, legal, and security obligations. We apply reasonable
                technical and organizational safeguards to protect information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Contact</h2>
              <p>
                For privacy requests, contact{" "}
                <a className="font-semibold text-[#4F2AA3] underline underline-offset-4 dark:text-[#7B5CE0]" href="mailto:privacy@colaberry.ai">
                  privacy@colaberry.ai
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>
    </Layout>
  );
}
