import Layout from "../components/Layout";
import Link from "next/link";
import SectionHeader from "../components/SectionHeader";

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
    "Use cases",
    "Playbooks",
    "Integrations",
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
    },
    {
      href: "/aixcelerator/mcp",
      title: "MCP integration library",
      description: "Standardized tool access, connectors, and server templates.",
      meta: "MCP",
    },
    {
      href: "/solutions",
      title: "Use cases + playbooks",
      description: "Solution blueprints mapped to outcomes and operating models.",
      meta: "Solutions",
    },
    {
      href: "/resources/podcasts",
      title: "Podcasts + narratives",
      description: "Audio insights, transcripts, and linked artifacts.",
      meta: "Resources",
    },
    {
      href: "/resources/white-papers",
      title: "Research & POVs",
      description: "Technical guidance, white papers, and decision frameworks.",
      meta: "Research",
    },
    {
      href: "/updates",
      title: "Signals & updates",
      description: "Product news, experiments, and ecosystem signals.",
      meta: "Updates",
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

  return (
    <Layout>
      <section className="hero-surface rise-in p-8 sm:p-10 lg:p-12">
        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/25 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-deep shadow-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-aqua" />
              AI operations platform
            </div>

            <h1 className="mt-6 text-4xl font-semibold text-slate-900 sm:text-5xl lg:text-6xl">
              The go-to destination for discoverable agents, MCPs, and AI knowledge
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Colaberry AI unifies agents, MCP servers, podcasts, and use cases into a searchable,
              categorized catalog that is readable by humans and LLMs-ready for automation.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/request-demo"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 bg-gradient-to-r from-brand-blue to-brand-aqua px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-brand-deep hover:to-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
              >
                Book a demo
              </Link>
              <Link
                href="/resources"
                className="focus-ring inline-flex items-center justify-center rounded-full border border-brand-blue/25 bg-white/90 px-5 py-2.5 text-sm font-semibold text-brand-ink shadow-sm hover:bg-white"
              >
                Explore the catalog
              </Link>
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Rooted in {rootIndustries.join(" • ")}
            </p>

            <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Search the catalog
              </div>
              <label htmlFor="catalog-search" className="sr-only">
                Search
              </label>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  id="catalog-search"
                  type="search"
                  placeholder="Search agents, MCP servers, podcasts, use cases..."
                  aria-describedby="catalog-search-help"
                  className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
                />
                <button
                  type="button"
                  className="focus-ring inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-slate-800"
                >
                  Search
                </button>
              </div>
              <p id="catalog-search-help" className="mt-2 text-xs text-slate-500">
                Search is rolling out—use tags or the catalog sections below for now.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                {heroTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200/80 bg-white px-3 py-1 font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="surface-strong p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Discovery layer
              </div>
              <div className="mt-3 grid gap-3">
                <MiniCard
                  title="Agents catalog"
                  description="Ownership, evaluations, and workflow alignment."
                />
                <MiniCard
                  title="MCP server registry"
                  description="Standardized tool access with ready connectors."
                />
                <MiniCard
                  title="Knowledge signals"
                  description="Podcasts, white papers, and updates in one feed."
                />
              </div>
            </div>

            <div className="surface-strong p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Operational readiness
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric label="Governance" value="Policy controls" />
                <Metric label="Reliability" value="SLO alignment" />
                <Metric label="Security" value="Audit trails" />
                <Metric label="Scale" value="Multi-workspace" />
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Security posture
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <Badge>SSO-ready</Badge>
                  <Badge>Role-based access</Badge>
                  <Badge>Audit logging</Badge>
                  <Badge>Data boundaries</Badge>
                </div>
              </div>
            </div>

            <div className="surface-strong p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Industry roots
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-700">
                {rootIndustries.map((industry) => (
                  <span
                    key={industry}
                    className="rounded-full border border-slate-200/80 bg-white px-3 py-1 font-semibold"
                  >
                    {industry}
                  </span>
                ))}
              </div>
            </div>
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
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            className="focus-ring mt-3 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 sm:mt-0"
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
              className="rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
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
              className="focus-ring inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Explore AIXcelerator
            </Link>
            <Link
              href="/industries/agriculture"
              className="focus-ring inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
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
            className="mt-3 inline-flex items-center justify-center rounded-full bg-slate-900 bg-gradient-to-r from-brand-blue to-brand-aqua px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-brand-deep hover:to-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 sm:mt-0"
          >
            Explore resources
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <QuickLink href="/solutions" title="Solutions" description="Packaged offerings and playbooks." />
          <QuickLink href="/resources/podcasts" title="Podcasts" description="Internal posts + external curation." />
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
    <div
      className={`surface-panel border-t-4 border-brand-blue/30 p-4 ${className ?? ""}`.trim()}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="mt-2 text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{description}</div>
    </div>
  );
}

function CatalogCard({
  href,
  title,
  description,
  meta,
}: {
  href: string;
  title: string;
  description: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="surface-panel surface-hover surface-interactive group flex h-full flex-col border-t-4 border-brand-blue/20 p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{description}</div>
        </div>
        <div className="mt-0.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
          →
        </div>
      </div>
      <div className="mt-4 inline-flex w-fit items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
        {meta}
      </div>
    </Link>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="surface-panel surface-hover surface-interactive group p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{description}</div>
        </div>
        <div className="mt-0.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
          →
        </div>
      </div>
    </Link>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="surface-panel border-t-4 border-brand-blue/20 p-5">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm leading-relaxed text-slate-600">{description}</div>
    </div>
  );
}

 

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
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
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-600">{note}</div>
    </div>
  );
}

function MiniCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-600">{description}</div>
    </div>
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
    >
      <div className="absolute right-4 top-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
        →
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
