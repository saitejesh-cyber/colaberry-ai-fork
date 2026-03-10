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

  /* Shared button class for secondary (outlined) buttons — avoids .btn which is pill-shaped */
  const secondaryBtnClass =
    "focus-ring flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-700";

  return (
    <>
      {/* ─── Cookie Settings Card ─── */}
      {showBanner ? (
        <section
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-[80] cookie-banner-enter sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-w-[400px]"
        >
          <div className="rounded-t-xl border border-zinc-200/80 bg-white p-5 shadow-xl sm:rounded-xl dark:border-zinc-700 dark:bg-zinc-900">
            {!preferencesOpen ? (
              /* ── Initial View ── */
              <>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Cookie Settings
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  We use cookies to deliver and improve our services, analyze
                  site usage, and if you agree, to customize or personalize your
                  experience and market our services to you. You can read our
                  Cookie Policy{" "}
                  <Link
                    href="/cookie-policy"
                    className="font-medium text-zinc-900 underline underline-offset-2 transition-colors hover:text-[var(--pivot-fill)] dark:text-zinc-100 dark:hover:text-[var(--pivot-fill)]"
                  >
                    here
                  </Link>
                  .
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  {/* Customize — full-width secondary */}
                  <button
                    type="button"
                    onClick={() => setPreferencesOpen(true)}
                    className={`${secondaryBtnClass} w-full`}
                  >
                    Customize cookie settings
                  </button>

                  {/* Reject + Accept — side by side */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => savePreferences({ analytics: false, marketing: false })}
                      className={secondaryBtnClass}
                    >
                      Reject all cookies
                    </button>
                    <button
                      type="button"
                      onClick={() => savePreferences({ analytics: true, marketing: true })}
                      className="btn btn-cta h-10 w-full rounded-lg text-sm"
                    >
                      Accept all cookies
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* ── Customize View ── */
              <>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Cookie Settings
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  Our website uses cookies to distinguish you from other users.
                  This helps us provide you with a more personalized experience
                  when you browse our website and also allows us to improve our
                  site. You can choose not to allow some types of cookies.
                </p>

                {/* Toggle rows */}
                <div className="mt-4 flex flex-col gap-2">
                  {/* Necessary */}
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50/60 px-3 py-2.5 dark:bg-amber-900/10">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Necessary
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Enables security and basic functionality.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Required
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked="true"
                        disabled
                        className="toggle-switch"
                        aria-label="Necessary cookies are always enabled"
                      >
                        <span className="toggle-knob" />
                      </button>
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50/60 px-3 py-2.5 dark:bg-amber-900/10">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Analytics
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Enables tracking of site performance.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {analyticsEnabled ? "On" : "Off"}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={analyticsEnabled}
                        onClick={() => setAnalyticsEnabled((v) => !v)}
                        className="toggle-switch"
                        aria-label="Toggle analytics cookies"
                      >
                        <span className="toggle-knob" />
                      </button>
                    </div>
                  </div>

                  {/* Marketing */}
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50/60 px-3 py-2.5 dark:bg-amber-900/10">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Marketing
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Enables ads personalization and tracking.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {marketingEnabled ? "On" : "Off"}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={marketingEnabled}
                        onClick={() => setMarketingEnabled((v) => !v)}
                        className="toggle-switch"
                        aria-label="Toggle marketing cookies"
                      >
                        <span className="toggle-knob" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save preferences */}
                <button
                  type="button"
                  onClick={() =>
                    savePreferences({
                      analytics: analyticsEnabled,
                      marketing: marketingEnabled,
                    })
                  }
                  className="btn btn-cta mt-4 h-10 w-full rounded-lg text-sm"
                >
                  Save preferences
                </button>
              </>
            )}
          </div>
        </section>
      ) : null}

      {/* ─── Reopen Button ─── */}
      {showReopenButton ? (
        <button
          type="button"
          onClick={() => setPreferencesOpen(true)}
          title={summary}
          className="focus-ring fixed bottom-20 right-5 z-[70] inline-flex h-10 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white/95 px-3.5 text-xs font-semibold text-zinc-600 shadow-md backdrop-blur transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
          aria-label="Open cookie preferences"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="8" cy="9" r="1" fill="currentColor" />
            <circle cx="15" cy="13" r="1" fill="currentColor" />
            <circle cx="10" cy="15" r="1" fill="currentColor" />
            <circle cx="13" cy="8" r="1" fill="currentColor" />
          </svg>
          Cookie preferences
        </button>
      ) : null}
    </>
  );
}
