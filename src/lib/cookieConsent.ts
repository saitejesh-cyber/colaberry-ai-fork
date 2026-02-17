export const COOKIE_CONSENT_STORAGE_KEY = "colaberry_cookie_consent_v1";
export const COOKIE_CONSENT_VERSION = 1;

export type CookieConsentPreferences = {
  version: number;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: string]: unknown;
  }
}

type PersistedCookieConsent = Partial<CookieConsentPreferences> | null;

function isValidConsent(candidate: PersistedCookieConsent): candidate is CookieConsentPreferences {
  if (!candidate) return false;
  return (
    candidate.necessary === true &&
    typeof candidate.analytics === "boolean" &&
    typeof candidate.marketing === "boolean" &&
    typeof candidate.updatedAt === "string"
  );
}

export function createCookieConsentPreferences(input?: {
  analytics?: boolean;
  marketing?: boolean;
}): CookieConsentPreferences {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics: input?.analytics ?? false,
    marketing: input?.marketing ?? false,
    updatedAt: new Date().toISOString(),
  };
}

export function readCookieConsentPreferences(): CookieConsentPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedCookieConsent;
    if (!isValidConsent(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistCookieConsentPreferences(preferences: CookieConsentPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(preferences));
}

function toConsentValue(value: boolean) {
  return value ? "granted" : "denied";
}

export function ensureGoogleAnalytics(gaMeasurementId?: string | null) {
  if (typeof window === "undefined") return;
  if (!gaMeasurementId) return;

  if (!window.dataLayer) {
    window.dataLayer = [];
  }
  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }

  const scriptId = `ga-script-${gaMeasurementId}`;
  if (!document.getElementById(scriptId)) {
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`;
    document.head.appendChild(script);
  }

  window.gtag("js", new Date());
  window.gtag("config", gaMeasurementId, {
    anonymize_ip: true,
    transport_type: "beacon",
  });
}

export function applyCookieConsent(preferences: CookieConsentPreferences, gaMeasurementId?: string | null) {
  if (typeof window === "undefined") return;

  const analyticsStorage = toConsentValue(preferences.analytics);
  const marketingStorage = toConsentValue(preferences.marketing);

  if (gaMeasurementId) {
    window[`ga-disable-${gaMeasurementId}`] = !preferences.analytics;
  }

  if (!window.dataLayer) {
    window.dataLayer = [];
  }
  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }

  window.gtag("consent", "default", {
    security_storage: "granted",
    functionality_storage: "granted",
    analytics_storage: analyticsStorage,
    ad_storage: marketingStorage,
    ad_user_data: marketingStorage,
    ad_personalization: marketingStorage,
  });

  window.gtag("consent", "update", {
    analytics_storage: analyticsStorage,
    ad_storage: marketingStorage,
    ad_user_data: marketingStorage,
    ad_personalization: marketingStorage,
  });
}

export function saveAndApplyCookieConsent(
  input: { analytics: boolean; marketing: boolean },
  gaMeasurementId?: string | null
) {
  const preferences = createCookieConsentPreferences(input);
  persistCookieConsentPreferences(preferences);
  applyCookieConsent(preferences, gaMeasurementId);
  if (preferences.analytics) {
    ensureGoogleAnalytics(gaMeasurementId);
  }
  return preferences;
}
