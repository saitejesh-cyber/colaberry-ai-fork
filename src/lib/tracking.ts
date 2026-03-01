export type UtmContext = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
};

const UTM_STORAGE_KEY = "colaberry_utm_context_v1";

function normalize(value: string | null, maxLength: number) {
  if (!value) return "";
  return value.trim().slice(0, maxLength);
}

function readFromSearch(params: URLSearchParams): UtmContext {
  const utmSource = normalize(params.get("utm_source"), 120);
  const utmMedium = normalize(params.get("utm_medium"), 120);
  const utmCampaign = normalize(params.get("utm_campaign"), 160);
  const utmTerm = normalize(params.get("utm_term"), 120);
  const utmContent = normalize(params.get("utm_content"), 120);

  return {
    ...(utmSource ? { utmSource } : {}),
    ...(utmMedium ? { utmMedium } : {}),
    ...(utmCampaign ? { utmCampaign } : {}),
    ...(utmTerm ? { utmTerm } : {}),
    ...(utmContent ? { utmContent } : {}),
  };
}

export function readPersistedUtmContext(): UtmContext {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UtmContext;
    return {
      utmSource: normalize(parsed.utmSource || null, 120) || undefined,
      utmMedium: normalize(parsed.utmMedium || null, 120) || undefined,
      utmCampaign: normalize(parsed.utmCampaign || null, 160) || undefined,
      utmTerm: normalize(parsed.utmTerm || null, 120) || undefined,
      utmContent: normalize(parsed.utmContent || null, 120) || undefined,
      referrer: normalize(parsed.referrer || null, 400) || undefined,
    };
  } catch {
    return {};
  }
}

export function captureUtmContextFromLocation() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const fromUrl = readFromSearch(params);
  const referrer = normalize(document.referrer || null, 400);
  const merged: UtmContext = {
    ...readPersistedUtmContext(),
    ...fromUrl,
    ...(referrer ? { referrer } : {}),
  };

  try {
    window.localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore storage failures
  }
}

export function getTrackingContext(): UtmContext {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const fromUrl = readFromSearch(params);
  const persisted = readPersistedUtmContext();
  const referrer = normalize(document.referrer || null, 400) || persisted.referrer || undefined;

  return {
    ...persisted,
    ...fromUrl,
    ...(referrer ? { referrer } : {}),
  };
}
