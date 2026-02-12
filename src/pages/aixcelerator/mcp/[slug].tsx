import type { GetServerSideProps } from "next";
import Link from "next/link";
import Head from "next/head";
import Layout from "../../../components/Layout";
import SectionHeader from "../../../components/SectionHeader";
import MCPCard from "../../../components/MCPCard";
import { fetchMCPServerBySlug, fetchMCPServers, MCPServer } from "../../../lib/cms";
import type { ReactNode } from "react";

type MCPDetailProps = {
  mcp: MCPServer;
  allowPrivate: boolean;
  relatedServers: MCPServer[];
};

export const getServerSideProps: GetServerSideProps<MCPDetailProps> = async ({ params }) => {
  const slug = String(params?.slug || "");
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";

  try {
    const mcp = await fetchMCPServerBySlug(slug);
    if (!mcp) {
      return { notFound: true };
    }
    if (!allowPrivate && (mcp.visibility || "public").toLowerCase() === "private") {
      return { notFound: true };
    }
    let relatedServers: MCPServer[] = [];
    try {
      const visibilityFilter = allowPrivate ? undefined : "public";
      const allServers = await fetchMCPServers(visibilityFilter);
      const mcpTags = new Set((mcp.tags || []).map((tag) => tag.slug || tag.name).filter(Boolean));
      relatedServers = allServers
        .filter((candidate) => candidate.slug && candidate.slug !== mcp.slug)
        .map((candidate) => {
          const sharedTags = (candidate.tags || [])
            .map((tag) => tag.slug || tag.name)
            .filter((tag) => tag && mcpTags.has(tag)).length;
          const sameIndustry = candidate.industry && candidate.industry === mcp.industry ? 3 : 0;
          const sameCategory = candidate.category && candidate.category === mcp.category ? 2 : 0;
          return { candidate, score: sharedTags + sameIndustry + sameCategory };
        })
        .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
        .map((entry) => entry.candidate)
        .slice(0, 3);
    } catch {
      relatedServers = [];
    }
    return { props: { mcp, allowPrivate, relatedServers } };
  } catch {
    return { notFound: true };
  }
};

export default function MCPDetail({ mcp, allowPrivate, relatedServers }: MCPDetailProps) {
  const isPrivate = (mcp.visibility || "public").toLowerCase() === "private";
  const status = mcp.status || "Unknown";
  const statusKey = status.toLowerCase();
  const statusHint =
    statusKey === "active" || statusKey === "live"
      ? "Production-ready or actively deployed."
      : statusKey === "beta"
        ? "In pilot with limited availability."
        : "Discovery or planning stage.";
  const source = mcp.source || "internal";
  const sourceLabel =
    source === "external" ? "External" : source === "partner" ? "Partner" : "Internal";
  const sourceDisplay = mcp.sourceName
    ? `${sourceLabel} (${mcp.sourceName})`
    : source === "internal"
      ? `${sourceLabel} (Colaberry)`
      : sourceLabel;
  const metaTitle = `${mcp.name} | MCP Servers | Colaberry AI`;
  const metaDescription =
    mcp.description ||
    "MCP server profile with structured metadata for discoverability and deployment readiness.";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const canonicalUrl = `${siteUrl}/aixcelerator/mcp/${mcp.slug || mcp.id}`;
  const tagNames = (mcp.tags || []).map((tag) => tag.name || tag.slug).filter(Boolean);
  const companyNames = (mcp.companies || []).map((company) => company.name || company.slug).filter(Boolean);
  const hasCoverImage = Boolean(mcp.coverImageUrl);
  const lastUpdatedValue = mcp.lastUpdated ? new Date(mcp.lastUpdated) : null;
  const lastUpdatedLabel = lastUpdatedValue
    ? lastUpdatedValue.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;
  const capabilities = parseList(mcp.capabilities);
  const tools = parseList(mcp.tools);
  const authMethods = parseList(mcp.authMethods);
  const hostingOptions = parseList(mcp.hostingOptions);
  const integrations = companyNames;
  const pricingNotes = parseList(mcp.pricing);
  const keywords = [mcp.industry, mcp.category, ...tagNames, ...companyNames].filter(Boolean).join(", ");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: mcp.name,
    description: metaDescription,
    applicationCategory: "MCP Server",
    operatingSystem: "Web",
    url: canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: "Colaberry AI",
      url: siteUrl,
    },
    sameAs: mcp.sourceUrl ? [mcp.sourceUrl] : undefined,
    keywords: keywords || undefined,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Industry", value: mcp.industry || "General" },
      { "@type": "PropertyValue", name: "Category", value: mcp.category || "General" },
      { "@type": "PropertyValue", name: "Status", value: status },
      { "@type": "PropertyValue", name: "Visibility", value: isPrivate ? "Private" : "Public" },
      { "@type": "PropertyValue", name: "Source", value: sourceDisplay },
      { "@type": "PropertyValue", name: "Verified", value: mcp.verified ? "Yes" : "No" },
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
        <Link href="/aixcelerator/mcp" className="hover:text-slate-700">
          MCP Servers
        </Link>
        <span>/</span>
        <span className="text-slate-700" aria-current="page">
          {mcp.name}
        </span>
      </nav>

      <div className="hero-surface mt-4 rounded-[32px] p-8 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <SectionHeader
              as="h1"
              size="xl"
              kicker="MCP profile"
              title={mcp.name}
              description={mcp.description || "Detailed overview coming soon."}
            />
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="chip chip-brand rounded-full px-3 py-1 text-xs font-semibold">
                {mcp.industry || "General"}
              </span>
              {mcp.category ? (
                <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
                  {mcp.category}
                </span>
              ) : null}
              {mcp.serverType ? (
                <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
                  {mcp.serverType}
                </span>
              ) : null}
              {mcp.language ? (
                <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
                  {mcp.language}
                </span>
              ) : null}
              {typeof mcp.openSource === "boolean" ? (
                <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
                  {mcp.openSource ? "Open source" : "Commercial"}
                </span>
              ) : null}
              <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
              <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
                {sourceDisplay}
              </span>
              {mcp.verified ? (
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
              {mcp.docsUrl ? (
                <a href={mcp.docsUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                  View documentation
                </a>
              ) : (
                <Link href="/request-demo" className="btn btn-primary">
                  Book a demo
                </Link>
              )}
              {mcp.sourceUrl ? (
                <a href={mcp.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                  View source
                </a>
              ) : (
                <Link href="/aixcelerator/mcp" className="btn btn-secondary">
                  View all MCP servers
                </Link>
              )}
            </div>
          </div>

          <div className="surface-panel overflow-hidden border border-slate-200/80 p-0">
            <div className="relative aspect-[4/3] w-full">
              {hasCoverImage ? (
                <img
                  src={mcp.coverImageUrl || ""}
                  alt={mcp.coverImageAlt || mcp.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
                        <path
                          d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Zm5 2a2 2 0 0 0-2 2v4h2v-2h2v2h2v-4a2 2 0 0 0-2-2H9Zm6 0a2 2 0 0 0-2 2v4h2v-2h2v2h2v-4a2 2 0 0 0-2-2h-2Z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                      MCP surface
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="surface-panel p-6">
          <SectionHeader
            as="h2"
            size="md"
            kicker="Operational summary"
            title="Readiness snapshot"
            description="Deployment status, ownership signals, and documentation access."
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
              value={mcp.verified ? "Yes" : "No"}
              description={mcp.verified ? "Ownership and metadata reviewed." : "Verification pending."}
            />
            <DetailCard
              label="Industry"
              value={mcp.industry || "General"}
              description="Primary domain alignment."
            />
            <DetailCard
              label="Category"
              value={mcp.category || "General"}
              description="Integration classification."
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
                mcp.docsUrl ? "Documentation available for integration teams." : "Documentation not linked yet.",
                mcp.verified ? "Verified metadata and ownership confirmed." : "Verification pending.",
                isPrivate ? "Private listing with restricted access." : "Public listing for catalog discovery.",
              ]}
            />
            <GuidanceBlock
              title="Resources"
              items={[
                mcp.docsUrl ? "Docs link available for setup." : "Docs link pending.",
                mcp.sourceUrl ? "Source repository available." : "Source link not provided yet.",
              ]}
              actions={
                <div className="mt-4 flex flex-wrap gap-3">
                  {mcp.docsUrl ? (
                    <a href={mcp.docsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-compact">
                      View docs
                    </a>
                  ) : null}
                  {mcp.sourceUrl ? (
                    <a href={mcp.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-compact">
                      View source
                    </a>
                  ) : null}
                  {!mcp.docsUrl && !mcp.sourceUrl ? (
                    <Link href="/request-demo" className="btn btn-ghost btn-compact">
                      Request access
                    </Link>
                  ) : null}
                </div>
              }
            />
          </div>
        </div>

        <aside className="surface-panel p-6">
          <SectionHeader
            as="h2"
            size="md"
            kicker="LLM metadata"
            title="Structured profile"
            description="Fields optimized for catalog indexing and retrieval."
          />
          <dl className="mt-6 grid gap-4">
            <MetadataRow label="Name" value={mcp.name} />
            <MetadataRow label="Slug" value={mcp.slug || "Not provided"} />
            <MetadataRow label="Industry" value={mcp.industry || "General"} />
            <MetadataRow label="Category" value={mcp.category || "General"} />
            <MetadataRow label="Server type" value={mcp.serverType || "Not provided"} />
            <MetadataRow label="Primary function" value={mcp.primaryFunction || "Not provided"} />
            <MetadataRow label="Open source" value={mcp.openSource ? "Yes" : "No"} />
            <MetadataRow label="Language" value={mcp.language || "Not provided"} />
            <MetadataRow label="Status" value={status} />
            <MetadataRow label="Visibility" value={isPrivate ? "Private" : "Public"} />
            <MetadataRow label="Source" value={sourceDisplay} />
            <MetadataRow label="Verified" value={mcp.verified ? "Yes" : "No"} />
            <MetadataRow label="Last updated" value={lastUpdatedLabel || "Not provided"} />
            <MetadataRow label="Tags" value={formatList(mcp.tags)} />
            <MetadataRow label="Companies" value={formatList(mcp.companies)} />
            <MetadataRow label="Documentation" value={mcp.docsUrl || "Not linked yet"} href={mcp.docsUrl || undefined} />
            <MetadataRow label="Source URL" value={mcp.sourceUrl || "Not linked yet"} href={mcp.sourceUrl || undefined} />
            <MetadataRow label="Compatibility" value={mcp.compatibility || "Not provided"} />
            <MetadataRow label="Pricing" value={mcp.pricing || "Not provided"} />
            <MetadataRow label="Try it now" value={mcp.tryItNowUrl || "Not linked yet"} href={mcp.tryItNowUrl || undefined} />
          </dl>
        </aside>
      </section>

      <section className="surface-panel mt-6 p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="About"
          title="Capabilities and scope"
          description="Technical summary, primary function, and service characteristics."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</div>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              {mcp.primaryFunction ? (
                <p>{mcp.primaryFunction}</p>
              ) : (
                <p>Describe the primary function and why this MCP server matters.</p>
              )}
              {mcp.description ? <p>{mcp.description}</p> : null}
            </div>
          </div>
          <ListSection
            title="Capabilities"
            items={capabilities}
            empty="Capabilities not documented yet."
          />
        </div>
      </section>

      <section className="surface-panel mt-6 p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Tools & endpoints"
          title="Exposed actions"
          description="Key actions, tools, or endpoints provided by this server."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ListSection title="Tools" items={tools} empty="Tools not documented yet." />
          <ListSection title="Integrations" items={integrations} empty="Integrations not linked yet." />
        </div>
      </section>

      <section className="surface-panel mt-6 p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Security"
          title="Auth and credentials"
          description="Credential types, access patterns, and control expectations."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ListSection title="Auth methods" items={authMethods} empty="Auth methods not documented yet." />
          <ListSection title="Hosting options" items={hostingOptions} empty="Hosting options not documented yet." />
        </div>
      </section>

      <section className="surface-panel mt-6 p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Compatibility"
          title="Deployment requirements"
          description="Protocol versions, environment expectations, and pricing signals."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ListSection
            title="Compatibility"
            items={parseList(mcp.compatibility)}
            empty="Compatibility requirements not documented yet."
          />
          <ListSection
            title="Pricing & usage limits"
            items={pricingNotes}
            empty="Pricing details not documented yet."
          />
        </div>
      </section>

      <section className="surface-panel mt-6 p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Resources"
          title="Docs, source, and try it now"
          description="Links for integration teams and evaluation."
        />
        <div className="mt-6 flex flex-wrap gap-3">
          {mcp.docsUrl ? (
            <a href={mcp.docsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
              View docs
            </a>
          ) : null}
          {mcp.sourceUrl ? (
            <a href={mcp.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
              View source
            </a>
          ) : null}
          {mcp.tryItNowUrl ? (
            <a href={mcp.tryItNowUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
              Try it now
            </a>
          ) : null}
          {!mcp.docsUrl && !mcp.sourceUrl && !mcp.tryItNowUrl ? (
            <p className="text-sm text-slate-600">Resources not linked yet.</p>
          ) : null}
        </div>
      </section>

      <section className="surface-panel mt-6 p-6">
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
            value={mcp.usageCount ? mcp.usageCount.toLocaleString() : "—"}
            note="Recorded runs or deployments."
          />
          <SignalStat
            label="Rating"
            value={mcp.rating ? `${mcp.rating.toFixed(1)} / 5` : "—"}
            note="Internal or customer feedback."
          />
          <SignalStat
            label="Open source"
            value={mcp.openSource === true ? "Yes" : mcp.openSource === false ? "No" : "—"}
            note="Licensing signal."
          />
        </div>
      </section>

      {relatedServers.length > 0 && (
        <section className="surface-panel mt-6 p-6">
          <SectionHeader
            as="h2"
            size="md"
            kicker="Related"
            title="Similar MCP servers"
            description="Servers with shared categories, industries, or tags."
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {relatedServers.map((related) => (
              <MCPCard key={related.id} mcp={related} />
            ))}
          </div>
        </section>
      )}
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
