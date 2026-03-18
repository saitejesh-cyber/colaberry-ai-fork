import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Layout from "../../../../components/Layout";
import EnterprisePageHero from "../../../../components/EnterprisePageHero";
import EnterpriseCtaBand from "../../../../components/EnterpriseCtaBand";
import SkillCard from "../../../../components/SkillCard";
import { fetchSkillBySlug, Skill } from "../../../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../../lib/seo";
import { SKILL_COLLECTIONS, type SkillCollection } from "../../../../data/skill-collections";
import { SKILL_CATEGORIES } from "../../../../data/skill-taxonomy";

type CollectionDetailProps = {
  collection: SkillCollection;
  skills: Skill[];
};

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: SKILL_COLLECTIONS.map((c) => ({ params: { slug: c.slug } })),
  fallback: "blocking",
});

export const getStaticProps: GetStaticProps<CollectionDetailProps> = async ({ params }) => {
  const slug = String(params?.slug || "");
  const collection = SKILL_COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) return { notFound: true, revalidate: 120 };

  const skills: Skill[] = [];
  for (const skillSlug of collection.skillSlugs) {
    try {
      const skill = await fetchSkillBySlug(skillSlug);
      if (skill) skills.push(skill);
    } catch {
      // Skill not found in CMS — skip
    }
  }

  return {
    props: { collection, skills },
    revalidate: 600,
  };
};

export default function CollectionDetailPage({ collection, skills }: CollectionDetailProps) {
  const category = SKILL_CATEGORIES.find((c) => c.slug === collection.category);
  const difficultyLabel = collection.difficulty.charAt(0).toUpperCase() + collection.difficulty.slice(1);

  const seoMeta: SeoMeta = {
    title: `${collection.name} | Skill Collections | Colaberry AI`,
    description: collection.description,
    canonical: buildCanonical(`/aixcelerator/skills/collections/${collection.slug}`),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>

      <EnterprisePageHero
        kicker="Skill collection"
        title={collection.name}
        description={collection.description}
      />

      {/* Collection metadata */}
      <div className="reveal mt-6 flex flex-wrap items-center gap-3">
        {category && (
          <span className="chip chip-neutral rounded-full px-3 py-1.5 text-xs font-semibold">
            {category.label}
          </span>
        )}
        <span className="chip chip-neutral rounded-full px-3 py-1.5 text-xs font-semibold">
          {difficultyLabel}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {collection.skillSlugs.length} skills in this collection
          {skills.length < collection.skillSlugs.length && ` · ${skills.length} available in catalog`}
        </span>
      </div>

      {/* Skills grid */}
      {skills.length > 0 ? (
        <section className="reveal mt-8">
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Skills in this collection
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill, index) => (
              <div key={skill.id} className="relative">
                <div className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900 z-10">
                  {index + 1}
                </div>
                <SkillCard skill={skill} />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="reveal mt-8 surface-panel p-8 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Skills in this collection are being populated. Check back as the catalog grows.
          </p>
          <Link
            href="/aixcelerator/skills"
            className="mt-4 inline-block text-sm font-semibold text-[#DC2626] hover:underline"
          >
            Browse all skills →
          </Link>
        </section>
      )}

      {/* Relationship context */}
      {skills.length > 1 && (
        <section className="reveal mt-8 surface-panel p-6">
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            How these skills connect
          </h2>
          <div className="mt-4 space-y-2">
            {skills.map((skill, index) => {
              if (index === skills.length - 1) return null;
              const next = skills[index + 1];
              return (
                <div
                  key={skill.id}
                  className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
                >
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{skill.name}</span>
                  <span className="text-zinc-400">→ compose_with →</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{next.name}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <EnterpriseCtaBand
        kicker="Skill collections"
        title="Explore more skill bundles"
        description="Browse curated collections of AI skills designed to work together."
        primaryHref="/aixcelerator/skills"
        primaryLabel="Browse all skills"
        secondaryHref="/aixcelerator"
        secondaryLabel="Explore the platform"
        className="mt-16"
      />
    </Layout>
  );
}
