import Layout from "../components/Layout";
import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { useEffect, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { heroImage } from "../lib/media";

export default function Home() {
  const industries = [
    { name: "Agriculture", slug: "agriculture", icon: "leaf" as const },
    { name: "Energy", slug: "energy", icon: "droplet" as const },
    { name: "Utilities", slug: "utilities", icon: "tower" as const },
    {
      name: "Healthcare & Life Sciences",
      slug: "healthcare-life-sciences",
      icon: "dna" as const,
    },
    { name: "Climate Tech", slug: "climate-tech", icon: "leaf" as const },
    { name: "Manufacturing", slug: "manufacturing", icon: "factory" as const },
    { name: "Fintech", slug: "fintech", icon: "truck" as const },
    { name: "Supply Chain", slug: "supply-chain", icon: "truck" as const },
  ];

  const rootIndustries = [
    "Agriculture",
    "Utilities",
    "Oil & Gas",
    "Biotech",
    "Manufacturing",
    "Supply Chain",
  ];

  const heroTags = [
    "Agents",
    "MCP servers",
    "Podcasts",
    "Case studies",
    "Books",
    "Use cases",
    "Playbooks",
    "Articles",
    "Integrations",
  ];

  const heroSignals = [
    {
      title: "Governed rollout",
      description: "Ownership, status, and readiness signals for every agent deployment.",
      href: "/aixcelerator/agents",
    },
    {
      title: "Connector-ready MCP",
      description: "Standardized MCP servers mapped to tools and workflows.",
      href: "/aixcelerator/mcp",
    },
    {
      title: "Industry workspaces",
      description: "Outcome-driven case studies and domain-aligned playbooks.",
      href: "/industries",
    },
    {
      title: "Knowledge signals",
      description: "Podcasts, white papers, and updates in one discovery layer.",
      href: "/resources",
    },
    {
      title: "Trust-first research",
      description: "Foundational principles that guide responsible AI delivery.",
      href: "/resources/books#trust-before-intelligence",
    },
  ];

  const heroKpis = [
    {
      label: "Catalog coverage",
      value: "Agents + MCP",
      note: "Unified discovery layer for operations and integration teams.",
    },
    {
      label: "Governance posture",
      value: "Enterprise",
      note: "Ownership, verification, and deployment context tracked.",
    },
    {
      label: "Knowledge surface",
      value: "Resources + Updates",
      note: "Signals from podcasts, research, and AI news briefings.",
    },
  ];

  const heroSlides = [
    {
      eyebrow: "Agents",
      title: "Agent operations radar",
      description: "Track ownership, readiness, and evaluation signals in one view.",
      image: heroImage("hero-agents-cinematic.webp"),
      highlight: "Ownership + evals",
      href: "/aixcelerator/agents",
    },
    {
      eyebrow: "MCP",
      title: "Integration surface map",
      description: "Connect tools with standardized MCP server templates and patterns.",
      image: heroImage("hero-mcp-cinematic.webp"),
      highlight: "Connector-ready",
      href: "/aixcelerator/mcp",
    },
    {
      eyebrow: "Knowledge",
      title: "Unified knowledge signals",
      description: "Podcasts, white papers, and updates organized for fast discovery.",
      image: heroImage("hero-resources-cinematic.webp"),
      highlight: "Curated signals",
      href: "/resources",
    },
  ];

  const pillars = [
    {
      title: "Discoverable",
      description: "Every asset is indexed with owners, status, and readiness signals.",
    },
    {
      title: "Categorized",
      description: "Industry and solution tags keep automation patterns easy to explore.",
    },
    {
      title: "Searchable",
      description: "Unified search across agents, MCPs, podcasts, and updates.",
    },
    {
      title: "LLM-readable",
      description: "Structured metadata and summaries ready for agent consumption.",
    },
    {
      title: "Extensible",
      description: "Add new catalogs, workflows, and automations without rework.",
    },
  ];

  const catalogs = [
    {
      href: "/aixcelerator/agents",
      title: "Agents catalog",
      description: "Ownership, runbooks, evaluations, and deployment readiness.",
      meta: "Agents",
      image: heroImage("hero-agents-cinematic.webp"),
    },
    {
      href: "/aixcelerator/mcp",
      title: "MCP integration library",
      description: "Standardized tool access, connectors, and server templates.",
      meta: "MCP",
      image: heroImage("hero-mcp-cinematic.webp"),
    },
    {
      href: "/solutions",
      title: "Use cases + playbooks",
      description: "Solution blueprints mapped to outcomes and operating models.",
      meta: "Solutions",
      image: heroImage("hero-solutions-cinematic.webp"),
    },
    {
      href: "/resources/case-studies",
      title: "Case studies",
      description: "Outcome stories with measurable impact and context.",
      meta: "Outcomes",
      image: heroImage("hero-platform-cinematic.webp"),
    },
    {
      href: "/resources/podcasts",
      title: "Podcasts + narratives",
      description: "Audio insights, transcripts, and linked artifacts.",
      meta: "Resources",
      image: heroImage("hero-resources-cinematic.webp"),
    },
    {
      href: "/resources/books",
      title: "Books + artifacts",
      description: "Reference material, templates, and delivery assets.",
      meta: "Books",
      image: heroImage("hero-industries-cinematic.webp"),
    },
    {
      href: "/resources/white-papers",
      title: "Research & POVs",
      description: "Technical guidance, white papers, and decision frameworks.",
      meta: "Research",
      image: heroImage("hero-industries-cinematic.webp"),
    },
    {
      href: "/updates",
      title: "Signals & updates",
      description: "Product news, experiments, and ecosystem signals.",
      meta: "Updates",
      image: heroImage("hero-updates-cinematic.webp"),
    },
  ];

  const platformFeatures = [
    {
      title: "Agents & assistants catalog",
      description: "Adopt agents with clear ownership, status, and workflow alignment-ready for rollout.",
    },
    {
      title: "MCP integration library",
      description: "Standardize tool access via MCP with integration-ready server patterns and endpoints.",
    },
    {
      title: "Observability + evaluation",
      description: "Track outcomes and failures, then close the loop with evals to improve reliability.",
    },
    {
      title: "Security by design",
      description: "Access controls, data boundaries, and governance workflows designed for enterprise.",
    },
    {
      title: "Industry workspaces",
      description: "Bring domain context into delivery with repeatable playbooks and patterns.",
    },
    {
      title: "Developer control",
      description: "Use a clean platform surface that supports code-level control with faster patterns when needed.",
    },
  ];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const metaDescription =
    "Colaberry AI is a marketplace and destination for AI agents, MCP servers, podcasts, case studies, and trusted research-built for SEO and LLM indexing.";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Colaberry AI",
      url: siteUrl,
      logo: `${siteUrl}/brand/colaberry-ai-logo.png`,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Colaberry AI",
      url: siteUrl,
      description: metaDescription,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <Layout>
      <Head>
        <title>Colaberry AI | The go-to destination for agents, MCPs, and AI knowledge</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content="Colaberry AI | The go-to destination for agents, MCPs, and AI knowledge" />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <link rel="canonical" href={siteUrl} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>
      <section className="hero-surface rise-in p-6 sm:p-8 lg:p-10">
        <HeroBannerSlider slides={heroSlides} rootIndustries={rootIndustries} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="surface-panel p-5 lg:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
              Operational snapshot
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Enterprise readiness at a glance
            </div>

            <div className="mt-4 grid gap-3">
              {heroKpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-2xl border border-slate-200/80 bg-white/85 p-3 shadow-sm dark:border-slate-700/80"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                    {kpi.label}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{kpi.value}</div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{kpi.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/request-demo" className="btn btn-primary">
                Book a demo
              </Link>
              <Link href="/resources" className="btn btn-secondary">
                Explore the catalog
              </Link>
            </div>
          </section>

          <div className="space-y-6">
            <section className="surface-panel p-5 lg:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                Search the catalog
              </div>
              <label htmlFor="catalog-search" className="sr-only">
                Search
              </label>
              <form action="/search" method="get" role="search" className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  id="catalog-search"
                  name="q"
                  type="search"
                  placeholder="Search agents, MCP servers, podcasts, use cases..."
                  aria-describedby="catalog-search-help"
                  className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  Search
                </button>
              </form>
              <p id="catalog-search-help" className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                Search spans agents, MCP servers, podcasts, and case studies.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
                {heroTags.map((tag) => (
                  <span
                    key={tag}
                    className="chip rounded-full border border-slate-200/80 bg-white px-3 py-1 font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="surface-panel p-5 lg:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                Proof signals
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                What leaders see at a glance
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {heroSignals.map((signal) => (
                  (() => {
                    const isExternal = signal.href.startsWith("http");
                    const content = (
                      <>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{signal.title}</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{signal.description}</div>
                        <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-deep">
                          Explore <span aria-hidden="true">→</span>
                        </div>
                      </>
                    );

                    if (isExternal) {
                      return (
                        <a
                          key={signal.title}
                          href={signal.href}
                          target="_blank"
                          rel="noreferrer"
                          className="group rounded-2xl border border-slate-200/80 bg-white/90 p-3 transition hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-sm dark:border-slate-700/80"
                          aria-label={`Explore ${signal.title}`}
                        >
                          {content}
                        </a>
                      );
                    }

                    return (
                      <Link
                        key={signal.title}
                        href={signal.href}
                        className="group rounded-2xl border border-slate-200/80 bg-white/90 p-3 transition hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-sm dark:border-slate-700/80"
                        aria-label={`Explore ${signal.title}`}
                      >
                        {content}
                      </Link>
                    );
                  })()
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader
          kicker="Discovery framework"
          title="Everything is indexed, searchable, and structured for automation"
          description="Build a destination where every asset is discoverable, categorized, and ready for LLM consumption."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {pillars.map((pillar, index) => {
            const delayClass = index === 0 ? "" : `rise-delay-${Math.min(index, 3)}`;
            return (
              <PillarCard
                key={pillar.title}
                title={pillar.title}
                description={pillar.description}
                index={index}
                className={`rise-in ${delayClass}`.trim()}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader
          kicker="Explore the catalog"
          title="A structured destination for agents, MCPs, podcasts, and research"
          description="Give teams and LLMs a single place to discover, compare, and deploy intelligence."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {catalogs.map((catalog) => (
            <CatalogCard key={catalog.title} {...catalog} />
          ))}
        </div>
      </section>

      <section className="mt-12 surface-panel p-6">
        <SectionHeader
          kicker="Operational outcomes"
          title="Enterprise-ready from day one"
          description="Governance, observability, and integrations built into the core platform."
        />
        <div className="mt-6 grid gap-6 sm:grid-cols-4">
          <Stat title="Weeks to value" value="Fast" note="Start with ready templates" />
          <Stat title="Deployments" value="Repeatable" note="Versioned and auditable" />
          <Stat title="Integrations" value="Extensible" note="MCP-ready connectivity" />
          <Stat title="Governance" value="Built-in" note="Policies and ownership" />
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader
          kicker="Platform capabilities"
          title="Everything teams need to build, govern, and scale AI"
          description="From cataloging agents to evaluating outcomes, the platform supports full lifecycle delivery."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platformFeatures.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="mt-12 surface-panel p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionHeader
              kicker="Connect your stack"
              title="Integrations-ready from day one"
              description="Build assistants that can act across your tools-using a standardized MCP surface."
            />
          </div>
          <Link
            href="/aixcelerator/mcp"
            className="btn btn-secondary mt-3 sm:mt-0"
          >
            Explore MCP servers
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            "Slack",
            "Microsoft Teams",
            "Google Drive",
            "Salesforce",
            "ServiceNow",
            "Workday",
            "Jira",
            "Okta",
            "Zendesk",
            "Snowflake",
            "AWS",
            "GitHub",
          ].map((name) => (
            <span
              key={name}
              className="chip chip-muted rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-12 surface-panel p-6 lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <SectionHeader
            kicker="Our vision"
            title="A vibrant destination for people, LLMs, and agents"
            description="We’re building a place where teams can discover, deploy, and improve agentic systems-while staying grounded in the industries we already serve today and the ones we’ll serve next."
          />

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/aixcelerator"
              className="btn btn-primary"
            >
              Explore AIXcelerator
            </Link>
            <Link
              href="/industries/agriculture"
              className="btn btn-secondary"
            >
              View industries
            </Link>
          </div>
        </div>

        <div className="mt-6 lg:col-span-7 lg:mt-0">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Industry expertise
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                Proven success across industries
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {industries.map((item) => (
              <IndustryTile
                key={item.slug}
                href={`/industries/${item.slug}`}
                title={item.name}
                icon={item.icon}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12 surface-panel p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionHeader
              kicker="Explore next"
              title="Resources, solutions, and updates"
              description="Dedicated landing spots for podcasts, books, white papers, case studies, and news."
            />
          </div>
          <Link
            href="/resources"
            className="btn btn-primary mt-3 sm:mt-0"
          >
            Explore resources
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink href="/solutions" title="Solutions" description="Packaged offerings and playbooks." />
          <QuickLink href="/resources/case-studies" title="Case studies" description="Outcomes and delivery stories." />
          <QuickLink
            href="/resources/books#trust-before-intelligence"
            title="Trust Before Intelligence"
            description="Foundational research on responsible AI."
          />
          <QuickLink href="/updates" title="News & product" description="Updates, announcements, and signals." />
        </div>
      </section>
    </Layout>
  );
}

function PillarCard({
  title,
  description,
  index,
  className,
}: {
  title: string;
  description: string;
  index: number;
  className?: string;
}) {
  return (
    <div className={`surface-panel border border-slate-200/80 bg-white/90 p-5 ${className ?? ""}`.trim()}>
      <div className="inline-flex rounded-full border border-brand-blue/25 bg-brand-blue/5 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="mt-3 text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm leading-relaxed text-slate-600">{description}</div>
    </div>
  );
}

function CatalogCard({
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
    <Link
      href={href}
      className="surface-panel surface-hover surface-interactive group flex h-full min-h-[268px] flex-col overflow-hidden border border-slate-200/80 bg-white/90 p-0"
      aria-label={`Open ${title}`}
    >
      <div className="media-premium-frame border-0 border-b border-slate-200/80 rounded-none">
        <div className="relative aspect-[16/10] w-full">
          <Image
            src={image}
            alt={title}
            fill
            sizes="(min-width: 1536px) 28vw, (min-width: 1024px) 32vw, (min-width: 640px) 44vw, 95vw"
            quality={90}
            className="media-premium-image object-cover object-center"
          />
          <div className="media-premium-overlay" />
          <div className="absolute left-3 top-3">
            <div className="chip chip-muted rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              {meta}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-between gap-4 p-5">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          <div className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</div>
        </div>
        <div className="mt-0.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
          <span aria-hidden="true">→</span>
        </div>
      </div>
    </Link>
  );
}

function QuickLink({
  href,
  title,
  description,
  external = false,
}: {
  href: string;
  title: string;
  description: string;
  external?: boolean;
}) {
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-600">{description}</div>
      </div>
      <div className="mt-0.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
        <span aria-hidden="true">→</span>
      </div>
    </div>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="surface-panel surface-hover surface-interactive group p-4"
        aria-label={`Open ${title}`}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="surface-panel surface-hover surface-interactive group p-4" aria-label={`Open ${title}`}>
      {content}
    </Link>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="surface-panel border border-slate-200/80 bg-white/90 p-5">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-brand-blue/25 bg-brand-blue/10 text-brand-deep dark:border-brand-teal/35 dark:bg-slate-900/80 dark:text-brand-ice">
        <span aria-hidden="true">+</span>
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</div>
    </div>
  );
}

 

function Stat({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-600">{note}</div>
    </div>
  );
}

type HeroSlide = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  highlight: string;
  href: string;
};

function HeroBannerSlider({ slides, rootIndustries }: { slides: HeroSlide[]; rootIndustries: string[] }) {
  const slideCount = slides.length;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slideCount < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, 6200);
    return () => window.clearInterval(timer);
  }, [slideCount]);

  if (slideCount === 0) return null;

  const activeSlide = slides[activeIndex] ?? slides[0];
  const goToSlide = (nextIndex: number) => {
    const bounded = (nextIndex + slideCount) % slideCount;
    setActiveIndex(bounded);
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 shadow-[0_34px_72px_rgba(2,6,23,0.46)]">
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div
            key={slide.title}
            className={`absolute inset-0 transition-opacity duration-700 ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
            aria-hidden={index !== activeIndex}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              sizes="100vw"
              priority={index === 0}
              quality={92}
              className="media-premium-image object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/58 to-slate-900/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/82 via-slate-950/20 to-transparent" />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex min-h-[440px] flex-col justify-between p-7 sm:min-h-[520px] sm:p-10 lg:min-h-[560px] lg:p-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-slate-950/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100 shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-aqua" />
            AI operations platform
          </div>

          <h1 className="font-display mt-6 text-4xl font-semibold leading-[1.03] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
            The go-to destination for discoverable agents, MCPs, and AI knowledge
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
            {activeSlide.description}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/request-demo" className="btn btn-primary">
              Book a demo
            </Link>
            <Link
              href={activeSlide.href}
              className="btn border border-white/35 bg-white/90 text-slate-900 hover:bg-white"
            >
              Explore {activeSlide.eyebrow}
            </Link>
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            Rooted in {rootIndustries.join(" • ")}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/45 px-3 py-2 text-xs font-semibold text-slate-100 backdrop-blur">
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-200">
              {activeSlide.eyebrow}
            </span>
            <span>{activeSlide.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/28 bg-slate-950/45 text-white transition hover:border-sky-300/60"
              onClick={() => goToSlide(activeIndex - 1)}
              aria-label="Show previous hero slide"
            >
              <span aria-hidden="true">←</span>
            </button>
            {slides.map((slide, index) => (
              <button
                key={`${slide.title}-${index}`}
                type="button"
                onClick={() => goToSlide(index)}
                className={`h-2.5 rounded-full transition ${
                  index === activeIndex ? "w-7 bg-brand-aqua" : "w-2.5 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Go to hero slide ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
              />
            ))}
            <button
              type="button"
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/28 bg-slate-950/45 text-white transition hover:border-sky-300/60"
              onClick={() => goToSlide(activeIndex + 1)}
              aria-label="Show next hero slide"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

type IndustryIcon = "leaf" | "tower" | "droplet" | "dna" | "factory" | "truck";

function IndustryTile({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon: IndustryIcon;
}) {
  return (
    <Link
      href={href}
      className="surface-panel surface-hover surface-interactive group relative flex flex-col items-center gap-3 p-4 text-center"
      aria-label={`View ${title} industry`}
    >
      <div className="absolute right-4 top-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
        <span aria-hidden="true">→</span>
      </div>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-slate-700">
        <IndustryIconSvg icon={icon} />
      </div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
    </Link>
  );
}

function IndustryIconSvg({ icon }: { icon: IndustryIcon }) {
  const common = "h-7 w-7";
  switch (icon) {
    case "leaf":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path
            d="M20 4c-6.5 0-12 3.2-14.8 9.2C4.3 15.1 4 17 4 20c3 0 4.9-.3 6.8-1.2C16.8 16 20 10.5 20 4Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M7 17c2-2.6 5.2-5.2 10-7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "tower":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="M12 2v20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path
            d="M7 22l5-8 5 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M6 8c2.2-2 4.3-3 6-3s3.8 1 6 3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "droplet":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path
            d="M12 2s6 6.4 6 12a6 6 0 1 1-12 0C6 8.4 12 2 12 2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "dna":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path
            d="M8 3c3 3 3 6 0 9s-3 6 0 9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M16 3c-3 3-3 6 0 9s3 6 0 9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M9 7h6M9 12h6M9 17h6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "factory":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path
            d="M4 21V10l6 3V10l6 3V8l4 2v11H4Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8 21v-4m4 4v-4m4 4v-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "truck":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path
            d="M3 7h11v10H3V7Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M14 10h4l3 3v4h-7v-7Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M7 19.5a1.5 1.5 0 1 0 0-.01V19.5Zm12 0a1.5 1.5 0 1 0 0-.01V19.5Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}
