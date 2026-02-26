import Layout from "../../components/Layout";
import Head from "next/head";
import PremiumMediaCard from "../../components/PremiumMediaCard";
import EnterpriseCtaBand from "../../components/EnterpriseCtaBand";
import EnterprisePageHero from "../../components/EnterprisePageHero";
import { heroImage } from "../../lib/media";

export default function Resources() {
  const resourceHighlights = [
    {
      href: "/resources/podcasts",
      title: "Podcasts + transcripts",
      description: "Searchable conversations tied to agents and MCP servers.",
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
      description: "CMS-backed articles, practical notes, and implementation updates.",
      meta: "Editorial",
      image: heroImage("hero-updates-cinematic.webp"),
    },
    {
      href: "/resources/case-studies",
      title: "Case studies",
      description: "Outcome stories with measurable impact and context.",
      meta: "Outcomes",
      image: heroImage("hero-case-studies-cinematic.webp"),
    },
    {
      href: "/resources/books",
      title: "Books + artifacts",
      description: "Reference material, templates, and delivery assets.",
      meta: "Artifacts",
      image: heroImage("hero-books-cinematic.webp"),
    },
  ];

  return (
    <Layout>
      <Head>
        <title>Resources | Colaberry AI</title>
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

      <div className="surface-panel section-shell section-spacing p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
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
            className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>
        <p id="resource-search-help" className="mt-2 text-xs text-slate-500">
          Search routes to the global catalog results page.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {["Podcasts", "White papers", "Case studies", "Updates", "Artifacts"].map((label) => (
            <span
              key={label}
              className="chip chip-muted rounded-full border border-slate-200/80 bg-white px-3 py-1 font-semibold"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="section-spacing grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ResourceCard
          href="/resources/podcasts"
          title="Podcasts"
          description="Colaberry AI podcast + curated ai podcast."
          meta="Internal + External"
          image={heroImage("hero-podcasts-cinematic.webp")}
        />
        <ResourceCard
          href="/resources/books"
          title="Books & artifacts"
          description="Books, companion assets, templates, and working artifacts."
          meta="Artifacts"
          image={heroImage("hero-books-cinematic.webp")}
        />
        <ResourceCard
          href="/resources/case-studies"
          title="Case studies"
          description="Outcomes and delivery stories, organized by industry."
          meta="By industry"
          image={heroImage("hero-case-studies-cinematic.webp")}
        />
        <ResourceCard
          href="/resources/white-papers"
          title="White papers"
          description="Technical deep-dives, POVs, and best-practice guidance."
          meta="Research"
          image={heroImage("hero-whitepapers-cinematic.webp")}
        />
        <ResourceCard
          href="/resources/articles"
          title="Articles"
          description="Editorial insights, platform updates, and implementation guidance."
          meta="Editorial"
          image={heroImage("hero-updates-cinematic.webp")}
        />
        <ResourceCard
          href="/solutions"
          title="Solutions"
          description="Reusable solution patterns and packaged offerings."
          meta="Playbooks"
          image={heroImage("hero-solutions-cinematic.webp")}
        />
        <ResourceCard
          href="/updates"
          title="News & product"
          description="A single feed for product updates, announcements, and relevant news."
          meta="Aggregator"
          image={heroImage("hero-updates-cinematic.webp")}
        />
      </div>

      <div className="surface-panel section-shell section-spacing p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
          How this evolves
        </div>
        <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div className="section-card rounded-2xl p-4">
            <div className="font-semibold text-slate-900">Internal publishing</div>
            <div className="mt-1 text-slate-600">
              Structured posting for podcasts, books, white papers, and curated collections.
            </div>
          </div>
          <div className="section-card rounded-2xl p-4">
            <div className="font-semibold text-slate-900">External aggregation</div>
            <div className="mt-1 text-slate-600">
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

function ResourceCard({
  href,
  title,
  description,
  meta,
  image,
}: {
  href: string;
  title: string;
  description: string;
  meta: string;
  image: string;
}) {
  return (
    <PremiumMediaCard
      href={href}
      title={title}
      description={description}
      meta={meta}
      image={image}
      size="sm"
    />
  );
}
