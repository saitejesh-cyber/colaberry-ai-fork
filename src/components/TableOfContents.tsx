import { useEffect, useRef, useState } from "react";

export type TocItem = {
  id: string;
  label: string;
  level?: number;
};

type TableOfContentsProps = {
  items: TocItem[];
  /** Label above the TOC list. Defaults to "On this page". */
  title?: string;
};

export default function TableOfContents({
  items,
  title = "On this page",
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (items.length === 0) return;

    const callback: IntersectionObserverCallback = (entries) => {
      // Pick the first intersecting section from top
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

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav aria-label="Table of contents" className="sticky top-[calc(var(--site-header-height)+1.5rem)]">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {title}
      </div>
      <ul className="mt-3 flex flex-col gap-1 border-l border-[var(--stroke)]">
        {items.map((item) => {
          const isActive = activeId === item.id;
          const indent = (item.level ?? 2) > 2 ? "pl-6" : "pl-3";
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById(item.id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  setActiveId(item.id);
                }}
                className={`block ${indent} py-1 text-sm transition-colors ${
                  isActive
                    ? "-ml-px border-l-2 border-[var(--brand-purple)] font-medium text-[var(--brand-purple)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
