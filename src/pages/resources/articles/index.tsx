import type { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Layout from "../../../components/Layout";
import EnterprisePageHero from "../../../components/EnterprisePageHero";
import StatePanel from "../../../components/StatePanel";

import { Article, fetchArticles } from "../../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";

type ArticlesPageProps = {
  articles: Article[];
  fetchError: boolean;
};

export const getStaticProps: GetStaticProps<ArticlesPageProps> = async () => {
  let articles: Article[] = [];
  let fetchError = false;

  try {
    articles = await fetchArticles({ maxRecords: 80 });
  } catch {
    fetchError = true;
  }

  return {
    props: {
      articles,
      fetchError,
    },
    revalidate: 600,
  };
};

export default function ArticlesPage({ articles, fetchError }: ArticlesPageProps) {
  const seoMeta: SeoMeta = {
    title: "Articles | Colaberry AI",
    description: "Enterprise AI articles, analyses, and practical implementation guidance from Colaberry AI.",
    canonical: buildCanonical("/resources/articles"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Colaberry AI Articles",
          "description": "Enterprise AI articles, analyses, and practical implementation guidance.",
          "url": `${process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai"}/resources/articles`,
        }) }} />
      </Head>

      <EnterprisePageHero
        kicker="Resources"
        title="Articles"
        description="Analysis, implementation notes, and practical guidance for teams deploying agents, MCP systems, and use-case workflows."
        chips={["Analysis", "Implementation notes", "Product signals", "LLM-indexable content"]}
        primaryAction={{ label: "Open updates feed", href: "/updates" }}
        secondaryAction={{ label: "Back to resources", href: "/resources", variant: "secondary" }}
        metrics={[
          {
            label: "Published articles",
            value: String(articles.length),
            note: "Current content in this feed.",
          },
          {
            label: "Publishing source",
            value: "Strapi CMS",
            note: "Structured and metadata-first.",
          },
          {
            label: "Refresh window",
            value: "10m",
            note: "Static regeneration cadence.",
          },
        ]}
      />

      {fetchError ? (
        <div className="section-spacing">
          <StatePanel
            variant="error"
            title="Articles are temporarily unavailable"
            description="The CMS feed could not be reached. Please retry in a few minutes."
          />
        </div>
      ) : null}

      {articles.length === 0 ? (
        <div className="section-spacing">
          <StatePanel
            variant="empty"
            title="No articles published yet"
            description="Publish articles in CMS and they will appear here automatically."
          />
        </div>
      ) : (
        <div className="section-spacing grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => {
            const category = article.category?.name || "Article";
            const updatedLabel = formatDateLabel(article.updatedAt || article.publishedAt);
            return (
              <Link
                key={article.id}
                href={`/resources/articles/${article.slug}`}
                className="card-feature group p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="chip chip-muted rounded-md border border-zinc-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
                    {category}
                  </span>
                  {updatedLabel ? (
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
                      {updatedLabel}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 text-[0.9375rem] font-semibold text-zinc-900">{article.title}</div>
                <p className="mt-2 line-clamp-3 text-sm text-zinc-600">
                  {article.description || "Open this article to read the full content."}
                </p>
                {article.author?.name ? (
                  <p className="mt-3 text-xs font-medium text-zinc-500">By {article.author.name}</p>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}

      <div className="section-spacing flex flex-col gap-3 sm:flex-row">
        <Link href="/resources" className="btn btn-secondary">
          Back to Resources
        </Link>
        <Link href="/updates" className="btn btn-primary">
          View News & Product
        </Link>
      </div>
    </Layout>
  );
}

function formatDateLabel(value?: string | null) {
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
