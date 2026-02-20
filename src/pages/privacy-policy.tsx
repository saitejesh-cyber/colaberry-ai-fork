import Head from "next/head";
import Layout from "../components/Layout";

export default function PrivacyPolicyPage() {
  return (
    <Layout>
      <Head>
        <title>Privacy Policy | Colaberry AI</title>
        <meta
          name="description"
          content="Colaberry AI privacy policy covering data collection, newsletter subscriptions, analytics, and user rights."
        />
      </Head>

      <section className="mx-auto w-full max-w-4xl">
        <div className="surface-panel border border-slate-200/80 bg-white/95 px-6 py-8 shadow-sm dark:border-slate-700 dark:bg-slate-950/85 sm:px-8">
          <div className="inline-flex rounded-full border border-brand-blue/25 bg-brand-blue/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">
            Legal
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Last updated: February 17, 2026
          </p>

          <div className="mt-6 space-y-6 text-sm leading-7 text-slate-700 dark:text-slate-300">
            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">What we collect</h2>
              <p>
                We collect information you submit directly (such as newsletter email addresses and demo requests),
                product usage events needed for platform reliability, and optional analytics data when consent is
                granted.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">How we use data</h2>
              <p>
                We use data to deliver requested services, improve product quality, respond to support or demo
                inquiries, and operate security controls. We do not sell personal data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Cookie and tracking choices</h2>
              <p>
                Essential cookies are always enabled for security and core navigation. Analytics and advertising
                cookies are optional and can be updated at any time through Cookie Preferences.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Retention and security</h2>
              <p>
                We keep data only as long as needed for business, legal, and security obligations. We apply reasonable
                technical and organizational safeguards to protect information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Contact</h2>
              <p>
                For privacy requests, contact{" "}
                <a className="font-semibold text-brand-deep underline underline-offset-4" href="mailto:privacy@colaberry.ai">
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
