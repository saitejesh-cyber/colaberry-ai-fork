/**
 * Solution Stack Detail — Shows a cross-type bundle with items from multiple content types.
 */

import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Layout from "../../../components/Layout";
import EnterprisePageHero from "../../../components/EnterprisePageHero";
import EnterpriseCtaBand from "../../../components/EnterpriseCtaBand";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { SOLUTION_STACKS } from "../../../data/solution-stacks";
import { CONTENT_TYPE_META } from "../../../lib/ontologyRegistry";
import type { SolutionStack, ContentTypeName } from "../../../lib/ontologyTypes";
import ContentTypeIcon from "../../../components/ContentTypeIcon";

type Props = {
  stack: SolutionStack;
};

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: SOLUTION_STACKS.map((s) => ({ params: { slug: s.slug } })),
  fallback: "blocking",
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = String(params?.slug || "");
  const stack = SOLUTION_STACKS.find((s) => s.slug === slug);
  if (!stack) return { notFound: true, revalidate: 120 };
  return { props: { stack }, revalidate: 600 };
};

const TYPE_PATHS: Record<ContentTypeName, string> = {
  skill: "/aixcelerator/skills",
  agent: "/aixcelerator/agents",
  mcp: "/aixcelerator/mcp",
  tool: "/aixcelerator/tools",
  podcast: "/resources/podcasts",
};

export default function SolutionStackDetailPage({ stack }: Props) {
  const seoMeta: SeoMeta = {
    title: `${stack.name} | Solution Stacks | Colaberry AI`,
    description: stack.description,
    canonical: buildCanonical(`/aixcelerator/solution-stacks/${stack.slug}`),
  };

  // Group items by content type
  const grouped = stack.items.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<ContentTypeName, typeof stack.items>);

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>

      <EnterprisePageHero
        kicker="Solution Stack"
        title={stack.name}
        description={stack.description}
      />

      {/* Keyword tags */}
      <div className="reveal mt-6 flex flex-wrap gap-2">
        {stack.keywordTags.map((tag) => (
          <span key={tag} className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{tag}</span>
        ))}
      </div>

      {/* Items grouped by type */}
      {stack.items.length > 0 ? (
        Object.entries(grouped).map(([type, items]) => {
          const meta = CONTENT_TYPE_META[type as ContentTypeName];
          return (
            <section key={type} className="reveal mt-8">
              <h2 className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                <ContentTypeIcon type={type as ContentTypeName} size={14} className="opacity-60" /> {meta?.label || type}
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <Link
                    key={`${item.type}:${item.slug}`}
                    href={`${TYPE_PATHS[item.type as ContentTypeName] || "/aixcelerator/skills"}/${item.slug}`}
                    className="catalog-card p-4 block"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta?.color || "#a1a1aa" }} />
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{item.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <section className="reveal mt-8 surface-panel p-8 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Items in this solution stack are being curated. The stack describes the recommended combination of content types for this use case.
          </p>
          <Link href="/aixcelerator/ontology" className="mt-4 inline-block text-sm font-semibold text-[#DC2626] hover:underline">
            Explore platform ontology →
          </Link>
        </section>
      )}

      <EnterpriseCtaBand
        kicker="Solution stacks"
        title="Explore more solution stacks"
        description="Browse cross-type bundles designed to solve real-world challenges end-to-end."
        primaryHref="/aixcelerator/solution-stacks"
        primaryLabel="All solution stacks"
        secondaryHref="/aixcelerator/ontology"
        secondaryLabel="Platform ontology"
        className="mt-16"
      />
    </Layout>
  );
}
