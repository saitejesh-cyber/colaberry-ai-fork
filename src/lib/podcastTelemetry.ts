export type PodcastEventType = "view" | "play" | "share" | "subscribe" | "click";

type EpisodeRef = {
  slug?: string;
  title?: string;
};

const SESSION_KEY = "colaberry:podcast:session-id";
const VIEWED_KEY_PREFIX = "colaberry:podcast:viewed:";

const EVENT_THROTTLE_MS: Record<PodcastEventType, number> = {
  view: 60_000,
  play: 15_000,
  share: 2_000,
  subscribe: 5_000,
  click: 2_000,
};

const eventCache = new Map<string, number>();

function safeStorageGet(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // ignore storage write failures
  }
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId() {
  if (typeof window === "undefined") return "server";
  const existing = safeStorageGet(window.localStorage, SESSION_KEY);
  if (existing) return existing;
  const next = createId();
  safeStorageSet(window.localStorage, SESSION_KEY, next);
  return next;
}

function shouldSkipEvent(eventType: PodcastEventType, episodeSlug: string, platform: string) {
  const sessionId = getSessionId();
  const key = `${sessionId}:${eventType}:${episodeSlug}:${platform}`;
  const now = Date.now();
  const previous = eventCache.get(key);
  const threshold = EVENT_THROTTLE_MS[eventType];
  if (previous && now - previous < threshold) {
    return true;
  }
  eventCache.set(key, now);
  return false;
}

function viewedInSession(episodeSlug: string) {
  if (typeof window === "undefined") return false;
  const storageKey = `${VIEWED_KEY_PREFIX}${episodeSlug}`;
  const existing = safeStorageGet(window.sessionStorage, storageKey);
  if (existing === "1") return true;
  safeStorageSet(window.sessionStorage, storageKey, "1");
  return false;
}

export async function logPodcastEvent(
  eventType: PodcastEventType,
  platform?: string,
  episode?: EpisodeRef
) {
  const episodeSlug = String(episode?.slug || "").trim();
  if (!episodeSlug) return;

  const normalizedPlatform = String(platform || "").trim().toLowerCase();
  if (eventType === "view" && viewedInSession(episodeSlug)) {
    return;
  }
  if (shouldSkipEvent(eventType, episodeSlug, normalizedPlatform)) {
    return;
  }

  const payload = {
    eventType,
    platform: normalizedPlatform || undefined,
    episodeSlug,
    episodeTitle: String(episode?.title || "").trim() || undefined,
    sessionId: getSessionId(),
    pagePath: typeof window !== "undefined" ? window.location.pathname : undefined,
    referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
  };

  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      const queued = navigator.sendBeacon("/api/podcast-log", blob);
      if (queued) return;
    }

    await fetch("/api/podcast-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // best-effort telemetry
  }
}
