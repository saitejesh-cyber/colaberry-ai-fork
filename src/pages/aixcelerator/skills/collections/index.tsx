import Head from "next/head";
import Link from "next/link";
import Layout from "../../../../components/Layout";
import SectionHeader from "../../../../components/SectionHeader";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../../lib/seo";
import { SKILL_COLLECTIONS } from "../../../../data/skill-collections";
import { SKILL_CATEGORIES } from "../../../../data/skill-taxonomy";

const totalSkills = SKILL_COLLECTIONS.reduce((sum, c) => sum + c.skillSlugs.length, 0);

export default function CollectionsIndexPage() {
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

      <p className="reveal mt-8 text-sm text-zinc-500 dark:text-zinc-400">
        Showing {SKILL_COLLECTIONS.length} collections | {totalSkills} total skills
      </p>

      <section className="reveal mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SKILL_COLLECTIONS.map((collection) => {
          const category = SKILL_CATEGORIES.find((c) => c.slug === collection.category);
          return (
            <Link
              key={collection.slug}
              href={`/aixcelerator/skills/collections/${collection.slug}`}
              className="group block"
            >
              <div className="catalog-card flex h-full flex-col p-5">
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

                <p className="mt-2 flex-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {collection.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {category && (
                    <span className="rounded-full bg-[#DC2626]/10 px-2 py-0.5 text-[10px] font-semibold text-[#DC2626] dark:bg-[#DC2626]/20 dark:text-[#F87171]">
                      {category.label}
                    </span>
                  )}
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {collection.difficulty}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    curated
                  </span>
                </div>

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
        })}
      </section>

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
