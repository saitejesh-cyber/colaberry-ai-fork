import Layout from "../components/Layout";
import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import type { GetStaticProps } from "next";
import { useCallback, useEffect, useRef, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import {
  fetchAgents,
  fetchSkills,
  fetchMCPServers,
  fetchPodcastEpisodes,
  fetchUseCases,
  type Agent,
  type Skill,
  type MCPServer,
  type PodcastEpisode,
  type UseCase,
} from "../lib/cms";
import { heroImage } from "../lib/media";
import { seoTags, type SeoMeta } from "../lib/seo";

type HomePodcastSignal = {
  id: number;
  slug: string;
  title: string;
  publishedDate: string | null;
  podcastType?: string | null;
  coverImageUrl?: string | null;
  duration?: string | null;
  episodeNumber?: number | null;
};

type HomeAgentSignal = {
  id: number;
  slug: string;
  name: string;
  lastUpdated?: string | null;
  rating?: number | null;
  usageCount?: number | null;
};

type HomeUseCaseSignal = {
  id: number;
  slug: string;
  title: string;
  lastUpdated?: string | null;
  verified?: boolean | null;
  linkedCount: number;
};

type HomeMcpSignal = {
  id: number;
  slug: string;
  name: string;
  lastUpdated?: string | null;
  rating?: number | null;
  usageCount?: number | null;
};

type HomeSkillSignal = {
  id: number;
  slug: string;
  name: string;
  category?: string | null;
  lastUpdated?: string | null;
  rating?: number | null;
  usageCount?: number | null;
};

type HomeProps = {
  latestPodcasts: HomePodcastSignal[];
  trendingPodcasts: HomePodcastSignal[];
  latestAgents: HomeAgentSignal[];
  trendingAgents: HomeAgentSignal[];
  latestSkills: HomeSkillSignal[];
  trendingSkills: HomeSkillSignal[];
  latestUseCases: HomeUseCaseSignal[];
  trendingUseCases: HomeUseCaseSignal[];
  latestMCPs: HomeMcpSignal[];
  trendingMCPs: HomeMcpSignal[];
};

export default function Home({
  latestPodcasts,
  latestAgents,
  latestSkills,
  latestUseCases,
  latestMCPs,
  trendingPodcasts,
  trendingAgents,
  trendingSkills,
  trendingUseCases,
  trendingMCPs,
}: HomeProps) {
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
      href: "/aixcelerator/skills",
      title: "Skills catalog",
      description: "Reusable capability units for official, workflow, domain, and orchestration tasks.",
      meta: "Skills",
      image: heroImage("hero-platform-cinematic.webp"),
    },
    {
      href: "/solutions",
      title: "Use cases + playbooks",
      description: "Solution blueprints mapped to outcomes and operating models.",
      meta: "Solutions",
      image: heroImage("hero-solutions-cinematic.webp"),
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
  ];

  const platformFeatures = [
    { title: "Agents & assistants catalog", description: "Adopt agents with clear ownership, status, and workflow alignment — ready for rollout." },
    { title: "MCP integration library", description: "Standardize tool access via MCP with integration-ready server patterns and endpoints." },
    { title: "Observability + evaluation", description: "Track outcomes and failures, then close the loop with evals to improve reliability." },
    { title: "Security by design", description: "Access controls, data boundaries, and governance workflows designed for enterprise." },
    { title: "Industry workspaces", description: "Bring domain context into delivery with repeatable playbooks and patterns." },
    { title: "Developer control", description: "Use a clean platform surface that supports code-level control with faster patterns when needed." },
  ];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const metaDescription =
    "Colaberry AI is a marketplace and destination for AI agents, MCP servers, skills, podcasts, case studies, and trusted research-built for SEO and LLM indexing.";
  const seoMeta: SeoMeta = {
    title: "Colaberry AI | The go-to destination for agents, MCPs, and AI knowledge",
    description: metaDescription,
    canonical: siteUrl,
  };
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
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>
      {/* ---- Hero (together.ai-inspired dark animated hero) ---- */}
      <section className="relative overflow-hidden rounded-2xl" style={{ background: "var(--gradient-hero)" }}>
        {/* Animated gradient mesh background */}
        <div className="hero-gradient-mesh" aria-hidden="true">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
          <div className="hero-orb hero-orb-center" />
        </div>

        {/* Subtle grid overlay */}
        <div className="animated-signal-grid pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true" />

        {/* Radial vignette for depth */}
        <div className="hero-vignette" aria-hidden="true" />

        {/* Content — centered layout */}
        <div className="relative z-10 mx-auto max-w-4xl px-8 py-24 text-center sm:py-32 lg:py-40">
          <div
            className="rise-in rise-delay-1 kicker-chip mx-auto inline-flex rounded-full px-4 py-1.5 tracking-[0.2em]"
            style={{ borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#FAFAFA" }}
          >
            <span className="kicker-chip-dot" />
            Enterprise AI Platform
          </div>

          <h1 className="rise-in rise-delay-2 mt-6 font-sans text-display-lg font-bold text-white sm:text-display-xl lg:text-display-2xl">
            Discover, govern, and scale{" "}
            <span className="text-gradient">enterprise AI</span>
          </h1>

          <p className="rise-in rise-delay-3 mx-auto mt-6 max-w-2xl text-body-lg leading-relaxed text-zinc-400">
            A unified catalog where teams discover, evaluate, and deploy AI agents, MCP servers, skills, and research — governed and structured for both people and LLMs.
          </p>

          <div className="rise-in mt-8 flex flex-wrap justify-center gap-4" style={{ animationDelay: "0.32s" }}>
            <Link href="/request-demo" className="btn btn-cta">
              Book a demo
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/aixcelerator"
              className="btn"
              style={{ borderColor: "rgba(255,255,255,0.2)", color: "#FAFAFA", background: "rgba(255,255,255,0.06)" }}
            >
              Explore platform
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Trust metrics ---- */}
      <section className="reveal section-spacing">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatedMetric value="8+" label="Industries served" note="Agriculture to fintech" delay={0} />
          <AnimatedMetric value="100+" label="Agent profiles" note="Cataloged and governed" delay={150} />
          <AnimatedMetric value="50+" label="MCP servers" note="Integration-ready connectors" delay={300} />
          <AnimatedMetric value="200+" label="Skills indexed" note="Reusable capability units" delay={450} />
        </div>
      </section>

      <hr className="section-divider" />

      <section className="reveal section-spacing">
        <SectionHeader
          kicker="Explore the catalog"
          title="A structured destination for agents, MCPs, podcasts, and research"
          description="Give teams and LLMs a single place to discover, compare, and deploy intelligence."
        />
        <div className="stagger-grid revealed mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalogs.map((catalog) => (
            <CatalogCard key={catalog.title} {...catalog} />
          ))}
        </div>
      </section>

      {/* ---- Signal Dashboard (tabbed consolidation) ---- */}
      <SignalDashboard
        latestAgents={latestAgents}
        trendingAgents={trendingAgents}
        latestSkills={latestSkills}
        trendingSkills={trendingSkills}
        latestMCPs={latestMCPs}
        trendingMCPs={trendingMCPs}
        latestPodcasts={latestPodcasts}
        trendingPodcasts={trendingPodcasts}
        latestUseCases={latestUseCases}
        trendingUseCases={trendingUseCases}
      />

      <section className="reveal section-spacing">
        <SectionHeader
          kicker="Platform capabilities"
          title="Everything teams need to build, govern, and scale AI"
          description="From cataloging agents to evaluating outcomes, the platform supports full lifecycle delivery."
        />
        <div className="stagger-grid revealed mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platformFeatures.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="reveal section-spacing surface-panel p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            kicker="Connect your stack"
            title="Integrations-ready from day one"
            description="Build assistants that can act across your tools — using a standardized MCP surface."
          />
          <Link href="/aixcelerator/mcp" className="btn btn-secondary mt-3 sm:mt-0">
            Explore MCP servers
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Slack", "Microsoft Teams", "Google Drive", "Salesforce", "ServiceNow", "Workday", "Jira", "Okta", "Zendesk", "Snowflake", "AWS", "GitHub"].map((name) => (
            <span key={name} className="chip chip-muted rounded-md px-3 py-1.5 text-xs font-medium">
              {name}
            </span>
          ))}
        </div>
      </section>

      <section className="reveal section-spacing">
        <SectionHeader
          kicker="Industry expertise"
          title="Proven success across industries"
          description="Domain-specific playbooks and patterns for your sector."
        />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {industries.map((item) => (
            <IndustryTile key={item.slug} href={`/industries/${item.slug}`} title={item.name} icon={item.icon} />
          ))}
        </div>
      </section>

      <section className="reveal section-spacing surface-panel p-6 sm:p-8">
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

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";
  const fetchOrEmpty = async <T,>(label: string, task: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await task();
    } catch (error) {
      console.error(`[home:getStaticProps] ${label} failed`, error);
      return fallback;
    }
  };

  const latestPodcasts = await fetchOrEmpty(
    "latestPodcasts",
    () => fetchPodcastEpisodes({ maxRecords: 6, sortBy: "latest" }),
    [] as PodcastEpisode[]
  );
  const trendingPodcasts = await fetchOrEmpty(
    "trendingPodcasts",
    () => fetchPodcastEpisodes({ maxRecords: 80, sortBy: "trending" }),
    [] as PodcastEpisode[]
  );
  const latestAgentsRaw = await fetchOrEmpty(
    "latestAgents",
    () => fetchAgents(visibilityFilter, { maxRecords: 6, sortBy: "latest" }),
    [] as Agent[]
  );
  const trendingAgentsRaw = await fetchOrEmpty(
    "trendingAgents",
    () => fetchAgents(visibilityFilter, { maxRecords: 300 }),
    [] as Agent[]
  );
  const latestSkillsRaw = await fetchOrEmpty(
    "latestSkills",
    () => fetchSkills(visibilityFilter, { maxRecords: 6, sortBy: "latest" }),
    [] as Skill[]
  );
  const trendingSkillsRaw = await fetchOrEmpty(
    "trendingSkills",
    () => fetchSkills(visibilityFilter, { maxRecords: 300, sortBy: "latest" }),
    [] as Skill[]
  );
  const latestUseCasesRaw = await fetchOrEmpty(
    "latestUseCases",
    () => fetchUseCases(visibilityFilter, { maxRecords: 6, sortBy: "latest" }),
    [] as UseCase[]
  );
  const trendingUseCasesRaw = await fetchOrEmpty(
    "trendingUseCases",
    () => fetchUseCases(visibilityFilter, { maxRecords: 300, sortBy: "latest" }),
    [] as UseCase[]
  );
  const latestMCPRaw = await fetchOrEmpty(
    "latestMCP",
    () => fetchMCPServers(visibilityFilter, { maxRecords: 6, sortBy: "latest" }),
    [] as MCPServer[]
  );
  const trendingMCPRaw = await fetchOrEmpty(
    "trendingMCP",
    () => fetchMCPServers(visibilityFilter, { maxRecords: 300 }),
    [] as MCPServer[]
  );

  const latestAgents = sortAgentsByDate(latestAgentsRaw).slice(0, 6).map(toHomeAgentSignal);
  const trendingAgents = sortAgentsByTrending(trendingAgentsRaw).slice(0, 6).map(toHomeAgentSignal);
  const latestSkills = sortSkillsByDate(latestSkillsRaw).slice(0, 6).map(toHomeSkillSignal);
  const trendingSkills = sortSkillsByTrending(trendingSkillsRaw).slice(0, 6).map(toHomeSkillSignal);
  const latestUseCases = sortUseCasesByDate(latestUseCasesRaw).slice(0, 6).map(toHomeUseCaseSignal);
  const trendingUseCases = sortUseCasesByTrending(trendingUseCasesRaw).slice(0, 6).map(toHomeUseCaseSignal);
  const latestMCPs = sortMCPByDate(latestMCPRaw).slice(0, 6).map(toHomeMcpSignal);
  const trendingMCPs = sortMCPByTrending(trendingMCPRaw).slice(0, 6).map(toHomeMcpSignal);

  return {
    props: {
      latestPodcasts: latestPodcasts.map(toHomePodcastSignal),
      trendingPodcasts: trendingPodcasts.slice(0, 6).map(toHomePodcastSignal),
      latestAgents,
      trendingAgents,
      latestSkills,
      trendingSkills,
      latestUseCases,
      trendingUseCases,
      latestMCPs,
      trendingMCPs,
    },
    revalidate: 600,
  };
};

const SIGNAL_TABS = ["Agents", "Skills", "MCP", "Podcasts", "Use Cases"] as const;
type SignalTab = (typeof SIGNAL_TABS)[number];

function SignalDashboard({
  latestAgents,
  trendingAgents,
  latestSkills,
  trendingSkills,
  latestMCPs,
  trendingMCPs,
  latestPodcasts,
  trendingPodcasts,
  latestUseCases,
  trendingUseCases,
}: {
  latestAgents: HomeAgentSignal[];
  trendingAgents: HomeAgentSignal[];
  latestSkills: HomeSkillSignal[];
  trendingSkills: HomeSkillSignal[];
  latestMCPs: HomeMcpSignal[];
  trendingMCPs: HomeMcpSignal[];
  latestPodcasts: HomePodcastSignal[];
  trendingPodcasts: HomePodcastSignal[];
  latestUseCases: HomeUseCaseSignal[];
  trendingUseCases: HomeUseCaseSignal[];
}) {
  const [activeTab, setActiveTab] = useState<SignalTab>("Agents");

  const onTabChange = useCallback((tab: SignalTab) => {
    setActiveTab(tab);
  }, []);

  return (
    <section className="reveal section-spacing">
      <SectionHeader
        kicker="Platform signals"
        title="Latest and trending across the catalog"
        description="Fresh profiles and high-interest items across agents, skills, MCP servers, podcasts, and use cases."
      />

      {/* Tab bar */}
      <div
        className="mt-6 flex gap-1 overflow-x-auto rounded-lg border border-[var(--stroke)] bg-[var(--surface-soft)] p-1"
        role="tablist"
        aria-label="Signal category tabs"
      >
        {SIGNAL_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`signal-panel-${tab}`}
            id={`signal-tab-${tab}`}
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab
                ? "bg-white text-[var(--text-primary)] shadow-sm dark:bg-[var(--surface-strong)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="mt-5">
        {activeTab === "Agents" && (
          <div role="tabpanel" id="signal-panel-Agents" aria-labelledby="signal-tab-Agents" className="grid gap-4 lg:grid-cols-2">
            <AgentRail title="Latest agents" description="Most recently updated." items={latestAgents} detailType="latest" />
            {trendingAgents.length > 0 && (
              <AgentRail title="Trending agents" description="Highest rated and most used." items={trendingAgents} detailType="trending" />
            )}
          </div>
        )}
        {activeTab === "Skills" && (
          <div role="tabpanel" id="signal-panel-Skills" aria-labelledby="signal-tab-Skills" className="grid gap-4 lg:grid-cols-2">
            <SkillRail title="Latest skills" description="Most recently updated." items={latestSkills} detailType="latest" />
            {trendingSkills.length > 0 && (
              <SkillRail title="Trending skills" description="Highest rated and most used." items={trendingSkills} detailType="trending" />
            )}
          </div>
        )}
        {activeTab === "MCP" && (
          <div role="tabpanel" id="signal-panel-MCP" aria-labelledby="signal-tab-MCP" className="grid gap-4 lg:grid-cols-2">
            <McpRail title="Latest MCP servers" description="Most recently updated." items={latestMCPs} detailType="latest" />
            {trendingMCPs.length > 0 && (
              <McpRail title="Trending MCP servers" description="Highest rated and most used." items={trendingMCPs} detailType="trending" />
            )}
          </div>
        )}
        {activeTab === "Podcasts" && (
          <div role="tabpanel" id="signal-panel-Podcasts" aria-labelledby="signal-tab-Podcasts">
            {latestPodcasts.length > 0 && (
              <div className="mb-4">
                <FeaturedPodcastCard episode={latestPodcasts[0]} />
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <PodcastRail title="Latest episodes" description="Most recently published." items={latestPodcasts} />
              {trendingPodcasts.length > 0 && (
                <PodcastRail title="Trending episodes" description="Most viewed and referenced." items={trendingPodcasts} />
              )}
            </div>
            <div className="mt-4 text-center">
              <Link href="/resources/podcasts" className="btn btn-secondary">
                Browse all episodes
              </Link>
            </div>
          </div>
        )}
        {activeTab === "Use Cases" && (
          <div role="tabpanel" id="signal-panel-Use Cases" aria-labelledby="signal-tab-Use Cases" className="grid gap-4 lg:grid-cols-2">
            <UseCaseRail title="Latest use cases" description="Most recently updated." items={latestUseCases} detailType="latest" />
            {trendingUseCases.length > 0 && (
              <UseCaseRail title="Trending use cases" description="Most referenced and linked." items={trendingUseCases} detailType="trending" />
            )}
          </div>
        )}
      </div>
    </section>
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
      className="card-glass card-shimmer gradient-border group flex h-full min-h-[268px] flex-col overflow-hidden p-0"
      aria-label={`Open ${title}`}
    >
      <div className="media-premium-frame border-0 border-b border-zinc-200/80 rounded-none">
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
            <div className="chip chip-muted rounded-md border border-zinc-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-200">
              {meta}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-between gap-4 p-5">
        <div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
          <div className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{description}</div>
        </div>
        <div className="mt-0.5 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
          <span aria-hidden="true">→</span>
        </div>
      </div>
    </Link>
  );
}

function FeaturedPodcastCard({ episode }: { episode: HomePodcastSignal }) {
  const isExternal = (episode.podcastType || "internal").toLowerCase() === "external";
  return (
    <Link
      href={`/resources/podcasts/${episode.slug}`}
      className="group section-card flex flex-col gap-4 rounded-lg p-4 transition sm:flex-row sm:items-center"
    >
      {episode.coverImageUrl ? (
        <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-40">
          <Image
            src={episode.coverImageUrl}
            alt={episode.title}
            fill
            className="object-cover"
            unoptimized
            loading="lazy"
            sizes="(min-width: 640px) 160px, 100vw"
          />
        </div>
      ) : (
        <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-lg bg-[#DC2626]/10 dark:bg-[#DC2626]/20 sm:h-24 sm:w-40">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#DC2626]" fill="none" aria-hidden="true">
            <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep dark:text-[#FAFAFA]">
            Latest episode
          </span>
          <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold leading-none ${isExternal ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" : "bg-[#DC2626]/10 text-[#18181B] dark:bg-[#DC2626]/20 dark:text-[#FAFAFA]"}`}>
            {isExternal ? "External" : "Colaberry"}
          </span>
        </div>
        <h4 className="mt-1 line-clamp-2 text-base font-semibold text-zinc-900 group-hover:text-brand-deep dark:text-zinc-100">
          {episode.title}
        </h4>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
          {formatPodcastDate(episode.publishedDate) || "Date pending"}
          {episode.duration ? <span>· {episode.duration}</span> : null}
          {episode.episodeNumber ? <span>· Episode {episode.episodeNumber}</span> : null}
        </div>
      </div>
      <span className="hidden shrink-0 text-zinc-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-deep sm:block" aria-hidden="true">
        →
      </span>
    </Link>
  );
}

function PodcastRail({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: HomePodcastSignal[];
}) {
  return (
    <article className="section-card rounded-lg p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Podcast signals will appear after next content sync.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {items.map((episode) => {
            const isExternal = (episode.podcastType || "internal").toLowerCase() === "external";
            return (
              <li key={episode.slug}>
                <Link
                  href={`/resources/podcasts/${episode.slug}`}
                  className="group section-card flex items-center gap-3 rounded-lg px-3 py-2.5 transition"
                >
                  {episode.coverImageUrl ? (
                    <Image
                      src={episode.coverImageUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      unoptimized
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DC2626]/10 dark:bg-[#DC2626]/20">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DC2626]" fill="none" aria-hidden="true">
                        <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2" />
                        <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {episode.title}
                    </span>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatPodcastDate(episode.publishedDate) || "Date pending"}
                      {episode.duration ? <span>· {episode.duration}</span> : null}
                      <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none ${isExternal ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" : "bg-[#DC2626]/10 text-[#18181B] dark:bg-[#DC2626]/20 dark:text-[#FAFAFA]"}`}>
                        {isExternal ? "External" : "Colaberry"}
                      </span>
                    </div>
                  </div>
                  <span className="ml-1 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep dark:text-zinc-500">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

function AgentRail({
  title,
  description,
  items,
  detailType,
}: {
  title: string;
  description: string;
  items: HomeAgentSignal[];
  detailType: "latest" | "trending";
}) {
  return (
    <article className="section-card rounded-lg p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Agent signals will appear after next refresh.</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {items.map((agent) => (
            <li key={agent.slug || agent.id}>
              <Link
                href={`/aixcelerator/agents/${agent.slug || agent.id}`}
                className="group section-card flex items-center justify-between rounded-lg px-3 py-2.5 transition"
              >
                <span className="truncate pr-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{agent.name}</span>
                <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 group-hover:text-brand-deep dark:text-zinc-400">
                  {detailType === "latest"
                    ? formatPodcastDate(agent.lastUpdated) || "Updated"
                    : agent.rating
                    ? `R ${agent.rating.toFixed(1)}`
                    : agent.usageCount
                    ? formatUsageLabel(agent.usageCount)
                    : "Trending"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function SkillRail({
  title,
  description,
  items,
  detailType,
}: {
  title: string;
  description: string;
  items: HomeSkillSignal[];
  detailType: "latest" | "trending";
}) {
  return (
    <article className="section-card rounded-lg p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Skill signals will appear after next refresh.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {items.map((skill) => (
            <li key={skill.slug || skill.id}>
              <Link
                href={`/aixcelerator/skills/${skill.slug || skill.id}`}
                className="section-card group flex items-center justify-between rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {skill.name}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {detailType === "latest"
                      ? formatPodcastDate(skill.lastUpdated) || "Updated"
                      : skill.rating
                      ? `R ${skill.rating.toFixed(1)}`
                      : skill.usageCount
                      ? formatUsageLabel(skill.usageCount)
                      : skill.category || "Trending"}
                  </div>
                </div>
                <span className="ml-3 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
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

function UseCaseRail({
  title,
  description,
  items,
  detailType,
}: {
  title: string;
  description: string;
  items: HomeUseCaseSignal[];
  detailType: "latest" | "trending";
}) {
  return (
    <article className="section-card rounded-lg p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Use case signals will appear after next refresh.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {items.map((useCase) => (
            <li key={useCase.slug || useCase.id}>
              <Link
                href={`/use-cases/${useCase.slug || useCase.id}`}
                className="section-card group flex items-center justify-between rounded-lg px-3 py-2"
              >
                <span className="truncate pr-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{useCase.title}</span>
                <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 group-hover:text-brand-deep dark:text-zinc-400">
                  {detailType === "latest"
                    ? formatPodcastDate(useCase.lastUpdated) || "Updated"
                    : useCase.verified
                    ? "Verified"
                    : `${useCase.linkedCount} links`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function McpRail({
  title,
  description,
  items,
  detailType,
}: {
  title: string;
  description: string;
  items: HomeMcpSignal[];
  detailType: "latest" | "trending";
}) {
  return (
    <article className="section-card rounded-lg p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">MCP signals will appear after next refresh.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {items.map((mcp) => (
            <li key={mcp.slug || mcp.id}>
              <Link
                href={`/aixcelerator/mcp/${mcp.slug || mcp.id}`}
                className="section-card group flex items-center justify-between rounded-lg px-3 py-2"
              >
                <span className="truncate pr-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{mcp.name}</span>
                <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 group-hover:text-brand-deep dark:text-zinc-400">
                  {detailType === "latest"
                    ? formatPodcastDate(mcp.lastUpdated) || "Updated"
                    : mcp.rating
                    ? `R ${mcp.rating.toFixed(1)}`
                    : mcp.usageCount
                    ? formatUsageLabel(mcp.usageCount)
                    : "Trending"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
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
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</div>
      </div>
      <div className="mt-0.5 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep dark:text-zinc-500">
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
        className="card-glass gradient-border group flex items-start justify-between gap-3 p-5"
        aria-label={`Open ${title}`}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="card-glass gradient-border group flex items-start justify-between gap-3 p-5" aria-label={`Open ${title}`}>
      {content}
    </Link>
  );
}

function formatPodcastDate(value?: string | null) {
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

function toHomePodcastSignal(item: PodcastEpisode): HomePodcastSignal {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    publishedDate: item.publishedDate || null,
    podcastType: item.podcastType || null,
    coverImageUrl: item.coverImageUrl || null,
    duration: item.duration || null,
    episodeNumber: typeof item.episodeNumber === "number" ? item.episodeNumber : null,
  };
}

function toHomeAgentSignal(item: Agent): HomeAgentSignal {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    lastUpdated: item.lastUpdated || null,
    rating: typeof item.rating === "number" ? item.rating : null,
    usageCount: typeof item.usageCount === "number" ? item.usageCount : null,
  };
}

function toHomeSkillSignal(item: Skill): HomeSkillSignal {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: item.category || item.skillType || null,
    lastUpdated: item.lastUpdated || null,
    rating: typeof item.rating === "number" ? item.rating : null,
    usageCount: typeof item.usageCount === "number" ? item.usageCount : null,
  };
}

function toHomeUseCaseSignal(item: UseCase): HomeUseCaseSignal {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    lastUpdated: item.lastUpdated || null,
    verified: Boolean(item.verified),
    linkedCount: (item.agents?.length || 0) + (item.mcpServers?.length || 0),
  };
}

function toHomeMcpSignal(item: MCPServer): HomeMcpSignal {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    lastUpdated: item.lastUpdated || null,
    rating: typeof item.rating === "number" ? item.rating : null,
    usageCount: typeof item.usageCount === "number" ? item.usageCount : null,
  };
}

function sortAgentsByDate(agents: Agent[]) {
  return [...agents].sort(
    (a, b) => compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name)
  );
}

function sortAgentsByTrending(agents: Agent[]) {
  return [...agents].sort((a, b) => {
    const delta = scoreTrendingAgent(b) - scoreTrendingAgent(a);
    if (delta !== 0) return delta;
    return compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name);
  });
}

function sortUseCasesByDate(useCases: UseCase[]) {
  return [...useCases].sort(
    (a, b) => compareDateDesc(a.lastUpdated, b.lastUpdated) || a.title.localeCompare(b.title)
  );
}

function sortSkillsByDate(skills: Skill[]) {
  return [...skills].sort(
    (a, b) => compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name)
  );
}

function sortSkillsByTrending(skills: Skill[]) {
  return [...skills].sort((a, b) => {
    const delta = scoreTrendingSkill(b) - scoreTrendingSkill(a);
    if (delta !== 0) return delta;
    return compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name);
  });
}

function sortUseCasesByTrending(useCases: UseCase[]) {
  return [...useCases].sort((a, b) => {
    const delta = scoreTrendingUseCase(b) - scoreTrendingUseCase(a);
    if (delta !== 0) return delta;
    return compareDateDesc(a.lastUpdated, b.lastUpdated) || a.title.localeCompare(b.title);
  });
}

function sortMCPByDate(mcps: MCPServer[]) {
  return [...mcps].sort((a, b) => compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name));
}

function sortMCPByTrending(mcps: MCPServer[]) {
  return [...mcps].sort((a, b) => {
    const delta = scoreTrendingMcp(b) - scoreTrendingMcp(a);
    if (delta !== 0) return delta;
    return compareDateDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name);
  });
}

function compareDateDesc(left?: string | null, right?: string | null) {
  return toTimestamp(right) - toTimestamp(left);
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreTrendingMcp(mcp: MCPServer) {
  const ratingScore = typeof mcp.rating === "number" ? Math.max(mcp.rating, 0) * 18 : 0;
  const usageScore =
    typeof mcp.usageCount === "number" && mcp.usageCount > 0
      ? Math.log10(mcp.usageCount + 1) * 25
      : 0;
  const verifiedScore = mcp.verified ? 8 : 0;
  const freshnessScore = (() => {
    const timestamp = toTimestamp(mcp.lastUpdated);
    if (!timestamp) return 0;
    const days = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    if (days <= 14) return 12;
    if (days <= 45) return 8;
    if (days <= 90) return 4;
    return 0;
  })();
  return ratingScore + usageScore + verifiedScore + freshnessScore;
}

function scoreTrendingAgent(agent: Agent) {
  const ratingScore = typeof agent.rating === "number" ? Math.max(agent.rating, 0) * 18 : 0;
  const usageScore =
    typeof agent.usageCount === "number" && agent.usageCount > 0
      ? Math.log10(agent.usageCount + 1) * 25
      : 0;
  const verifiedScore = agent.verified ? 8 : 0;
  const freshnessScore = (() => {
    const timestamp = toTimestamp(agent.lastUpdated);
    if (!timestamp) return 0;
    const days = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    if (days <= 14) return 12;
    if (days <= 45) return 8;
    if (days <= 90) return 4;
    return 0;
  })();
  return ratingScore + usageScore + verifiedScore + freshnessScore;
}

function scoreTrendingUseCase(useCase: UseCase) {
  const linkageScore = Math.min(useCase.agents.length * 5 + useCase.mcpServers.length * 4, 30);
  const verifiedScore = useCase.verified ? 8 : 0;
  const completenessScore =
    (useCase.summary ? 2 : 0) +
    (useCase.longDescription ? 4 : 0) +
    (useCase.outcomes ? 3 : 0) +
    (useCase.metrics ? 3 : 0);
  const freshnessScore = (() => {
    const timestamp = toTimestamp(useCase.lastUpdated);
    if (!timestamp) return 0;
    const days = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    if (days <= 14) return 12;
    if (days <= 45) return 8;
    if (days <= 90) return 4;
    return 0;
  })();
  return linkageScore + verifiedScore + completenessScore + freshnessScore;
}

function scoreTrendingSkill(skill: Skill) {
  const ratingScore = typeof skill.rating === "number" ? Math.max(skill.rating, 0) * 18 : 0;
  const usageScore =
    typeof skill.usageCount === "number" && skill.usageCount > 0
      ? Math.log10(skill.usageCount + 1) * 25
      : 0;
  const verifiedScore = skill.verified ? 8 : 0;
  const linkageScore = Math.min(
    (skill.agents?.length || 0) * 3 + (skill.mcpServers?.length || 0) * 3 + (skill.useCases?.length || 0) * 4,
    24
  );
  const completenessScore =
    (skill.summary ? 2 : 0) +
    (skill.longDescription ? 4 : 0) +
    (skill.inputs ? 2 : 0) +
    (skill.outputs ? 2 : 0) +
    (skill.toolsRequired ? 2 : 0) +
    (skill.modelsSupported ? 2 : 0);
  const freshnessScore = (() => {
    const timestamp = toTimestamp(skill.lastUpdated);
    if (!timestamp) return 0;
    const days = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    if (days <= 14) return 12;
    if (days <= 45) return 8;
    if (days <= 90) return 4;
    return 0;
  })();
  return ratingScore + usageScore + verifiedScore + linkageScore + completenessScore + freshnessScore;
}

function formatUsageLabel(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
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
      <div className="absolute right-4 top-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
        <span aria-hidden="true">→</span>
      </div>
      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-zinc-200/40 bg-zinc-50 text-zinc-600 dark:border-zinc-700/20 dark:bg-zinc-800/40 dark:text-zinc-300">
        <IndustryIconSvg icon={icon} />
      </div>
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
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

function AnimatedMetric({
  value,
  label,
  note,
  delay = 0,
}: {
  value: string;
  label: string;
  note: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="card-glass gradient-border p-5 text-center"
    >
      <div
        className={visible ? "counter-animate" : "opacity-0"}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="font-sans text-display-sm font-bold bg-gradient-to-r from-[#DC2626] to-[#18181B] bg-clip-text text-transparent">
          {value}
        </div>
        <div className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{note}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="card-glass card-shimmer gradient-border p-6">
      <h3 className="text-[0.9375rem] font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </article>
  );
}
