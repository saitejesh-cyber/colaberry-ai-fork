import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  applyCookieConsent,
  createCookieConsentPreferences,
  ensureGoogleAnalytics,
  readCookieConsentPreferences,
  saveAndApplyCookieConsent,
  type CookieConsentPreferences,
} from "../lib/cookieConsent";

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_ID || null;

export default function CookieConsentBanner() {
  const [hasMounted, setHasMounted] = useState(false);
  const [savedPreferences, setSavedPreferences] = useState<CookieConsentPreferences | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setHasMounted(true);
      const existing = readCookieConsentPreferences();
      if (existing) {
        setSavedPreferences(existing);
        setAnalyticsEnabled(existing.analytics);
        setMarketingEnabled(existing.marketing);
        applyCookieConsent(existing, GA_MEASUREMENT_ID);
        if (existing.analytics) {
          ensureGoogleAnalytics(GA_MEASUREMENT_ID);
        }
        return;
      }

      // Default to essential cookies only until explicit consent is given.
      applyCookieConsent(createCookieConsentPreferences({ analytics: false, marketing: false }), GA_MEASUREMENT_ID);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const showBanner = hasMounted && (!savedPreferences || preferencesOpen);
  const hasAcceptedAll = !!savedPreferences?.analytics && !!savedPreferences?.marketing;
  const showReopenButton = hasMounted && !!savedPreferences && !preferencesOpen && !hasAcceptedAll;

  const summary = useMemo(() => {
    if (!savedPreferences) return "No preference saved yet";
    if (savedPreferences.analytics && savedPreferences.marketing) return "Analytics + marketing enabled";
    if (savedPreferences.analytics) return "Analytics enabled";
    if (savedPreferences.marketing) return "Marketing enabled";
    return "Essential cookies only";
  }, [savedPreferences]);

  const savePreferences = (next: { analytics: boolean; marketing: boolean }) => {
    const saved = saveAndApplyCookieConsent(next, GA_MEASUREMENT_ID);
    setSavedPreferences(saved);
    setAnalyticsEnabled(saved.analytics);
    setMarketingEnabled(saved.marketing);
    setPreferencesOpen(false);
  };

  if (!hasMounted) return null;

  return (
    <>
      {showBanner ? (
        <section
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200/80 bg-white/98 shadow-[0_-18px_42px_rgba(15,23,42,0.15)] backdrop-blur dark:border-slate-700 dark:bg-slate-950/96"
        >
          <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  We use cookies for analytics, advertising, and site reliability.
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  You can accept all, keep essential only, or customize preferences. See{" "}
                  <Link href="/privacy-policy" className="font-semibold text-brand-deep underline underline-offset-4">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/cookie-policy" className="font-semibold text-brand-deep underline underline-offset-4">
                    Cookie Policy
                  </Link>
                  .
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreferencesOpen((value) => !value)}
                  className="focus-ring inline-flex h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-brand-blue/45 hover:text-brand-deep dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  Cookie preferences
                </button>
                <button
                  type="button"
                  onClick={() => savePreferences({ analytics: false, marketing: false })}
                  className="focus-ring inline-flex h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  Essential only
                </button>
                <button
                  type="button"
                  onClick={() => savePreferences({ analytics: true, marketing: true })}
                  className="btn btn-primary h-10 px-4 text-sm"
                >
                  Accept cookies
                </button>
              </div>
            </div>

            {preferencesOpen ? (
              <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/95 p-4 dark:border-slate-700 dark:bg-slate-900/80">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/90">
                    <input type="checkbox" checked disabled className="mt-1 h-4 w-4 rounded border-slate-300" />
                    <span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Essential cookies
                      </span>
                      <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">
                        Required for security, navigation, and core functionality.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/90">
                    <input
                      type="checkbox"
                      checked={analyticsEnabled}
                      onChange={(event) => setAnalyticsEnabled(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                    />
                    <span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Analytics cookies
                      </span>
                      <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">
                        Help us measure page usage and improve product quality.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/90 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={marketingEnabled}
                      onChange={(event) => setMarketingEnabled(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                    />
                    <span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Advertising cookies
                      </span>
                      <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">
                        Support relevant campaign attribution and ad personalization.
                      </span>
                    </span>
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferencesOpen(false)}
                    className="focus-ring inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => savePreferences({ analytics: analyticsEnabled, marketing: marketingEnabled })}
                    className="btn btn-primary h-9 px-4 text-sm"
                  >
                    Save preferences
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {showReopenButton ? (
        <button
          type="button"
          onClick={() => setPreferencesOpen(true)}
          title={summary}
          className="focus-ring fixed bottom-5 right-5 z-[70] inline-flex h-10 items-center rounded-full border border-slate-300 bg-white/95 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-md backdrop-blur transition hover:border-brand-blue/50 hover:text-brand-deep dark:border-slate-600 dark:bg-slate-950/95 dark:text-slate-200"
          aria-label="Open cookie preferences"
        >
          Cookie preferences
        </button>
      ) : null}
    </>
  );
}
