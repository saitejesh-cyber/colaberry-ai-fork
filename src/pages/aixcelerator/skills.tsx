import type { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../components/Layout";
import CatalogSnapshot from "../../components/CatalogSnapshot";
import SectionHeader from "../../components/SectionHeader";
import StatePanel from "../../components/StatePanel";
import SkillCard from "../../components/SkillCard";
import { fetchSkills, Skill } from "../../lib/cms";
import { toSkillFamily } from "../../lib/catalogFormatters";
import { SKILL_CATEGORIES, classifySkill } from "../../data/skill-taxonomy";
import { SKILL_COLLECTIONS } from "../../data/skill-collections";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";

type SkillsPageProps = {
  skills: Skill[];
  allowPrivate: boolean;
  fetchError: boolean;
};

type VisibilityFilter = "all" | "public" | "private";
type SkillSortMode = "alphabetical" | "latest" | "trending";

const PAGE_SIZE = 24;

export const getStaticProps: GetStaticProps<SkillsPageProps> = async () => {
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";

  try {
    const skills = (await fetchSkills(visibilityFilter, { sortBy: "latest" }))
      .filter((item) => Boolean(item.name && item.slug))
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        slug: item.slug.trim(),
      }));

    return {
      props: { skills, allowPrivate, fetchError: false },
      revalidate: 600,
    };
  } catch (error) {
    console.error("[skills:getStaticProps] fetchSkills failed", error);
    return {
      props: { skills: [], allowPrivate, fetchError: true },
      revalidate: 120,
    };
  }
};

export default function SkillsPage({ skills, allowPrivate, fetchError }: SkillsPageProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [taxonomyFilter, setTaxonomyFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [visibility, setVisibility] = useState<VisibilityFilter>(allowPrivate ? "all" : "public");
  const [sortMode, setSortMode] = useState<SkillSortMode>("trending");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const categories = useMemo(
    () =>
      Array.from(new Set(skills.map((item) => (item.category || toSkillFamily(item)).trim())))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [skills]
  );

  const taxonomyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const skill of skills) {
      const cat = classifySkill(skill);
      counts[cat.slug] = (counts[cat.slug] ?? 0) + 1;
    }
    return counts;
  }, [skills]);

  const providers = useMemo(
    () =>
      Array.from(new Set(skills.map((item) => (item.provider || item.sourceName || "Unknown").trim())))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [skills]
  );

  const scopedSkills = useMemo(
    () => filterSkillsByVisibility(skills, allowPrivate, visibility),
    [allowPrivate, skills, visibility]
  );

  const visibilityCounts = useMemo(
    () =>
      skills.reduce<Record<string, number>>((acc, item) => {
        const key = (item.visibility || "public").toLowerCase();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    [skills]
  );

  const filteredSkills = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopedSkills.filter((item) => {
      const category = item.category || toSkillFamily(item);
      const provider = item.provider || item.sourceName || "Unknown";
      const categoryMatch = categoryFilter === "all" ? true : category === categoryFilter;
      const providerMatch = providerFilter === "all" ? true : provider === providerFilter;
      const taxonomyMatch = taxonomyFilter === "all" ? true : classifySkill(item).slug === taxonomyFilter;
      const queryMatch =
        query.length === 0
          ? true
          : [
              item.name,
              item.summary,
              item.longDescription,
              item.category,
              item.skillType,
              item.provider,
              item.industry,
              item.status,
              item.inputs,
              item.outputs,
              item.toolsRequired,
              ...(item.tags || []).map((tag) => tag.name || tag.slug || ""),
              ...(item.companies || []).map((company) => company.name || company.slug || ""),
              ...(item.agents || []).map((agent) => agent.name || agent.slug || ""),
              ...(item.mcpServers || []).map((mcp) => mcp.name || mcp.slug || ""),
              ...(item.useCases || []).map((useCase) => useCase.name || useCase.slug || ""),
            ]
              .join(" ")
              .toLowerCase()
              .includes(query);

      return categoryMatch && providerMatch && taxonomyMatch && queryMatch;
    });
  }, [categoryFilter, providerFilter, taxonomyFilter, scopedSkills, search]);

  const sortedSkills = useMemo(
    () => sortSkills(filteredSkills, sortMode),
    [filteredSkills, sortMode]
  );
  const _latestSkills = useMemo(() => sortSkills(scopedSkills, "latest").slice(0, 6), [scopedSkills]);
  const _trendingSkills = useMemo(() => sortSkills(scopedSkills, "trending").slice(0, 6), [scopedSkills]);
  const shownCount = Math.min(visibleCount, sortedSkills.length);
  const visibleSkills = useMemo(() => sortedSkills.slice(0, shownCount), [shownCount, sortedSkills]);
  const hasMore = shownCount < sortedSkills.length;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sortedSkills.length));
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, sortedSkills.length]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const canonicalUrl = `${siteUrl}/aixcelerator/skills`;
  const seoMeta: SeoMeta = {
    title: "AI Skills Catalog | Colaberry AI",
    description: "Discover reusable AI skills across official toolkits, developer workflows, domain operations, and agent orchestration patterns.",
    canonical: buildCanonical("/aixcelerator/skills"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": "Colaberry AI Skills Catalog",
              "description": "Discover reusable AI skills across official toolkits, developer workflows, domain operations, and agent orchestration patterns.",
              "url": canonicalUrl,
            }),
          }}
        />
      </Head>

      {fetchError ? (
        <div className="mb-6">
          <StatePanel
            variant="error"
            title="Skills data is temporarily unavailable"
            description="Showing available catalog surfaces while the skills feed reconnects."
          />
        </div>
      ) : null}

      <div className="reveal grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Skills layer"
            title="AI Skills Catalog"
            description="Reusable capability units for agents and workflows: official pre-built skills, developer workflow skills, domain skills, and orchestration skills."
          />
          <Link
            href="/aixcelerator/skills/graph"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
              <circle cx="4" cy="4" r="2" fill="currentColor" />
              <circle cx="12" cy="4" r="2" fill="currentColor" />
              <circle cx="8" cy="12" r="2" fill="currentColor" />
              <line x1="5.5" y1="5" x2="7" y2="10.5" stroke="currentColor" strokeWidth="1" />
              <line x1="10.5" y1="5" x2="9" y2="10.5" stroke="currentColor" strokeWidth="1" />
            </svg>
            View skill graph
          </Link>
          <Link
            href="/aixcelerator/skills/ontology"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Ontology
          </Link>
          <Link
            href="/aixcelerator/skills/collections"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Collections
          </Link>
        </div>
      </div>

      <CatalogSnapshot
        stats={[
          { label: "Skills", value: skills.length.toLocaleString(), note: "Reusable capability profiles" },
          { label: "Categories", value: String(SKILL_CATEGORIES.filter((c) => (taxonomyCounts[c.slug] ?? 0) > 0).length), note: "SkillNet-inspired taxonomy" },
          { label: "Collections", value: String(SKILL_COLLECTIONS.length), note: "Curated skill bundles" },
          { label: "Visibility", value: `${visibilityCounts.public ?? 0} public`, note: allowPrivate ? `${visibilityCounts.private ?? 0} private` : "Private hidden" },
        ]}
      />

      {/* Featured Collections */}
      <section className="reveal mt-6 sm:mt-8">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          Featured Collections
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SKILL_COLLECTIONS.map((collection) => (
            <Link
              key={collection.slug}
              href={`/aixcelerator/skills/collections/${collection.slug}`}
              className="group block"
            >
              <div className="catalog-card p-5">
                <div className="flex items-center justify-between">
                  <span className="chip chip-neutral rounded-full px-2.5 py-1 text-label font-semibold uppercase tracking-[0.12em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
                    Collection
                  </span>
                  <span className="text-xs font-medium text-zinc-400 capitalize">{collection.difficulty}</span>
                </div>
                <h3 className="mt-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{collection.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{collection.description}</p>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-200/60 pt-2.5 dark:border-zinc-700/50">
                  <span className="text-label font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">{collection.skillSlugs.length} skills</span>
                  <span className="text-label font-semibold text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">View →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Taxonomy category pills */}
      <div className="reveal mt-6 flex flex-wrap gap-2 sm:mt-8">
        <button
          type="button"
          onClick={() => { setTaxonomyFilter("all"); setVisibleCount(PAGE_SIZE); }}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            taxonomyFilter === "all"
              ? "bg-[#DC2626] text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          }`}
        >
          All · {skills.length.toLocaleString()}
        </button>
        {SKILL_CATEGORIES.filter((cat) => (taxonomyCounts[cat.slug] ?? 0) > 0).map((cat) => (
          <button
            key={cat.slug}
            type="button"
            onClick={() => { setTaxonomyFilter(cat.slug); setVisibleCount(PAGE_SIZE); }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              taxonomyFilter === cat.slug
                ? "bg-[#DC2626] text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {cat.label} · {(taxonomyCounts[cat.slug] ?? 0).toLocaleString()}
          </button>
        ))}
      </div>

      <section className="reveal surface-panel mt-4 p-5">
        <div className="grid gap-3 md:grid-cols-[1.45fr_1fr_1fr_auto]">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search skills, models, tools, or linked assets..."
            className="w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:placeholder:text-zinc-500"
            aria-label="Search skills"
          />
          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={providerFilter}
            onChange={(event) => {
              setProviderFilter(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
            aria-label="Filter by provider"
          >
            <option value="all">All providers</option>
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
          <select
            value={sortMode}
            onChange={(event) => {
              setSortMode(event.target.value as SkillSortMode);
              setVisibleCount(PAGE_SIZE);
            }}
            className="w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
            aria-label="Sort skills"
          >
            <option value="trending">Trending</option>
            <option value="latest">Latest</option>
            <option value="alphabetical">A-Z</option>
          </select>
        </div>
        {allowPrivate ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { key: "all", label: "All", count: skills.length },
              { key: "public", label: "Public", count: visibilityCounts.public ?? 0 },
              { key: "private", label: "Private", count: visibilityCounts.private ?? 0 },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setVisibility(item.key as VisibilityFilter);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`chip focus-ring rounded-md px-3 py-1 text-xs font-semibold ${
                  visibility === item.key
                    ? "chip-brand"
                    : "chip-muted"
                }`}
              >
                {item.label} · {item.count}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="reveal stagger-grid mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {visibleSkills.length > 0 ? (
          visibleSkills.map((skill) => <SkillCard key={skill.slug || skill.id} skill={skill} />)
        ) : (
          <div className="sm:col-span-2 lg:col-span-3">
            <StatePanel
              variant="empty"
              title="No matching skills found"
              description="Try broader keywords or reset filters."
            />
          </div>
        )}
      </section>

      <div ref={sentinelRef} className="h-8" />

      {hasMore ? (
        <div className="mt-2 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">
          Showing {shownCount.toLocaleString()} of {sortedSkills.length.toLocaleString()} skills — scroll for more
        </div>
      ) : sortedSkills.length > PAGE_SIZE ? (
        <div className="mt-2 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">
          Showing all {sortedSkills.length.toLocaleString()} skills
        </div>
      ) : null}

    </Layout>
  );
}

function _SkillSignalRail({
  title,
  description,
  items,
  emptyText,
  detailType,
}: {
  title: string;
  description: string;
  items: Skill[];
  emptyText: string;
  detailType: "latest" | "trending";
}) {
  return (
    <article className="card-elevated p-5">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{title}</div>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{emptyText}</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {items.map((skill) => (
            <li key={skill.slug || skill.id}>
              <Link
                href={`/aixcelerator/skills/${skill.slug || skill.id}`}
                className="card-elevated group flex items-center justify-between px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{skill.name}</div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {detailType === "latest"
                      ? formatDate(skill.lastUpdated) || "Updated"
                      : skill.rating
                      ? `R ${skill.rating.toFixed(1)}`
                      : skill.usageCount
                      ? formatUsageLabel(skill.usageCount)
                      : toSkillFamily(skill)}
                  </div>
                </div>
                <span className="ml-3 text-zinc-400 transition-transform group-hover:tranzinc-x-0.5 group-hover:text-brand-deep">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function filterSkillsByVisibility(
  skills: Skill[],
  allowPrivate: boolean,
  visibility: VisibilityFilter
) {
  return skills.filter((item) => {
    const normalized = (item.visibility || "public").toLowerCase();
    if (!allowPrivate) return normalized !== "private";
    if (visibility === "all") return true;
    return normalized === visibility;
  });
}

function sortSkills(skills: Skill[], mode: SkillSortMode) {
  const list = [...skills];
  if (mode === "alphabetical") {
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (mode === "latest") {
    return list.sort((a, b) => compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name));
  }
  return list.sort((a, b) => {
    const delta = scoreTrendingSkill(b) - scoreTrendingSkill(a);
    if (delta !== 0) return delta;
    return compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name);
  });
}

function compareDateDesc(left?: string | null, right?: string | null) {
  return toTimestamp(right) - toTimestamp(left);
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreTrendingSkill(skill: Skill) {
  const ratingScore = typeof skill.rating === "number" ? Math.max(skill.rating, 0) * 18 : 0;
  const usageScore =
    typeof skill.usageCount === "number" && skill.usageCount > 0
      ? Math.log10(skill.usageCount + 1) * 25
      : 0;
  const verifiedScore = skill.verified ? 8 : 0;
  const completenessScore =
    (skill.summary ? 3 : 0) +
    (skill.longDescription ? 6 : 0) +
    (skill.inputs ? 2 : 0) +
    (skill.outputs ? 2 : 0) +
    (skill.toolsRequired ? 2 : 0) +
    (skill.modelsSupported ? 2 : 0);
  const linkageScore = Math.min(
    (skill.agents?.length || 0) * 3 + (skill.mcpServers?.length || 0) * 3 + (skill.useCases?.length || 0) * 4,
    24
  );
  const freshnessScore = (() => {
    const timestamp = toTimestamp(skill.lastUpdated);
    if (!timestamp) return 0;
    const days = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    if (days <= 14) return 12;
    if (days <= 45) return 8;
    if (days <= 90) return 4;
    return 0;
  })();
  return ratingScore + usageScore + verifiedScore + completenessScore + linkageScore + freshnessScore;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatUsageLabel(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

