import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import Head from "next/head";
import sanitizeHtml from "sanitize-html";
import Layout from "../../../components/Layout";
import SectionHeader from "../../../components/SectionHeader";
import EnterprisePageHero from "../../../components/EnterprisePageHero";
import MCPCard from "../../../components/MCPCard";
import { fetchMCPServerBySlug, fetchRelatedMCPServers, MCPServer } from "../../../lib/cms";
import { heroImage } from "../../../lib/media";
import type { ReactNode } from "react";

type MCPDetailProps = {
  mcp: MCPServer;
  allowPrivate: boolean;
  relatedServers: MCPServer[];
};

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<MCPDetailProps> = async ({ params }) => {
  const slug = String(params?.slug || "");
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";

  try {
    const mcp = await fetchMCPServerBySlug(slug);
    if (!mcp) {
      return { notFound: true, revalidate: 120 };
    }
    if (!allowPrivate && (mcp.visibility || "public").toLowerCase() === "private") {
      return { notFound: true, revalidate: 120 };
    }
    let relatedServers: MCPServer[] = [];
    try {
      const visibilityFilter = allowPrivate ? undefined : "public";
      relatedServers = await fetchRelatedMCPServers(mcp, {
        visibility: visibilityFilter,
        limit: 3,
      });
    } catch {
      relatedServers = [];
    }
    return {
      props: { mcp, allowPrivate, relatedServers },
      revalidate: 600,
    };
  } catch {
    return { notFound: true, revalidate: 120 };
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
  const keyBenefits = parseList(mcp.keyBenefits);
  const useCases = parseList(mcp.useCases);
  const limitations = parseList(mcp.limitations);
  const requirements = parseList(mcp.requirements);
  const compatibilityItems = parseList(mcp.compatibility);
  const hasAboutSection = Boolean(mcp.primaryFunction || mcp.description || mcp.longDescription || capabilities.length);
  const hasValueSection = keyBenefits.length > 0 || limitations.length > 0;
  const hasExecutionSection = useCases.length > 0 || Boolean(mcp.exampleWorkflow) || requirements.length > 0;
  const hasToolsSection = tools.length > 0 || integrations.length > 0;
  const hasSecuritySection = authMethods.length > 0 || hostingOptions.length > 0;
  const hasCompatibilitySection = compatibilityItems.length > 0 || pricingNotes.length > 0;
  const hasResourcesSection = Boolean(mcp.docsUrl || mcp.sourceUrl || mcp.tryItNowUrl);
  const hasAdoptionSection =
    typeof mcp.usageCount === "number" ||
    typeof mcp.rating === "number" ||
    typeof mcp.openSource === "boolean" ||
    Boolean(mcp.verified);
  const visibilityModeNote = allowPrivate
    ? "Private preview mode enabled for this environment."
    : "Public-only mode in this environment.";
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

      <div className="mt-4">
        <EnterprisePageHero
          kicker="MCP profile"
          title={mcp.name}
          description={mcp.description || "Structured MCP server profile for enterprise catalog discovery."}
          image={heroImage("hero-mcp-cinematic.webp")}
          alt={mcp.coverImageAlt || `${mcp.name} MCP profile preview`}
          imageKicker="MCP surface"
          imageTitle="Integration profile"
          imageDescription={`${mcp.industry || "General"}${mcp.category ? ` • ${mcp.category}` : ""} • ${status}`}
          chips={[
            mcp.industry || "General",
            ...(mcp.category ? [mcp.category] : []),
            ...(mcp.serverType ? [mcp.serverType] : []),
            ...(mcp.language ? [mcp.language] : []),
            ...(typeof mcp.openSource === "boolean" ? [mcp.openSource ? "Open source" : "Commercial"] : []),
            sourceDisplay,
            isPrivate ? "Private" : "Public",
          ]}
          primaryAction={
            mcp.docsUrl
              ? { label: "View documentation", href: mcp.docsUrl, external: true }
              : { label: "Request a demo", href: "/request-demo" }
          }
          secondaryAction={
            mcp.sourceUrl
              ? { label: "View source", href: mcp.sourceUrl, external: true, variant: "secondary" }
              : { label: "View all MCP servers", href: "/aixcelerator/mcp", variant: "secondary" }
          }
          metrics={[
            {
              label: "Last updated",
              value: lastUpdatedLabel || "Pending",
              note: "Latest metadata refresh.",
            },
            {
              label: "Signals",
              value: `${tagNames.length} tags`,
              note: `${companyNames.length} linked companies.`,
            },
            {
              label: "Visibility",
              value: isPrivate ? "Private" : "Public",
              note: isPrivate
                ? "Restricted access listing."
                : `Available for catalog discovery. ${visibilityModeNote}`,
            },
          ]}
        />
      </div>

      <section className="section-spacing grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="grid gap-6">
          <div className="surface-panel section-shell p-6">
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

          {hasAboutSection ? (
            <section className="surface-panel section-shell p-6">
              <SectionHeader
                as="h2"
                size="md"
                kicker="About"
                title="Capabilities and scope"
                description="Technical summary, primary function, and service characteristics."
              />
              <div
                className={`mt-6 grid gap-6 ${
                  (mcp.primaryFunction || mcp.description || mcp.longDescription) && capabilities.length > 0
                    ? "lg:grid-cols-[1.2fr_0.8fr]"
                    : ""
                }`}
              >
                {mcp.primaryFunction || mcp.description || mcp.longDescription ? (
                  <div className="section-card rounded-2xl p-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Summary
                    </div>
                    <div className="mt-3 space-y-3 text-sm text-slate-700">
                      {mcp.primaryFunction ? <p>{mcp.primaryFunction}</p> : null}
                      {mcp.description ? <p>{mcp.description}</p> : null}
                    </div>
                    {mcp.longDescription ? (
                      <div className="mt-4">{renderRichText(mcp.longDescription)}</div>
                    ) : null}
                  </div>
                ) : null}
                {capabilities.length > 0 ? (
                  <ListSection
                    title="Capabilities"
                    items={capabilities}
                    empty="Capabilities not documented yet."
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {hasValueSection ? (
            <section className="surface-panel section-shell p-6">
              <SectionHeader
                as="h2"
                size="md"
                kicker="Value"
                title="Benefits and constraints"
                description="Key benefits plus known limitations and tradeoffs."
              />
              <div
                className={`mt-6 grid gap-6 ${
                  keyBenefits.length > 0 && limitations.length > 0 ? "lg:grid-cols-2" : ""
                }`}
              >
                {keyBenefits.length > 0 ? (
                  <ListSection
                    title="Key benefits"
                    items={keyBenefits}
                    empty="Key benefits not documented yet."
                  />
                ) : null}
                {limitations.length > 0 ? (
                  <ListSection
                    title="Limitations"
                    items={limitations}
                    empty="Limitations not documented yet."
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {hasExecutionSection ? (
            <section className="surface-panel section-shell p-6">
              <SectionHeader
                as="h2"
                size="md"
                kicker="Execution"
                title="Use cases and workflow"
                description="Where the server is used and how it runs end-to-end."
              />
              <div
                className={`mt-6 grid gap-6 ${
                  useCases.length > 0 && (mcp.exampleWorkflow || requirements.length > 0)
                    ? "lg:grid-cols-[1.1fr_0.9fr]"
                    : ""
                }`}
              >
                {useCases.length > 0 ? (
                  <ListSection title="Use cases" items={useCases} empty="Use cases not documented yet." />
                ) : null}
                {mcp.exampleWorkflow || requirements.length > 0 ? (
                  <div className="section-card rounded-2xl p-5">
                    {mcp.exampleWorkflow ? (
                      <>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Example workflow
                        </div>
                        <div className="mt-3 space-y-3 text-sm text-slate-700">
                          {renderParagraphs(mcp.exampleWorkflow)}
                        </div>
                      </>
                    ) : null}
                    {requirements.length ? (
                      <>
                        <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Requirements
                        </div>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                          {requirements.map((item, index) => (
                            <li key={`req-${index}`} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-aqua" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {hasToolsSection ? (
            <section className="surface-panel section-shell p-6">
              <SectionHeader
                as="h2"
                size="md"
                kicker="Tools & endpoints"
                title="Exposed actions"
                description="Key actions, tools, or endpoints provided by this server."
              />
              <div
                className={`mt-6 grid gap-6 ${
                  tools.length > 0 && integrations.length > 0 ? "lg:grid-cols-2" : ""
                }`}
              >
                {tools.length > 0 ? (
                  <ListSection title="Tools" items={tools} empty="Tools not documented yet." />
                ) : null}
                {integrations.length > 0 ? (
                  <ListSection
                    title="Integrations"
                    items={integrations}
                    empty="Integrations not linked yet."
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {hasSecuritySection ? (
            <section className="surface-panel section-shell p-6">
              <SectionHeader
                as="h2"
                size="md"
                kicker="Security"
                title="Auth and credentials"
                description="Credential types, access patterns, and control expectations."
              />
              <div
                className={`mt-6 grid gap-6 ${
                  authMethods.length > 0 && hostingOptions.length > 0 ? "lg:grid-cols-2" : ""
                }`}
              >
                {authMethods.length > 0 ? (
                  <ListSection
                    title="Auth methods"
                    items={authMethods}
                    empty="Auth methods not documented yet."
                  />
                ) : null}
                {hostingOptions.length > 0 ? (
                  <ListSection
                    title="Hosting options"
                    items={hostingOptions}
                    empty="Hosting options not documented yet."
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {hasCompatibilitySection ? (
            <section className="surface-panel section-shell p-6">
              <SectionHeader
                as="h2"
                size="md"
                kicker="Compatibility"
                title="Deployment requirements"
                description="Protocol versions, environment expectations, and pricing signals."
              />
              <div
                className={`mt-6 grid gap-6 ${
                  compatibilityItems.length > 0 && pricingNotes.length > 0 ? "lg:grid-cols-2" : ""
                }`}
              >
                {compatibilityItems.length > 0 ? (
                  <ListSection
                    title="Compatibility"
                    items={compatibilityItems}
                    empty="Compatibility requirements not documented yet."
                  />
                ) : null}
                {pricingNotes.length > 0 ? (
                  <ListSection
                    title="Pricing & usage limits"
                    items={pricingNotes}
                    empty="Pricing details not documented yet."
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {hasResourcesSection ? (
            <section className="surface-panel section-shell p-6">
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
              </div>
            </section>
          ) : null}

          {hasAdoptionSection ? (
            <section className="surface-panel section-shell p-6">
              <SectionHeader
                as="h2"
                size="md"
                kicker="Adoption"
                title="Usage signals"
                description="Signals to help teams evaluate readiness and adoption."
              />
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {typeof mcp.usageCount === "number" ? (
                  <SignalStat
                    label="Usage"
                    value={mcp.usageCount.toLocaleString()}
                    note="Recorded runs or deployments."
                  />
                ) : null}
                {typeof mcp.rating === "number" ? (
                  <SignalStat
                    label="Rating"
                    value={`${mcp.rating.toFixed(1)} / 5`}
                    note="Internal or customer feedback."
                  />
                ) : null}
                {typeof mcp.openSource === "boolean" ? (
                  <SignalStat
                    label="Open source"
                    value={mcp.openSource ? "Yes" : "No"}
                    note="Licensing signal."
                  />
                ) : null}
                {typeof mcp.verified === "boolean" ? (
                  <SignalStat
                    label="Verification"
                    value={mcp.verified ? "Verified" : "Pending"}
                    note="Ownership and metadata review."
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {relatedServers.length > 0 && (
            <section className="surface-panel section-shell p-6">
              <SectionHeader
                as="h2"
                size="md"
                kicker="Related"
                title="Similar MCP servers"
                description="Servers with shared categories, industries, or tags."
              />
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {relatedServers.map((related) => (
                  <MCPCard key={related.slug || String(related.id)} mcp={related} />
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
            <MetadataRow label="Name" value={mcp.name} />
            <MetadataRow label="Slug" value={mcp.slug || "Not provided"} />
            <MetadataRow label="Industry" value={mcp.industry || "General"} />
            <MetadataRow label="Category" value={mcp.category || "General"} />
            <MetadataRow label="Server type" value={mcp.serverType || "Not provided"} />
            <MetadataRow label="Primary function" value={mcp.primaryFunction || "Not provided"} />
            <MetadataRow
              label="Open source"
              value={mcp.openSource === true ? "Yes" : mcp.openSource === false ? "No" : "Not provided"}
            />
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
    </Layout>
  );
}

function MetadataRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="section-card rounded-2xl p-4">
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
    <div className="section-card rounded-2xl p-4">
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
    <div className="section-card rounded-2xl p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      {items.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={`${label}-${item}`}
              className="chip chip-muted rounded-full px-2.5 py-1 text-xs font-semibold"
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
    <div className="section-card rounded-2xl p-5">
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
    <div className="section-card rounded-2xl p-4">
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

function renderRichText(value?: string | null): ReactNode {
  if (!value) return null;
  const clean = sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
  });
  if (!clean.trim()) return null;
  return (
    <div
      className="text-sm text-slate-700 [&_p]:mt-3 first:[&_p]:mt-0 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand-deep [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
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
    <div className="section-card rounded-2xl p-5">
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
