import type { GetServerSideProps } from "next";
import Link from "next/link";
import Head from "next/head";
import Layout from "../../../components/Layout";
import SectionHeader from "../../../components/SectionHeader";
import AgentCard from "../../../components/AgentCard";
import { Agent, fetchAgentBySlug, fetchAgents } from "../../../lib/cms";
import type { ReactNode } from "react";

type AgentDetailProps = {
  agent: Agent;
  allowPrivate: boolean;
  relatedAgents: Agent[];
};

export const getServerSideProps: GetServerSideProps<AgentDetailProps> = async ({ params }) => {
  const slug = String(params?.slug || "");
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";

  try {
    const agent = await fetchAgentBySlug(slug);
    if (!agent) {
      return { notFound: true };
    }
    if (!allowPrivate && (agent.visibility || "public").toLowerCase() === "private") {
      return { notFound: true };
    }
    let relatedAgents: Agent[] = [];
    try {
      const visibilityFilter = allowPrivate ? undefined : "public";
      const allAgents = await fetchAgents(visibilityFilter);
      const agentTags = new Set((agent.tags || []).map((tag) => tag.slug || tag.name).filter(Boolean));
      relatedAgents = allAgents
        .filter((candidate) => candidate.slug && candidate.slug !== agent.slug)
        .map((candidate) => {
          const sharedTags = (candidate.tags || [])
            .map((tag) => tag.slug || tag.name)
            .filter((tag) => tag && agentTags.has(tag)).length;
          const sameIndustry = candidate.industry && candidate.industry === agent.industry ? 3 : 0;
          const sameSource = candidate.source && candidate.source === agent.source ? 1 : 0;
          return { candidate, score: sharedTags + sameIndustry + sameSource };
        })
        .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
        .map((entry) => entry.candidate)
        .slice(0, 3);
    } catch {
      relatedAgents = [];
    }
    return { props: { agent, allowPrivate, relatedAgents } };
  } catch {
    return { notFound: true };
  }
};

export default function AgentDetail({ agent, allowPrivate, relatedAgents }: AgentDetailProps) {
  const isPrivate = (agent.visibility || "public").toLowerCase() === "private";
  const status = agent.status || "Unknown";
  const statusKey = status.toLowerCase();
  const statusHint =
    statusKey === "active" || statusKey === "live"
      ? "Production-ready or actively deployed."
      : statusKey === "beta"
        ? "In pilot with limited availability."
        : "Discovery or planning stage.";
  const source = agent.source || "internal";
  const sourceLabel =
    source === "external" ? "External" : source === "partner" ? "Partner" : "Internal";
  const sourceDisplay = agent.sourceName
    ? `${sourceLabel} (${agent.sourceName})`
    : source === "internal"
      ? `${sourceLabel} (Colaberry)`
      : sourceLabel;
  const metaTitle = `${agent.name} | Agents | Colaberry AI`;
  const metaDescription =
    agent.description ||
    "Agent profile with structured metadata for discoverability and deployment readiness.";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const canonicalUrl = `${siteUrl}/aixcelerator/agents/${agent.slug || agent.id}`;
  const tagNames = (agent.tags || []).map((tag) => tag.name || tag.slug).filter(Boolean);
  const companyNames = (agent.companies || []).map((company) => company.name || company.slug).filter(Boolean);
  const hasCoverImage = Boolean(agent.coverImageUrl);
  const lastUpdatedValue = agent.lastUpdated ? new Date(agent.lastUpdated) : null;
  const lastUpdatedLabel = lastUpdatedValue
    ? lastUpdatedValue.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;
  const coreTasks = parseList(agent.coreTasks);
  const outcomes = parseList(agent.outcomes);
  const inputs = parseList(agent.inputs);
  const outputs = parseList(agent.outputs);
  const tools = parseList(agent.tools);
  const executionModes = parseList(agent.executionModes);
  const orchestrationSteps = parseList(agent.orchestration);
  const securityItems = parseList(agent.securityCompliance);
  const keywords = [agent.industry, ...tagNames, ...companyNames].filter(Boolean).join(", ");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: agent.name,
    description: metaDescription,
    applicationCategory: "AI Agent",
    operatingSystem: "Web",
    url: canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: "Colaberry AI",
      url: siteUrl,
    },
    sameAs: agent.sourceUrl ? [agent.sourceUrl] : undefined,
    keywords: keywords || undefined,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Industry", value: agent.industry || "General" },
      { "@type": "PropertyValue", name: "Status", value: status },
      { "@type": "PropertyValue", name: "Visibility", value: isPrivate ? "Private" : "Public" },
      { "@type": "PropertyValue", name: "Source", value: sourceDisplay },
      { "@type": "PropertyValue", name: "Verified", value: agent.verified ? "Yes" : "No" },
    ],
  };

  return (
    <Layout>
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <link rel="canonical" href={canonicalUrl} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/aixcelerator" className="hover:text-slate-700">
          AIXcelerator
        </Link>
        <span>/</span>
        <Link href="/aixcelerator/agents" className="hover:text-slate-700">
          Agents
        </Link>
        <span>/</span>
        <span className="text-slate-700" aria-current="page">
          {agent.name}
        </span>
      </nav>

      <div className="hero-surface mt-4 rounded-[32px] p-8 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <SectionHeader
              as="h1"
              size="xl"
              kicker="Agent profile"
              title={agent.name}
              description={agent.description || "Detailed overview coming soon."}
            />
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="chip chip-brand rounded-full px-3 py-1 text-xs font-semibold">
                {agent.industry || "General"}
              </span>
              <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
              <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
                {sourceDisplay}
              </span>
              {agent.verified ? (
                <span className="chip rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Verified
                </span>
              ) : null}
              <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
                {isPrivate ? "Private" : "Public"}
              </span>
              {!allowPrivate && isPrivate ? (
                <span className="text-xs text-slate-500">Private listings hidden</span>
              ) : null}
            </div>
            {lastUpdatedLabel ? (
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Last updated {lastUpdatedLabel}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              {agent.sourceUrl ? (
                <a
                  href={agent.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                >
                  View source
                </a>
              ) : (
                <Link href="/request-demo" className="btn btn-primary">
                  Book a demo
                </Link>
              )}
              <Link href="/aixcelerator/agents" className="btn btn-secondary">
                View all agents
              </Link>
            </div>
          </div>

          <div className="surface-panel overflow-hidden border border-slate-200/80 p-0">
            <div className="relative aspect-[4/3] w-full">
              {hasCoverImage ? (
                <img
                  src={agent.coverImageUrl || ""}
                  alt={agent.coverImageAlt || agent.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
                        <path
                          d="M12 3a6 6 0 0 1 6 6v2h1a2 2 0 0 1 2 2v5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-5a2 2 0 0 1 2-2h1V9a6 6 0 0 1 6-6Zm0 2a4 4 0 0 0-4 4v2h8V9a4 4 0 0 0-4-4Zm-4 9v4a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-4H8Z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                      Agent surface
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="grid gap-6">
        <div className="surface-panel p-6">
          <SectionHeader
            as="h2"
            size="md"
            kicker="Operational summary"
            title="Readiness snapshot"
            description="Signals, provenance, and ownership context that help teams deploy with confidence."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <DetailCard label="Status" value={status} description={statusHint} />
            <DetailCard
              label="Visibility"
              value={isPrivate ? "Private" : "Public"}
              description={isPrivate ? "Restricted access listing." : "Available for catalog discovery."}
            />
            <DetailCard
              label="Verified"
              value={agent.verified ? "Yes" : "No"}
              description={agent.verified ? "Ownership and metadata reviewed." : "Verification pending."}
            />
            <DetailCard
              label="Industry"
              value={agent.industry || "General"}
              description="Primary domain alignment."
            />
            <DetailCard
              label="Source"
              value={sourceDisplay}
              description="Origin and stewardship."
            />
            <DetailCard
              label="Signals"
              value={`${tagNames.length} tags • ${companyNames.length} companies`}
              description="Discovery metadata attached."
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ListBlock label="Capabilities" items={tagNames} emptyLabel="Capabilities not tagged yet." />
            <ListBlock
              label="Integrations"
              items={companyNames}
              emptyLabel="No integrations linked yet."
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <GuidanceBlock
              title="Deployment guidance"
              items={[
                statusKey === "active" || statusKey === "live"
                  ? "Production-ready and actively deployed."
                  : statusKey === "beta"
                    ? "In pilot with limited availability."
                    : "Discovery or planning stage.",
                agent.verified ? "Verified metadata and ownership confirmed." : "Verification pending.",
                isPrivate ? "Private listing with restricted access." : "Public listing for catalog discovery.",
                sourceDisplay ? `Stewardship: ${sourceDisplay}.` : "Stewardship details pending.",
              ]}
            />
            <GuidanceBlock
              title="Resources"
              items={[
                agent.sourceUrl ? "Source repository or docs available." : "Source link not provided yet.",
                "Contact Colaberry for enablement, rollout, or evaluation support.",
              ]}
              actions={
                <div className="mt-4 flex flex-wrap gap-3">
                  {agent.sourceUrl ? (
                    <a href={agent.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-compact">
                      View source
                    </a>
                  ) : null}
                  <Link href="/request-demo" className="btn btn-ghost btn-compact">
                    Request enablement
                  </Link>
                </div>
              }
            />
          </div>
        </div>

      <section className="surface-panel p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="What it does"
          title="Overview and outcomes"
          description="Clear positioning, expected outcomes, and where this agent fits."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overview</div>
            {agent.whatItDoes ? (
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                {renderParagraphs(agent.whatItDoes)}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                Add a concise overview describing what this agent does, the problem it solves,
                and how teams use it.
              </p>
            )}
          </div>
          <ListSection
            title="Outcomes"
            items={outcomes}
            empty="Outcomes not documented yet."
          />
        </div>
      </section>

      <section className="surface-panel p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Core tasks"
          title="Use cases and workflows"
          description="Primary tasks, repeatable workflows, and where the agent delivers value."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ListSection title="Core tasks" items={coreTasks} empty="Core tasks not listed yet." />
          <ListSection
            title="Execution modes"
            items={executionModes}
            empty="Execution modes not documented yet."
          />
        </div>
      </section>

      <section className="surface-panel p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Inputs & outputs"
          title="Data in, actions out"
          description="Clarify the data required and the artifacts or actions produced."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ListSection title="Inputs" items={inputs} empty="Inputs not documented yet." />
          <ListSection title="Outputs" items={outputs} empty="Outputs not documented yet." />
        </div>
      </section>

      <section className="surface-panel p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Orchestration"
          title="How it runs"
          description="Operational flow, orchestration steps, and governance checks."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <ListSection
            title="Orchestration steps"
            items={orchestrationSteps}
            empty="Orchestration steps not documented yet."
          />
          <ListSection
            title="Security & compliance"
            items={securityItems}
            empty="Security and compliance details not documented yet."
          />
        </div>
      </section>

      <section className="surface-panel p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Tools & integrations"
          title="Systems connected"
          description="Internal systems, APIs, or tools used by this agent."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ListSection title="Tools" items={tools} empty="Tools not documented yet." />
          <ListSection
            title="Integrations"
            items={companyNames}
            empty="Integrations not documented yet."
          />
        </div>
      </section>

      <section className="surface-panel p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Resources"
          title="Docs, demo, and changelog"
          description="Material for enablement, onboarding, and release tracking."
        />
        <div className="mt-6 flex flex-wrap gap-3">
          {agent.docsUrl ? (
            <a href={agent.docsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
              View docs
            </a>
          ) : null}
          {agent.demoUrl ? (
            <a href={agent.demoUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
              View demo
            </a>
          ) : null}
          {agent.changelogUrl ? (
            <a href={agent.changelogUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
              Changelog
            </a>
          ) : null}
          {!agent.docsUrl && !agent.demoUrl && !agent.changelogUrl ? (
            <p className="text-sm text-slate-600">Resources not linked yet.</p>
          ) : null}
        </div>
      </section>

      <section className="surface-panel p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Adoption"
          title="Usage signals"
          description="Signals to help teams evaluate readiness and adoption."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SignalStat
            label="Usage"
            value={agent.usageCount ? agent.usageCount.toLocaleString() : "—"}
            note="Recorded runs or deployments."
          />
          <SignalStat
            label="Rating"
            value={agent.rating ? `${agent.rating.toFixed(1)} / 5` : "—"}
            note="Internal or customer feedback."
          />
          <SignalStat
            label="Verification"
            value={agent.verified ? "Verified" : "Pending"}
            note="Ownership and metadata review."
          />
        </div>
      </section>

      {relatedAgents.length > 0 && (
        <section className="surface-panel p-6">
          <SectionHeader
            as="h2"
            size="md"
            kicker="Related"
            title="Similar agents"
            description="Other agents with shared industry alignment or tags."
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {relatedAgents.map((related) => (
              <AgentCard key={related.id} agent={related} />
            ))}
          </div>
        </section>
      )}
        </div>

        <aside className="surface-panel p-6 lg:sticky lg:top-6">
          <SectionHeader
            as="h2"
            size="md"
            kicker="LLM metadata"
            title="Structured profile"
            description="Fields optimized for catalog indexing and retrieval."
          />
          <dl className="mt-6 grid gap-4">
            <MetadataRow label="Name" value={agent.name} />
            <MetadataRow label="Slug" value={agent.slug || "Not provided"} />
            <MetadataRow label="Industry" value={agent.industry || "General"} />
            <MetadataRow label="Status" value={status} />
            <MetadataRow label="Visibility" value={isPrivate ? "Private" : "Public"} />
            <MetadataRow label="Source" value={sourceDisplay} />
            <MetadataRow label="Verified" value={agent.verified ? "Yes" : "No"} />
            <MetadataRow label="Last updated" value={lastUpdatedLabel || "Not provided"} />
            <MetadataRow label="Tags" value={formatList(agent.tags)} />
            <MetadataRow label="Companies" value={formatList(agent.companies)} />
            <MetadataRow
              label="Source URL"
              value={agent.sourceUrl || "Not linked yet"}
              href={agent.sourceUrl || undefined}
            />
          </dl>
        </aside>
      </section>
    </Layout>
  );
}

function MetadataRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-slate-900">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-brand-deep hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function formatList(items?: { name?: string; slug?: string }[]) {
  if (!items || items.length === 0) {
    return "Not tagged yet";
  }
  return items.map((item) => item.name || item.slug || "").filter(Boolean).join(", ");
}

function DetailCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-600">{description}</div>
    </div>
  );
}

function ListBlock({
  label,
  items,
  emptyLabel,
}: {
  label: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      {items.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={`${label}-${item}`}
              className="chip chip-muted rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">{emptyLabel}</p>
      )}
    </div>
  );
}

function GuidanceBlock({
  title,
  items,
  actions,
}: {
  title: string;
  items: string[];
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-aqua" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {actions ? actions : null}
    </div>
  );
}

function ListSection({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-aqua" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-600">{empty}</p>
      )}
    </div>
  );
}

function SignalStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-600">{note}</div>
    </div>
  );
}

function parseList(value?: string | null): string[] {
  if (!value) return [];
  const parts = value
    .split(/\r?\n|•|\u2022/)
    .map((item) => item.replace(/^[-•\u2022]\s*/, "").trim())
    .filter(Boolean);
  if (parts.length > 1) return parts;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderParagraphs(value: string): ReactNode[] {
  return value
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => (
      <p key={`${line}-${index}`} className="text-sm text-slate-700">
        {line}
      </p>
    ));
}
