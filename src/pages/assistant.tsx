import Head from "next/head";
import Link from "next/link";
import Layout from "../components/Layout";
import MediaPanel from "../components/MediaPanel";
import SectionHeader from "../components/SectionHeader";
import { heroImage } from "../lib/media";

const QUICK_PROMPTS = [
  {
    label: "Find public supply-chain agents",
    href: "/search?q=supply+chain+public+agents",
    description: "Discover agent listings aligned to supply-chain workflows and governance controls.",
  },
  {
    label: "Find MCP servers for analytics",
    href: "/search?q=analytics+mcp+server+integration",
    description: "Locate MCP infrastructure for data workflows, observability, and automation.",
  },
  {
    label: "Find biotech use cases",
    href: "/search?q=biotech+use+cases+outcomes",
    description: "Review implementation patterns and outcomes in biotech and healthcare.",
  },
  {
    label: "Find latest AI updates",
    href: "/search?q=latest+ai+updates+briefing",
    description: "Jump to curated product and ecosystem updates in one place.",
  },
];

const ENTRY_POINTS = [
  {
    title: "Agents catalog",
    href: "/aixcelerator/agents",
    description: "Compare agent ownership, readiness, and deployment context.",
  },
  {
    title: "MCP servers",
    href: "/aixcelerator/mcp",
    description: "Evaluate MCP capabilities, security posture, and integration fit.",
  },
  {
    title: "Use cases",
    href: "/use-cases",
    description: "Explore problem statements, implementation patterns, and measurable outcomes.",
  },
  {
    title: "Resources + updates",
    href: "/updates",
    description: "Track new signals from podcasts, research, and curated AI news feeds.",
  },
];

export default function AssistantPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const canonicalUrl = `${siteUrl}/assistant`;

  return (
    <Layout>
      <Head>
        <title>Discovery Assistant | Colaberry AI</title>
        <meta
          name="description"
          content="Start from guided prompts to discover agents, MCP servers, use cases, and updates."
        />
        <link rel="canonical" href={canonicalUrl} />
      </Head>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Discovery assistant"
            title="Start with guided discovery"
            description="A single entry point for people and LLM workflows to find agents, MCP servers, use cases, and updates."
          />
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            {["Prompt-first", "Catalog-linked", "LLM-readable", "Enterprise ready"].map((label) => (
              <span
                key={label}
                className="chip rounded-full border border-slate-200/80 bg-white px-3 py-1 font-semibold"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <MediaPanel
          kicker="Assistant flow"
          title="Prompt to destination"
          description="Use curated prompts to route into the right catalog surface quickly."
          image={heroImage("hero-platform-cinematic.webp")}
          alt="Discovery assistant entry flow"
          aspect="wide"
          fit="cover"
        />
      </div>

      <section className="surface-panel mt-6 border border-slate-200/80 bg-white/90 p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Prompt launcher"
          title="Search with intent"
          description="Use one of the guided prompts or type your own query."
        />
        <form action="/search" method="get" role="search" className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="assistant-search" className="sr-only">
            Search query
          </label>
          <input
            id="assistant-search"
            name="q"
            type="search"
            placeholder="Ask for agents, MCPs, use cases, or updates..."
            className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {QUICK_PROMPTS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="surface-panel surface-hover surface-interactive border border-slate-200/80 bg-white/85 p-4"
            >
              <div className="text-sm font-semibold text-slate-900">{item.label}</div>
              <p className="mt-1 text-xs text-slate-600">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="surface-panel mt-6 border border-slate-200/80 bg-white/90 p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Destination map"
          title="Assistant entry points"
          description="Jump directly into the relevant catalog destination."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ENTRY_POINTS.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="surface-panel surface-hover surface-interactive border border-slate-200/80 bg-white p-4"
            >
              <div className="text-base font-semibold text-slate-900">{entry.title}</div>
              <p className="mt-1 text-sm text-slate-600">{entry.description}</p>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/request-demo" className="btn btn-primary">
            Request a demo
          </Link>
          <Link href="/updates" className="btn btn-secondary">
            View latest updates
          </Link>
        </div>
      </section>
    </Layout>
  );
}
