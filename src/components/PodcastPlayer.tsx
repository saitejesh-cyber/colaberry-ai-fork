import { useEffect, useRef, useState } from "react";

type PodcastPlayerProps = {
  embedCode?: string | null;
  audioUrl?: string | null;
  defer?: boolean;
};

export default function PodcastPlayer({
  embedCode,
  audioUrl,
  defer = true,
}: PodcastPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasInjected = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | number | null>(null);
  const idleModeRef = useRef<"idle" | "timeout" | null>(null);
  const [shouldLoad, setShouldLoad] = useState(!defer);
  const [loading, setLoading] = useState(!!embedCode);

  useEffect(() => {
    if (!embedCode || !defer || shouldLoad) return;

    const target = containerRef.current;
    if (!target || typeof window === "undefined") return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
          }
        });
      },
      { rootMargin: "200px" }
    );

    observerRef.current.observe(target);

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [embedCode, defer, shouldLoad]);

  useEffect(() => {
    if (!embedCode || !containerRef.current || !shouldLoad || hasInjected.current) return;

    const inject = () => {
      if (!containerRef.current) return;

      containerRef.current.innerHTML = embedCode;

      const scripts = Array.from(containerRef.current.querySelectorAll("script"));
      scripts.forEach((oldScript) => {
        const script = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) => {
          script.setAttribute(attr.name, attr.value);
        });
        script.async = true;
        script.defer = true;
        if (oldScript.textContent) {
          script.text = oldScript.textContent;
        }
        oldScript.parentNode?.replaceChild(script, oldScript);
      });

      hasInjected.current = true;
      setTimeout(() => setLoading(false), 300);
    };

    const globalObj = typeof globalThis !== "undefined" ? globalThis : undefined;
    const requestIdle = (globalObj as any)?.requestIdleCallback as
      | ((callback: () => void, options?: { timeout?: number }) => number)
      | undefined;

    if (requestIdle) {
      idleModeRef.current = "idle";
      idleRef.current = requestIdle(inject, { timeout: 1500 });
    } else {
      idleModeRef.current = "timeout";
      idleRef.current = globalThis.setTimeout(inject, 200);
    }

    return () => {
      if (idleRef.current) {
        const cancelIdle = (globalObj as any)?.cancelIdleCallback as
          | ((handle: number) => void)
          | undefined;
        if (idleModeRef.current === "idle" && cancelIdle && typeof idleRef.current === "number") {
          cancelIdle(idleRef.current);
        } else {
          globalThis.clearTimeout(idleRef.current as ReturnType<typeof setTimeout>);
        }
      }
    };
  }, [embedCode, shouldLoad]);

  if (embedCode) {
    return (
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
            <span>Loading podcast player…</span>
            {!shouldLoad && (
              <button
                type="button"
                onClick={() => setShouldLoad(true)}
                className="rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:text-brand-deep dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Load now
              </button>
            )}
          </div>
        )}
        <div
          ref={containerRef}
          className={`podcast-embed min-h-[150px] ${loading ? "opacity-0" : "opacity-100"}`}
        />
      </div>
    );
  }

  if (audioUrl) {
    return (
      <audio
        controls
        className="w-full rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm"
      >
        <source src={audioUrl} />
        Your browser does not support the audio element.
      </audio>
    );
  }

  return null;
}
