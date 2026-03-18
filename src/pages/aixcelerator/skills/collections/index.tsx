import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Layout from "../../../../components/Layout";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../../lib/seo";
import { SKILL_COLLECTIONS, type SkillCollection } from "../../../../data/skill-collections";
import { SKILL_CATEGORIES } from "../../../../data/skill-taxonomy";

export default function CollectionsIndexPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Unique categories that have collections
  const categoryFilters = useMemo(() => {
    const catSlugs = new Set(SKILL_COLLECTIONS.map((c) => c.category));
    return SKILL_CATEGORIES.filter((c) => catSlugs.has(c.slug));
  }, []);

  // Filtered collections
  const filtered = useMemo(() => {
    let result = SKILL_COLLECTIONS;

    if (selectedCategory) {
      result = result.filter((c) => c.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.slug.includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.keywordTags.some((t) => t.includes(q)),
      );
    }

    return result;
  }, [searchQuery, selectedCategory]);

  const totalSkills = useMemo(
    () => new Set(SKILL_COLLECTIONS.flatMap((c) => c.skillSlugs)).size,
    [],
  );

  const seoMeta: SeoMeta = {
    title: "Skill Collections | Colaberry AI",
    description: "Curated skill collections for real-world scenarios, each paired with a skill relation graph.",
    canonical: buildCanonical("/aixcelerator/skills/collections"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>

      {/* Header */}
      <div className="reveal text-center">
        <h1 className="text-display-md font-semibold text-zinc-900 dark:text-zinc-50">
          Skill Collection
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-body-lg text-zinc-500 dark:text-zinc-400">
          Curated skill collections for real-world scenarios, each paired with a skill relation graph.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700">
          <span className="font-bold text-zinc-900 dark:text-zinc-50">{SKILL_COLLECTIONS.length}</span>
          <span className="text-zinc-500 dark:text-zinc-400">Collections</span>
          <span className="mx-1 text-zinc-300 dark:text-zinc-600">|</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-50">{totalSkills}</span>
          <span className="text-zinc-500 dark:text-zinc-400">Total Skills</span>
        </div>
      </div>

      {/* Search + Category Filter Bar */}
      <div className="reveal mt-8 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search collections..."
          className="h-9 w-64 rounded-full border border-zinc-300 bg-white px-4 text-xs text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
        />

        {/* Category pills */}
        <button
          onClick={() => setSelectedCategory(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            !selectedCategory
              ? "bg-[#DC2626]/10 text-[#DC2626] ring-1 ring-[#DC2626]/20 dark:text-[#F87171]"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          }`}
        >
          All
        </button>
        {categoryFilters.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setSelectedCategory(selectedCategory === cat.slug ? null : cat.slug)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === cat.slug
                ? "bg-[#DC2626]/10 text-[#DC2626] ring-1 ring-[#DC2626]/20 dark:text-[#F87171]"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {cat.label}
          </button>
        ))}

        {(searchQuery || selectedCategory) && (
          <button
            onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="reveal mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        Showing {filtered.length} collections
        {filtered.length !== SKILL_COLLECTIONS.length && ` of ${SKILL_COLLECTIONS.length}`}
        {" | "}
        {new Set(filtered.flatMap((c) => c.skillSlugs)).size} total skills
      </p>

      {/* Collection Cards Grid */}
      <section className="reveal mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((collection) => (
          <CollectionCard key={collection.slug} collection={collection} />
        ))}
      </section>

      {filtered.length === 0 && (
        <div className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No collections match your search. Try a different query or clear filters.
        </div>
      )}

      <div className="reveal mt-10 text-center">
        <Link
          href="/aixcelerator/skills"
          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          ← Back to Skills Catalog
        </Link>
      </div>
    </Layout>
  );
}

/* ── Collection Card ─────────────────────────────────────────────────── */

function CollectionCard({ collection }: { collection: SkillCollection }) {
  const category = SKILL_CATEGORIES.find((c) => c.slug === collection.category);
  const MAX_TAGS = 5;
  const visibleTags = collection.keywordTags.slice(0, MAX_TAGS);
  const hiddenCount = Math.max(0, collection.keywordTags.length - MAX_TAGS);

  return (
    <Link
      href={`/aixcelerator/skills/collections/${collection.slug}`}
      className="group block"
    >
      <div className="catalog-card flex h-full flex-col p-5">
        {/* Header: name + skill count badge */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {collection.slug}
          </h2>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
              <path d="M8 2a6 6 0 100 12A6 6 0 008 2z" fill="currentColor" opacity="0.2" />
              <path d="M8 4v4l3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
            {collection.skillSlugs.length}
          </span>
        </div>

        {/* Description */}
        <p className="mt-2 flex-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-3">
          {collection.description}
        </p>

        {/* Category + keyword tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {category && (
            <span className="rounded-full bg-[#DC2626]/10 px-2 py-0.5 text-[10px] font-semibold text-[#DC2626] dark:bg-[#DC2626]/20 dark:text-[#F87171]">
              {category.label}
            </span>
          )}
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {tag}
            </span>
          ))}
          {hiddenCount > 0 && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              +{hiddenCount} more
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-zinc-200/60 pt-3 dark:border-zinc-700/50">
          <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M4 8h8M8 4v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
            {collection.skillSlugs.length} skills
          </span>
          <span className="text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  );
}
