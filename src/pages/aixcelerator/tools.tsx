import ToolCard from "../../components/ToolCard";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import StatePanel from "../../components/StatePanel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GetStaticProps } from "next";
import { fetchTools, type Tool } from "../../lib/cms";
import Head from "next/head";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";

const PAGE_SIZE = 24;

type ToolPageProps = {
  tools: Tool[];
  fetchError: boolean;
  totalCount: number;
  initialHasMore: boolean;
};

type ToolSortMode = "alphabetical" | "popular";

type Facets = {
  categories: { value: string; label: string }[];
};

export const getStaticProps: GetStaticProps<ToolPageProps> = async () => {
  try {
    const raw = await fetchTools({ maxRecords: PAGE_SIZE + 1 });
    const tools = raw.slice(0, PAGE_SIZE).map(toToolListItem);
    const initialHasMore = raw.length > PAGE_SIZE;
    return {
      props: { tools, fetchError: false, totalCount: tools.length, initialHasMore },
      revalidate: 600,
    };
  } catch {
    return {
      props: { tools: [], fetchError: true, totalCount: 0, initialHasMore: false },
      revalidate: 120,
    };
  }
};

export default function Tools({ tools: initialTools, fetchError, totalCount, initialHasMore }: ToolPageProps) {
  const [sortMode, setSortMode] = useState<ToolSortMode>("alphabetical");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [allTools, setAllTools] = useState<Tool[]>(initialTools);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [displayTotal, setDisplayTotal] = useState(totalCount);
  const [catalogTotal, setCatalogTotal] = useState(totalCount);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadingRef = useRef(false);
  const pageRef = useRef(1);

  const [facets, setFacets] = useState<Facets | null>(null);

  const ssrCategories = useMemo(() => {
    const map = new Map<string, string>();
    initialTools.forEach((t) => {
      const cat = (t.toolCategory || "other").toLowerCase();
      if (!map.has(cat)) map.set(cat, formatCategoryLabel(cat));
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [initialTools]);

  const categoryOptions = facets?.categories ?? ssrCategories;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const metaTitle = "Tools Catalog | Colaberry AI";
  const metaDescription =
    "Browse end tools that MCP servers connect to — Slack, MySQL, Google Drive, Gmail, and more. Discover which MCP servers provide connectivity to the tools you use.";
  const seoMeta: SeoMeta = {
    title: metaTitle,
    description: metaDescription,
    canonical: buildCanonical("/aixcelerator/tools"),
  };
  const canonicalUrl = seoMeta.canonical!;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Colaberry AI Tools Catalog",
    url: canonicalUrl,
    description: metaDescription,
    itemListElement: allTools.slice(0, 12).map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SoftwareApplication",
        name: tool.name,
        description: tool.description || undefined,
        applicationCategory: "Tool",
        url: `${siteUrl}/aixcelerator/tools/${tool.slug || tool.id}`,
      },
    })),
  };

  const buildParams = useCallback(
    (page: number) => {
      const params = new URLSearchParams({ page: String(page), sort: sortMode });
      const q = debouncedSearch.trim();
      if (q) params.set("q", q);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      return params;
    },
    [sortMode, debouncedSearch, categoryFilter]
  );

  const filterKey = `${sortMode}|${debouncedSearch}|${categoryFilter}`;
  const prevFilterKey = useRef(filterKey);
  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      const params = buildParams(1);
      fetch(`/api/tools?${params}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setAllTools(data.tools);
            setHasMore(data.hasMore);
            setCurrentPage(1);
            setDisplayTotal(data.total);
            setCatalogTotal(data.catalogTotal);
            setFacets(data.facets);
            pageRef.current = 1;
            loadingRef.current = false;
          }
        })
        .catch(() => {});
      return;
    }

    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      loadingRef.current = true;
      const params = buildParams(1);
      fetch(`/api/tools?${params}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setAllTools(data.tools);
            setHasMore(data.hasMore);
            setCurrentPage(1);
            setDisplayTotal(data.total);
            setCatalogTotal(data.catalogTotal);
            setFacets(data.facets);
            pageRef.current = 1;
          }
        })
        .catch(() => {})
        .finally(() => {
          loadingRef.current = false;
          setLoadingMore(false);
        });
    }
  }, [filterKey, buildParams]);

  const fetchNextPage = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    const params = buildParams(nextPage);
    fetch(`/api/tools?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setAllTools((prev) => [...prev, ...data.tools]);
          setHasMore(data.hasMore);
          setCurrentPage(nextPage);
          setDisplayTotal(data.total);
          pageRef.current = nextPage;
        }
      })
      .catch(() => {})
      .finally(() => {
        loadingRef.current = false;
        setLoadingMore(false);
      });
  }, [buildParams]);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const handler = fetchNextPage;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handler();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, currentPage, fetchNextPage]);

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      {fetchError && (
        <div className="mb-6">
          <StatePanel
            variant="error"
            title="Live tool data is temporarily unavailable"
            description="Showing cached tool entries while we reconnect to the CMS."
          />
        </div>
      )}

      <div className="reveal grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Tool library"
            title="Tools"
            description="End tools that MCP servers connect to — Slack, MySQL, Google Drive, Gmail, and more. Browse by category or search to find which MCP servers provide connectivity to the tools you use."
          />
        </div>
      </div>

      <section className="reveal surface-panel mt-8 p-5 sm:mt-10">
        <SectionHeader
          kicker="Catalog snapshot"
          title="Tool coverage"
          description="End tools connected via MCP servers in the catalog."
          size="md"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:items-center sm:gap-6">
          <Stat title="Tools" value={String(catalogTotal)} note="End tools cataloged" />
          <Stat title="Categories" value={String(categoryOptions.length)} note="Tool types" />
        </div>
      </section>

      <section className="reveal surface-panel mt-6 p-6 sm:mt-8">
        <SectionHeader
          kicker="Filters"
          title="Search and filter"
          description="Find tools by category or name."
          size="md"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-8">
          <div className="sm:col-span-2 lg:col-span-4">
            <label htmlFor="tool-search" className="sr-only">
              Search tools
            </label>
            <div className="relative group">
              <input
                id="tool-search"
                name="tool-search"
                type="search"
                placeholder="Search tools, categories..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2 pr-11 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:placeholder:text-zinc-500"
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 dark:text-zinc-500"
                fill="none"
              >
                <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
                <path d="M16.25 16.25 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="tool-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="tool-category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="w-full rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
            >
              <option value="all">All categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Sort
          </span>
          {(
            [
              { value: "alphabetical", label: "A-Z" },
              { value: "popular", label: "Popular" },
            ] as { value: ToolSortMode; label: string }[]
          ).map((option) => {
            const active = sortMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSortMode(option.value)}
                aria-pressed={active}
                className={`chip focus-ring rounded-md px-3 py-1 text-xs font-semibold ${
                  active ? "chip-brand" : "chip-muted"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500" aria-live="polite">
          Showing {allTools.length} of {displayTotal} (catalog {catalogTotal})
        </div>
      </section>

      <div className="reveal mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {allTools.map((t) => (
          <ToolCard
            key={t.slug || String(t.id)}
            name={t.name}
            slug={t.slug}
            description={t.description}
            toolCategory={t.toolCategory}
            mcpServerCount={t.mcpServers?.length ?? 0}
          />
        ))}
      </div>

      {allTools.length === 0 && !loadingMore && (
        <div className="mt-6">
          <StatePanel
            variant="empty"
            title="No tools match these filters"
            description="Try clearing filters or adjusting your search query."
          />
        </div>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        {allTools.length > 0 ? (
          hasMore ? (
            <>
              <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
              {loadingMore && (
                <span className="text-sm text-zinc-500">Loading more tools...</span>
              )}
            </>
          ) : (
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              End of results
            </div>
          )
        ) : null}
      </div>
    </Layout>
  );
}

function toToolListItem(tool: Tool): Tool {
  return {
    id: tool.id,
    name: tool.name,
    slug: tool.slug,
    description: clipText(tool.description, 220),
    toolCategory: tool.toolCategory ?? null,
    website: tool.website ?? null,
    iconUrl: tool.iconUrl ?? null,
    iconAlt: tool.iconAlt ?? null,
    mcpServers: tool.mcpServers ?? [],
  };
}

function clipText(value?: string | null, limit = 220) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}...`;
}

function formatCategoryLabel(cat: string): string {
  return cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Stat({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-1">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{title}</span>
      <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">{value}</span>
      <span className="text-xs text-zinc-400 dark:text-zinc-500">{note}</span>
    </div>
  );
}
