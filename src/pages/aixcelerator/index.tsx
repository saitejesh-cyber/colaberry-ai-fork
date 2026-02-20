import Layout from "../../components/Layout";
import Link from "next/link";
import type { GetStaticProps } from "next";
import SectionHeader from "../../components/SectionHeader";
import MediaPanel from "../../components/MediaPanel";
import StatePanel from "../../components/StatePanel";
import { coreCapabilities, modularLayers } from "../../data/platformCapabilities";
import { fetchUseCases, type UseCase } from "../../lib/cms";
import { heroImage } from "../../lib/media";

type AIXceleratorProps = {
  latestUseCases: UseCase[];
  fetchError: boolean;
};

export const getStaticProps: GetStaticProps<AIXceleratorProps> = async () => {
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";

  try {
    const latestUseCases = await fetchUseCases(visibilityFilter, { maxRecords: 4, sortBy: "latest" });
    return {
      props: { latestUseCases, fetchError: false },
      revalidate: 600,
    };
  } catch {
    return {
      props: { latestUseCases: [], fetchError: true },
      revalidate: 120,
    };
  }
};

export default function AIXcelerator({ latestUseCases, fetchError }: AIXceleratorProps) {
  return (
    <Layout>
      {fetchError ? (
        <div className="mb-6">
          <StatePanel
            variant="error"
            title="Use case signals are temporarily unavailable"
            description="Showing platform content while the use case feed reconnects."
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <div className="chip chip-brand inline-flex w-fit items-center gap-2 rounded-full border border-brand-blue/20 bg-white py-1 pl-2 pr-3 text-xs text-brand-deep">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-aqua" />
            Core platform + modular layers
          </div>
          <SectionHeader
            as="h1"
            size="xl"
            title="AIXcelerator"
            description="AIXcelerator is the core platform for governed agent delivery. It helps teams move from opportunity and workflow definition to production execution-then close the loop with observability and evaluation. Modular capability layers can be introduced incrementally without disrupting the core surface."
          />
        </div>
        <MediaPanel
          kicker="Platform preview"
          title="Governed delivery surface"
          description="A clean, visual surface for readiness, workflow alignment, and modular layers."
          image={heroImage("hero-platform-cinematic.webp")}
          alt="Governed delivery platform preview"
          aspect="wide"
          fit="cover"
        />
      </div>

      <section className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            kicker="Core"
            title="Core platform surface"
            description="The trusted foundation for agent delivery, governance, and observability."
            size="md"
          />
          <div className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">
            Stable foundation
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coreCapabilities
            .filter((capability) => capability.href !== "/aixcelerator")
            .map((capability) => (
              <NavCard
                key={capability.href}
                href={capability.href}
                title={capability.title}
                description={capability.description}
                badge="Core"
              />
            ))}
        </div>
      </section>

      <section className="mt-10 surface-panel p-6 sm:mt-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            kicker="Layers"
            title="Modular capability layers"
            description="First-class capabilities introduced incrementally on top of the core. Each layer can start as a curated surface and mature into a full system over time."
            size="md"
          />
          <Link
            href="/resources"
            className="btn btn-primary mt-3 sm:mt-0"
          >
            Explore resource layers
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modularLayers.map((capability) => (
            <NavCard
              key={capability.href}
              href={capability.href}
              title={capability.title}
              description={capability.description}
              badge="Layer"
            />
          ))}
        </div>
      </section>

      <section className="mt-10 surface-panel p-6 sm:mt-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            kicker="Signals"
            title="Latest use cases"
            description="Fresh deployment patterns teams can review before moving into full execution design."
            size="md"
          />
          <Link href="/use-cases" className="btn btn-primary mt-3 sm:mt-0">
            Open use case catalog
          </Link>
        </div>

        {latestUseCases.length === 0 ? (
          <div className="mt-5">
            <StatePanel
              variant="empty"
              title="No use case signals yet"
              description="Latest use cases will appear here once new profiles are published."
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {latestUseCases.map((item) => (
              <Link
                key={item.slug || item.id}
                href={`/use-cases/${item.slug}`}
                className="surface-panel surface-hover surface-interactive border border-slate-200/80 bg-white/90 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="line-clamp-2 text-sm font-semibold text-slate-900">{item.title}</div>
                  <span className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
                    →
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="chip chip-brand rounded-full px-2.5 py-1 text-[11px] font-semibold">
                    {item.industry || "General"}
                  </span>
                  <span className="chip chip-muted rounded-full px-2.5 py-1 text-[11px] font-semibold">
                    {(item.status || "live").toUpperCase()}
                  </span>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {item.lastUpdated ? `Updated ${formatDate(item.lastUpdated)}` : "Update date pending"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 surface-panel p-6 sm:mt-12">
        <SectionHeader
          kicker="Roadmap"
          title="Discovery layer next steps"
          description="Clear milestones that deepen how teams and LLMs explore the catalog."
          size="md"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <RoadmapItem
            title="LLM-friendly detail pages"
            status="Now live"
            description="Structured profiles for Agents and MCP servers with metadata-first layouts."
          />
          <RoadmapItem
            title="Chatbot exploration layer"
            status="Planned"
            description="Conversational discovery across agents, MCPs, and knowledge signals."
          />
        </div>
      </section>
    </Layout>
  );
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function NavCard({
  href,
  title,
  description,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="surface-panel surface-hover surface-interactive group border border-slate-200/80 bg-white/90 p-5"
      aria-label={`Open ${title}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            {badge ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {badge}
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-sm text-slate-600">{description}</div>
        </div>
        <div className="mt-0.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
          <span aria-hidden="true">→</span>
        </div>
      </div>
    </Link>
  );
}

function RoadmapItem({
  title,
  status,
  description,
}: {
  title: string;
  status: string;
  description: string;
}) {
  return (
    <div className="surface-panel border border-slate-200/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-base font-semibold text-slate-900">{title}</div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
          {status}
        </span>
      </div>
      <div className="mt-2 text-sm text-slate-600">{description}</div>
    </div>
  );
}
