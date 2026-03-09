import { useEffect, useRef, useState } from "react";

export type TabItem = { id: string; label: string };

type StickyTabBarProps = { tabs: TabItem[] };

export default function StickyTabBar({ tabs }: StickyTabBarProps) {
  const [activeId, setActiveId] = useState<string>(tabs[0]?.id ?? "");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (tabs.length === 0) return;

    const callback: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
          break;
        }
      }
    };

    observerRef.current = new IntersectionObserver(callback, {
      rootMargin: "-20% 0px -75% 0px",
      threshold: 0,
    });

    for (const item of tabs) {
      const el = document.getElementById(item.id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [tabs]);

  if (tabs.length < 2) return null;

  return (
    <nav
      aria-label="Page sections"
      className="sticky top-[64px] z-30 -mx-4 border-b border-zinc-200 bg-white/95 backdrop-blur sm:-mx-6 lg:-mx-8 dark:border-zinc-700 dark:bg-zinc-950/95"
    >
      <div className="flex overflow-x-auto px-4 sm:px-6 lg:px-8">
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                document.getElementById(tab.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                setActiveId(tab.id);
              }}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-[#DC2626] text-zinc-900 dark:border-red-400 dark:text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
