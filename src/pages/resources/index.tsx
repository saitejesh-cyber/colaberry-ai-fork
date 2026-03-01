import type { GetStaticProps } from "next";
import Link from "next/link";
import Layout from "../../components/Layout";
import Head from "next/head";
import PremiumMediaCard from "../../components/PremiumMediaCard";
import EnterpriseCtaBand from "../../components/EnterpriseCtaBand";
import EnterprisePageHero from "../../components/EnterprisePageHero";
import { heroImage } from "../../lib/media";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";
import { fetchPodcastEpisodes, fetchArticles, fetchBooks, fetchCaseStudies } from "../../lib/cms";

type ResourceCounts = {
  podcasts: number;
  articles: number;
  books: number;
  caseStudies: number;
};
type ResourcesProps = { counts: ResourceCounts };

export const getStaticProps: GetStaticProps<ResourcesProps> = async () => {
  const counts: ResourceCounts = { podcasts: 0, articles: 0, books: 0, caseStudies: 0 };
  try {
    const [pods, arts, bks, cs] = await Promise.allSettled([
      fetchPodcastEpisodes(),
      fetchArticles(),
      fetchBooks(),
      fetchCaseStudies(),
    ]);
    if (pods.status === "fulfilled") counts.podcasts = pods.value.length;
    if (arts.status === "fulfilled") counts.articles = arts.value.length;
    if (bks.status === "fulfilled") counts.books = bks.value.length;
    if (cs.status === "fulfilled") counts.caseStudies = cs.value.length;
  } catch {}
  return { props: { counts }, revalidate: 600 };
};

export default function Resources({ counts }: ResourcesProps) {
  const resourceHighlights = [
    {
      href: "/resources/podcasts",
      title: "Podcasts + transcripts",
      description: `${counts.podcasts > 0 ? `${counts.podcasts} episodes. ` : ""}Searchable conversations tied to agents and MCP servers.`,
      meta: "Audio",
      image: heroImage("hero-podcasts-cinematic.webp"),
    },
    {
      href: "/resources/white-papers",
      title: "White papers + POVs",
      description: "Technical guidance, frameworks, and executive summaries.",
      meta: "Research",
      image: heroImage("hero-whitepapers-cinematic.webp"),
    },
    {
      href: "/resources/articles",
      title: "Articles + analysis",
      description: `${counts.articles > 0 ? `${counts.articles} articles. ` : ""}CMS-backed articles, practical notes, and implementation updates.`,
      meta: "Editorial",
      image: heroImage("hero-updates-cinematic.webp"),
    },
    {
      href: "/resources/case-studies",
      title: "Case studies",
      description: `${counts.caseStudies > 0 ? `${counts.caseStudies} studies. ` : ""}Outcome stories with measurable impact and context.`,
      meta: "Outcomes",
      image: heroImage("hero-case-studies-cinematic.webp"),
    },
    {
      href: "/resources/books",
      title: "Books + artifacts",
      description: `${counts.books > 0 ? `${counts.books} titles. ` : ""}Reference material, templates, and delivery assets.`,
      meta: "Artifacts",
      image: heroImage("hero-books-cinematic.webp"),
    },
  ];

  const seoMeta: SeoMeta = {
    title: "Resources | Colaberry AI - Podcasts, Books, White Papers, Case Studies",
    description: "Explore Colaberry AI resources: podcasts with transcripts, white papers, books, case studies, and articles on enterprise AI agents, MCP servers, and skills.",
    canonical: buildCanonical("/resources"),
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
          "name": "Colaberry AI Resources",
          "description": "Enterprise AI knowledge resources: podcasts, books, white papers, case studies, and articles.",
          "url": `${process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai"}/resources`,
        }) }} />
      </Head>
      <EnterprisePageHero
        kicker="Modular layer"
        title="Resources"
        description="A structured knowledge layer for podcasts, books, white papers, case studies, and editorial signals-ready for teams, SEO, and LLM indexing."
        image={heroImage("hero-resources-cinematic.webp")}
        alt="Research workspace overview"
        imageKicker="Knowledge hub"
        imageTitle="Research and artifacts"
        imageDescription="Podcasts, books, white papers, and curated signals in one governed publishing surface."
        chips={["Podcasts", "White papers", "Books", "Case studies", "Articles"]}
        primaryAction={{ label: "Browse podcasts", href: "/resources/podcasts" }}
        secondaryAction={{ label: "Open updates feed", href: "/updates", variant: "secondary" }}
        metrics={[
          {
            label: "Resource lanes",
            value: `${resourceHighlights.length}`,
            note: "Core resource surfaces in active navigation.",
          },
          {
            label: "Publishing model",
            value: "Internal + curated",
            note: "Owned content with selective external aggregation.",
          },
          {
            label: "Discovery",
            value: "Search-ready",
            note: "Metadata-first structure for users and assistants.",
          },
        ]}
      />

      <section className="section-spacing grid gap-3 sm:grid-cols-2">
        {resourceHighlights.map((item) => (
          <PremiumMediaCard
            key={item.title}
            href={item.href}
            title={item.title}
            description={item.description}
            image={item.image}
            meta={item.meta}
            size="sm"
          />
        ))}
      </section>

      <div className="surface-panel section-shell section-spacing p-5 sm:p-6">
        <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
          Search resources
        </div>
        <label htmlFor="resource-search" className="sr-only">
          Search resources
        </label>
        <form action="/search" method="get" role="search" className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="resource-search"
            name="q"
            type="search"
            placeholder="Search podcasts, white papers, case studies..."
            aria-describedby="resource-search-help"
            className="input-premium"
          />
          <button type="submit" className="btn btn-primary btn-sm shrink-0">
            Search
          </button>
        </form>
        <p id="resource-search-help" className="mt-2 text-xs text-zinc-500">
          Search routes to the global catalog results page.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
          {["Podcasts", "White papers", "Case studies", "Updates", "Artifacts"].map((label) => (
            <span
              key={label}
              className="chip chip-muted rounded-md border border-zinc-200/80 bg-white px-3 py-1 font-semibold"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="section-spacing grid gap-3 sm:grid-cols-3">
        <ResourceQuickLink href="/solutions" title="Solutions" description="Reusable solution patterns and packaged offerings." />
        <ResourceQuickLink href="/updates" title="News & product" description="Product updates, announcements, and relevant news." />
        <ResourceQuickLink href="/search" title="Search catalog" description="Full-text search across all content types." />
      </div>

      <div className="surface-panel section-shell section-spacing p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-300">
          How this evolves
        </div>
        <div className="mt-3 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
          <div className="section-card rounded-lg p-4">
            <div className="font-semibold text-zinc-900">Internal publishing</div>
            <div className="mt-1 text-zinc-600">
              Structured posting for podcasts, books, white papers, and curated collections.
            </div>
          </div>
          <div className="section-card rounded-lg p-4">
            <div className="font-semibold text-zinc-900">External aggregation</div>
            <div className="mt-1 text-zinc-600">
              Pull in relevant sources (feeds, links, announcements) with light editorial control.
            </div>
          </div>
        </div>
      </div>

      <EnterpriseCtaBand
        kicker="Knowledge engine"
        title="Publish faster. Curate better. Keep every resource indexable."
        description="Use one structured workflow for podcasts, articles, white papers, books, and case studies so teams and LLMs can discover trusted content quickly."
        primaryHref="/resources/podcasts"
        primaryLabel="Browse podcasts"
        secondaryHref="/updates"
        secondaryLabel="Open updates feed"
      />
    </Layout>
  );
}

function ResourceQuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="card-feature p-4">
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      <p className="mt-1 text-xs text-zinc-600">{description}</p>
    </Link>
  );
}
