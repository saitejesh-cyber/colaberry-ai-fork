import SkillCard from "../../../components/SkillCard";
import AeoQuickAnswer from "../../../components/AeoQuickAnswer";
import CatalogSnapshot from "../../../components/CatalogSnapshot";
import EnterpriseCtaBand from "../../../components/EnterpriseCtaBand";
import Layout from "../../../components/Layout";
import MiniOntologyDiagram from "../../../components/MiniOntologyDiagram";
import SectionHeader from "../../../components/SectionHeader";
import StatePanel from "../../../components/StatePanel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GetStaticProps } from "next";
import { Skill, fetchSkills, fetchCatalogCounts } from "../../../lib/cms";
import { useRouter } from "next/router";
import Head from "next/head";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { SKILL_ONTOLOGY_CONFIG } from "../../../data/skill-taxonomy";

const PAGE_SIZE = 24;

type SkillsPageProps = {
  skills: Skill[];
  allowPrivate: boolean;
  fetchError: boolean;
  totalCount: number;
  initialHasMore: boolean;
};

type SkillSortMode = "alphabetical" | "latest" | "trending";

type Facets = {
  categories: string[];
  statuses: string[];
  sources: string[];
  tags: { value: string; label: string }[];
};

export const getStaticProps: GetStaticProps<SkillsPageProps> = async () => {
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";

  try {
    const [raw, counts] = await Promise.all([
      fetchSkills(visibilityFilter, { maxRecords: PAGE_SIZE + 1 }),
      fetchCatalogCounts(visibilityFilter).catch(() => ({ agents: 0, mcpServers: 0, skills: 0, tools: 0, podcasts: 0 })),
    ]);
    const skills = raw.slice(0, PAGE_SIZE).map(toSkillListItem);
    const initialHasMore = raw.length > PAGE_SIZE;
    return {
      props: { skills, allowPrivate, fetchError: false, totalCount: counts.skills || skills.length, initialHasMore },
      revalidate: 600,
    };
  } catch {
    return {
      props: { skills: [], allowPrivate, fetchError: true, totalCount: 0, initialHasMore: false },
      revalidate: 120,
    };
  }
};

export default function Skills({ skills: initialSkills, allowPrivate, fetchError, totalCount, initialHasMore }: SkillsPageProps) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<"all" | "public" | "private">(
    allowPrivate ? "all" : "public"
  );
  const [sortMode, setSortMode] = useState<SkillSortMode>("trending");
  const [search, setSearch] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");

  // Compute category counts for mini ontology diagram
  const skillCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const skill of initialSkills) {
      const cat = SKILL_ONTOLOGY_CONFIG.classifyItem(skill);
      counts[cat.slug] = (counts[cat.slug] || 0) + 1;
    }
    return counts;
  }, [initialSkills]);

  const querySearch = useMemo(() => {
    const raw = Array.isArray(router.query.q) ? router.query.q[0] : router.query.q;
    return typeof raw === "string" ? raw : "";
  }, [router.query.q]);
  const effectiveSearch = search ?? querySearch;

  // Debounce search input (300ms) to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(effectiveSearch), 300);
    return () => clearTimeout(timer);
  }, [effectiveSearch]);

  // All loaded skills (SSR first page + API pages)
  const [allSkills, setAllSkills] = useState<Skill[]>(initialSkills);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [displayTotal, setDisplayTotal] = useState(totalCount);
  const [catalogTotal, setCatalogTotal] = useState(totalCount);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Refs to avoid stale closures in IntersectionObserver callback
  const loadingRef = useRef(false);
  const pageRef = useRef(1);

  // Facets from the API (full dataset)
  const [facets, setFacets] = useState<Facets | null>(null);

  // Initial facets derived from SSR data (incomplete but immediate)
  const ssrCategories = useMemo(
    () => Array.from(new Set(initialSkills.map((s) => s.category || "Other"))).filter(Boolean).sort(),
    [initialSkills]
  );
  const ssrStatuses = useMemo(() => {
    return Array.from(new Set(initialSkills.map((s) => (s.status || "unknown").toLowerCase()))).sort();
  }, [initialSkills]);
  const ssrSources = useMemo(() => {
    return Array.from(new Set(initialSkills.map((s) => (s.source || "internal").toLowerCase()))).sort();
  }, [initialSkills]);
  const ssrTags = useMemo(() => {
    const map = new Map<string, string>();
    initialSkills.forEach((skill) => {
      (skill.tags || []).forEach((tag) => {
        const key = (tag.slug || tag.name || "").toLowerCase();
        if (key && !map.has(key)) map.set(key, tag.name || tag.slug || key);
      });
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [initialSkills]);

  // Use API facets when available, fall back to SSR-derived facets
  const categories = facets?.categories ?? ssrCategories;
  const statuses = facets?.statuses ?? ssrStatuses;
  const sources = facets?.sources ?? ssrSources;
  const tagOptions = facets?.tags ?? ssrTags;

  const visibilityCounts = useMemo(() => {
    return allSkills.reduce<Record<string, number>>((acc, s) => {
      const key = (s.visibility || "public").toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [allSkills]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.colaberry.ai";
  const countLabel = catalogTotal > 0 ? `${catalogTotal.toLocaleString()}+` : "";
  const metaTitle = `AI Skills Catalog | ${countLabel} Reusable AI Skills | Colaberry AI`;
  const metaDescription = `Browse the Colaberry AI skills catalog with ${countLabel} reusable AI skills across workflow, domain, and orchestration categories. Compare providers, prerequisites, linked agents, and linked MCP servers.`;
  const seoMeta: SeoMeta = {
    title: metaTitle,
    description: metaDescription,
    canonical: buildCanonical("/aixcelerator/skills"),
    ogImage: "/og/skills.png",
    ogImageAlt: `Colaberry AI — ${countLabel} reusable AI skills library`,
  };
  const canonicalUrl = seoMeta.canonical!;
  // Surface the top 50 skills (was 12) so AI engines have a richer corpus to
  // ground citations in. Each entry carries name + description + URL — the
  // citation body LLMs index. 50 keeps the JSON-LD payload under ~30 KB.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Colaberry AI Skills Catalog",
    url: canonicalUrl,
    description: metaDescription,
    numberOfItems: allSkills.length,
    itemListElement: allSkills.slice(0, 50).map((skill, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SoftwareApplication",
        name: skill.name,
        description: skill.summary || undefined,
        applicationCategory: "AI Skill",
        url: `${siteUrl}/aixcelerator/skills/${skill.slug || skill.id}`,
      },
    })),
  };
  // BreadcrumbList — gives AI engines the "Home → Platform → AI Skills"
  // navigation path for contextual relevance on branded + navigational queries.
  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "AIXcelerator Platform", item: `${siteUrl}/aixcelerator` },
      { "@type": "ListItem", position: 3, name: "AI Skills", item: canonicalUrl },
    ],
  };

  const hasResults = allSkills.length > 0;
  const shownCount = allSkills.length;

  // Build API query params from current filters
  const buildParams = useCallback(
    (page: number) => {
      const params = new URLSearchParams({ page: String(page), sort: sortMode });
      const q = (debouncedSearch ?? "").trim();
      if (q) params.set("q", q);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (tagFilter !== "all") params.set("tag", tagFilter);
      if (visibility !== "all") params.set("visibility", visibility);
      return params;
    },
    [sortMode, debouncedSearch, categoryFilter, statusFilter, sourceFilter, tagFilter, visibility]
  );

  // When any filter/sort changes, reset and fetch page 1 from API
  const filterKey = `${sortMode}|${debouncedSearch}|${categoryFilter}|${statusFilter}|${sourceFilter}|${tagFilter}|${visibility}`;
  const prevFilterKey = useRef(filterKey);
  const initialMount = useRef(true);

  useEffect(() => {
    // On initial mount, fetch page 1 to get full facets and real total
    if (initialMount.current) {
      initialMount.current = false;
      const params = buildParams(1);
      fetch(`/api/skills?${params}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setAllSkills(data.skills);
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

    // On subsequent filter changes, reset and fetch page 1
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      loadingRef.current = true;
      const params = buildParams(1);
      fetch(`/api/skills?${params}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setAllSkills(data.skills);
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

  // Fetch next page on scroll
  const fetchNextPage = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    const params = buildParams(nextPage);
    fetch(`/api/skills?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setAllSkills((prev) => [...prev, ...data.skills]);
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

  // IntersectionObserver for infinite scroll
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd).replace(/</g, "\\u003c") }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "What are AI skills and how do they differ from AI agents?",
              acceptedAnswer: {
                "@type": "Answer",
                text: `AI skills are reusable capability units that agents consume to perform specific tasks — like data extraction, summarization, or code generation. Colaberry AI catalogs ${countLabel} skills across workflow, domain, and orchestration categories. Unlike agents (which are autonomous), skills are composable building blocks that multiple agents can share.`,
              },
            },
            {
              "@type": "Question",
              name: "How can I discover AI skills for my enterprise use case?",
              acceptedAnswer: {
                "@type": "Answer",
                text: `Browse the Colaberry AI skills catalog at ${canonicalUrl}. Filter by category, provider, industry, and status. Each skill profile includes linked MCP servers, prerequisites, and usage metrics to help you evaluate fit for your workflows.`,
              },
            },
          ],
        }).replace(/</g, "\\u003c") }} />
      </Head>

      {fetchError && (
        <div className="mb-6">
          <StatePanel
            variant="error"
            title="Live skill data is temporarily unavailable"
            description="Showing cached catalog entries while we reconnect to the CMS."
            action={
              <button
                type="button"
                onClick={() => router.replace(router.asPath)}
                className="btn btn-secondary btn-sm"
              >
                Retry
              </button>
            }
          />
        </div>
      )}

      <div className="reveal grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Skills catalog"
            title="AI Skills Catalog"
            description="Browse Colaberry's governed catalog of AI skills with structured metadata, lifecycle status, and enterprise-grade discovery for agents and workflows."
          />
        </div>
        <div className="hidden lg:block">
          <MiniOntologyDiagram
            config={SKILL_ONTOLOGY_CONFIG}
            categoryCounts={skillCategoryCounts}
            totalItems={catalogTotal}
          />
        </div>
      </div>

      <AeoQuickAnswer
        question="Where can I browse the Colaberry AI skills catalog?"
        answer={`Browse the Colaberry AI skills catalog at ${canonicalUrl}. The catalog includes ${countLabel} reusable AI skills with provider details, prerequisites, linked agents, linked MCP servers, and structured metadata for enterprise discovery.`}
        facts={[`${countLabel} skills`, `${categories.length} categories`, "Catalog page", "Structured metadata"]}
      />

      <CatalogSnapshot
        stats={[
          { label: "Skills", value: catalogTotal.toLocaleString(), note: "Versioned catalog" },
          { label: "Categories", value: String(categories.length), note: "Domain-aligned" },
          { label: "Visibility", value: `${visibilityCounts.public ?? 0} public`, note: allowPrivate ? `${visibilityCounts.private ?? 0} private` : "Private hidden" },
        ]}
      />

      <section className="reveal surface-panel mt-6 p-6 sm:mt-8">
        <SectionHeader
          kicker="Filters"
          title="Search and filter"
          description="Find skills by category, status, tags, and visibility."
          size="md"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12">
          <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
            <label htmlFor="skill-search" className="sr-only">
              Search skills
            </label>
            <div className="relative group">
              <input
                id="skill-search"
                name="skill-search"
                type="search"
                placeholder="Search skills, categories, tags..."
                value={effectiveSearch}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                className="w-full rounded-lg border border-zinc-200/80 bg-zinc-50 px-4 py-2 pr-11 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:placeholder:text-zinc-500"
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 dark:text-zinc-500"
                fill="none"
              >
                <path
                  d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M16.25 16.25 21 21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="skill-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="skill-category"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
              }}
              className="w-full rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category.toLowerCase()}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="skill-status" className="sr-only">
              Filter by status
            </label>
            <select
              id="skill-status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
              }}
              className="w-full rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="skill-source" className="sr-only">
              Filter by source
            </label>
            <select
              id="skill-source"
              value={sourceFilter}
              onChange={(event) => {
                setSourceFilter(event.target.value);
              }}
              className="w-full rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
            >
              <option value="all">All sources</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source.charAt(0).toUpperCase() + source.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {tagOptions.length > 0 && (
            <div className="lg:col-span-2">
              <label htmlFor="skill-tag" className="sr-only">
                Filter by tag
              </label>
              <select
                id="skill-tag"
                value={tagFilter}
                onChange={(event) => {
                  setTagFilter(event.target.value);
                }}
                className="w-full rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
              >
                <option value="all">All tags</option>
                {tagOptions.map((tag) => (
                  <option key={tag.value} value={tag.value}>
                    {tag.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Sort
          </span>
          {(
            [
              { value: "trending", label: "Trending" },
              { value: "latest", label: "Latest" },
              { value: "alphabetical", label: "A-Z" },
            ] as { value: SkillSortMode; label: string }[]
          ).map((option) => {
            const active = sortMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSortMode(option.value);
                }}
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
        {allowPrivate && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["all", "public", "private"] as const).map((option) => {
              const active = visibility === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setVisibility(option);
                  }}
                  aria-pressed={active}
                  className={`chip focus-ring rounded-md px-3 py-1 text-xs font-semibold ${
                    active ? "chip-brand" : "chip-muted"
                  }`}
                >
                  {option === "all" ? "All" : option === "public" ? "Public" : "Private"}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500" aria-live="polite">
          Showing {shownCount} of {displayTotal.toLocaleString()} (catalog {catalogTotal.toLocaleString()})
        </div>
      </section>

      <div className="stagger-grid mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {allSkills.map((s) => (
          <SkillCard key={s.slug || String(s.id)} skill={s} />
        ))}
      </div>

      {!hasResults && (
        <div className="mt-6">
          <StatePanel
            variant="empty"
            title="No skills match these filters"
            description="Try clearing filters, switching visibility, or using a shorter search query."
          />
        </div>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        {hasResults ? (
          hasMore ? (
            <button
              type="button"
              onClick={fetchNextPage}
              className="btn btn-secondary"
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load more skills"}
            </button>
          ) : (
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              End of results
            </div>
          )
        ) : null}
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
      </div>

      <EnterpriseCtaBand
        kicker="Enterprise AI platform"
        title="Build, govern, and scale AI programs from one operating layer"
        description="Colaberry aligns strategy, catalog discovery, and production workflows across agents, MCP, skills, and evidence-backed resources."
        primaryHref="/request-demo"
        primaryLabel="Request demo"
        secondaryHref="/aixcelerator"
        secondaryLabel="Explore platform"
        className="mt-10"
      />
    </Layout>
  );
}

function toSkillListItem(skill: Skill): Skill {
  return {
    id: skill.id,
    name: skill.name,
    slug: skill.slug,
    summary: clipText(skill.summary, 220),
    category: skill.category ?? null,
    provider: skill.provider ?? null,
    skillType: skill.skillType ?? null,
    industry: skill.industry ?? null,
    rating: typeof skill.rating === "number" ? skill.rating : null,
    usageCount: typeof skill.usageCount === "number" ? skill.usageCount : null,
    lastUpdated: skill.lastUpdated ?? null,
    status: skill.status ?? null,
    visibility: skill.visibility ?? null,
    source: skill.source ?? null,
    sourceName: skill.sourceName ?? null,
    verified: skill.verified ?? null,
    tags: skill.tags ?? [],
    companies: skill.companies ?? [],
    agents: skill.agents ?? [],
    mcpServers: skill.mcpServers ?? [],
    useCases: skill.useCases ?? [],
  };
}

function clipText(value?: string | null, limit = 220) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}...`;
}
