import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import Head from "next/head";
import Layout from "../../../components/Layout";
import EnterprisePageHero from "../../../components/EnterprisePageHero";
import EnterpriseCtaBand from "../../../components/EnterpriseCtaBand";
import MCPCard from "../../../components/MCPCard";
import StickyTabBar, { type TabItem } from "../../../components/StickyTabBar";
import { fetchMCPServerBySlug, fetchRelatedMCPServers, type MCPServer } from "../../../lib/cms";
import { parseList, parseToolsStructured, parseToolsJson, renderRichText, renderParagraphs, cleanDisplayName } from "../../../lib/mcp-utils";

import SectionHeading from "../../../components/mcp/SectionHeading";
import BulletList from "../../../components/mcp/BulletList";
import SpecCard from "../../../components/mcp/SpecCard";
import GitHubStats from "../../../components/mcp/GitHubStats";
import CodeBlock from "../../../components/mcp/CodeBlock";
import CopyButton from "../../../components/mcp/CopyButton";
import EnrichedToolCard from "../../../components/mcp/EnrichedToolCard";
import MCPToolCard from "../../../components/mcp/ToolCard";
import ConnectSidebar from "../../../components/mcp/ConnectSidebar";
import PerformanceTab from "../../../components/mcp/PerformanceTab";
import UsageTab from "../../../components/mcp/UsageTab";

import { useState, type ReactNode } from "react";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";

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
        limit: 6,
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

/* ---------- Inline helpers ---------- */

function NumberedStep({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-sm font-bold text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h4>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */

export default function MCPDetail({ mcp, relatedServers }: MCPDetailProps) {
  const [apiMethod, setApiMethod] = useState<"cli" | "sdk" | "typescript">("cli");
  const [showOptional, setShowOptional] = useState(false);

  const isPrivate = (mcp.visibility || "public").toLowerCase() === "private";
  const status = mcp.status || "Unknown";
  const source = mcp.source || "internal";
  const sourceLabel =
    source === "external" ? "External" : source === "partner" ? "Partner" : "Internal";
  const sourceDisplay = mcp.sourceName
    ? `${sourceLabel} (${mcp.sourceName})`
    : source === "internal"
      ? `${sourceLabel} (Colaberry)`
      : sourceLabel;
  const displayName = cleanDisplayName(mcp.name);
  const metaTitle = `${displayName} | MCP Servers | Colaberry AI`;
  const metaDescription =
    mcp.description ||
    "MCP server profile with structured metadata for discoverability and deployment readiness.";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const canonicalUrl = `${siteUrl}/aixcelerator/mcp/${mcp.slug || mcp.id}`;
  const seoMeta: SeoMeta = {
    title: metaTitle,
    description: metaDescription,
    canonical: buildCanonical(`/aixcelerator/mcp/${mcp.slug || mcp.id}`),
    ogType: "article",
    ogImage: mcp.coverImageUrl || null,
    ogImageAlt: mcp.coverImageAlt || `${displayName} MCP profile`,
  };
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
  const structuredTools = parseToolsStructured(mcp.tools);
  const authMethods = parseList(mcp.authMethods);
  const hostingOptions = parseList(mcp.hostingOptions);
  const pricingNotes = parseList(mcp.pricing);
  const keyBenefits = parseList(mcp.keyBenefits);
  const useCases = parseList(mcp.useCases);
  const limitations = parseList(mcp.limitations);
  const requirements = parseList(mcp.requirements);
  const compatibilityItems = parseList(mcp.compatibility);

  const enrichedTools = parseToolsJson(mcp.toolsJson);
  const hasEnrichedTools = enrichedTools.length > 0;

  const primaryFunctionUnique = mcp.primaryFunction && mcp.primaryFunction !== mcp.description;
  const descriptionFallback = !primaryFunctionUnique && !mcp.longDescription ? mcp.description : null;
  const hasAboutSection = Boolean(primaryFunctionUnique || mcp.longDescription || descriptionFallback || capabilities.length);
  const hasUseCases = useCases.length > 0;
  const hasHowItWorks = hasEnrichedTools || tools.length > 0 || Boolean(mcp.exampleWorkflow);
  const hasBenefits = keyBenefits.length > 0;
  const hasLimitations = limitations.length > 0;
  const hasInstallSection = Boolean(mcp.installCommand || mcp.configSnippet || mcp.installCli || mcp.installSdk || mcp.configSnippetClaude || mcp.installAiSdk || mcp.installTypescript);
  const hasTechSpecs = true; // Always show — status, industry, category available for all servers
  const hasHostingSection = hostingOptions.length > 0 || pricingNotes.length > 0;

  // Collect required and optional config parameters from enriched tools
  const requiredParams = enrichedTools.flatMap((t) =>
    t.parameters.filter((p) => p.required).map((p) => ({ ...p, toolName: t.name }))
  );
  const optionalParams = enrichedTools.flatMap((t) =>
    t.parameters.filter((p) => !p.required).map((p) => ({ ...p, toolName: t.name }))
  );

  // Build sticky tabs — Smithery-style: Overview | Hosting | API | Performance | Usage
  const stickyTabs: TabItem[] = [];
  stickyTabs.push({ id: "overview", label: "Overview" });
  if (hasHostingSection) stickyTabs.push({ id: "hosting", label: "Hosting" });
  if (hasInstallSection || hasEnrichedTools) stickyTabs.push({ id: "api", label: "API" });
  stickyTabs.push({ id: "performance", label: "Performance" });
  stickyTabs.push({ id: "usage", label: "Usage" });

  const publisherName = mcp.sourceName || (mcp.companies?.length ? mcp.companies[0].name : null);
  const isGitHub = Boolean(mcp.sourceUrl?.match(/github\.com\/([^/]+)\/([^/]+)/));

  const keywords = [mcp.industry, mcp.category, ...tagNames, ...companyNames].filter(Boolean).join(", ");
  const softwareApp = {
    "@type": "SoftwareApplication" as const,
    name: displayName,
    description: metaDescription,
    applicationCategory: "MCP Server",
    applicationSubCategory: mcp.category || undefined,
    operatingSystem: "Web",
    url: canonicalUrl,
    dateModified: mcp.lastUpdated || undefined,
    isAccessibleForFree: typeof mcp.openSource === "boolean" ? mcp.openSource : undefined,
    publisher: publisherName
      ? { "@type": "Organization" as const, name: publisherName }
      : { "@type": "Organization" as const, name: "Colaberry AI", url: siteUrl },
    sameAs: mcp.sourceUrl ? [mcp.sourceUrl] : undefined,
    keywords: keywords || undefined,
    featureList: tools.length > 0 ? tools : undefined,
    softwareRequirements: requirements.length > 0 ? requirements.join(", ") : undefined,
    offers: mcp.pricing ? { "@type": "Offer" as const, description: mcp.pricing } : undefined,
    additionalProperty: [
      { "@type": "PropertyValue" as const, name: "Industry", value: mcp.industry || "General" },
      { "@type": "PropertyValue" as const, name: "Category", value: mcp.category || "General" },
      { "@type": "PropertyValue" as const, name: "Status", value: status },
      { "@type": "PropertyValue" as const, name: "Server Type", value: mcp.serverType || "Unknown" },
      { "@type": "PropertyValue" as const, name: "Language", value: mcp.language || "Unknown" },
      { "@type": "PropertyValue" as const, name: "Visibility", value: isPrivate ? "Private" : "Public" },
      { "@type": "PropertyValue" as const, name: "Source", value: sourceDisplay },
      { "@type": "PropertyValue" as const, name: "Verified", value: mcp.verified ? "Yes" : "No" },
      ...tools.map((t) => ({ "@type": "PropertyValue" as const, name: "MCP Tool", value: t })),
      ...enrichedTools.map((t) => ({
        "@type": "PropertyValue" as const,
        name: `Tool: ${t.name}`,
        value: t.parameters.map((p) => `${p.name}:${p.type}${p.required ? "*" : ""}`).join(", "),
      })),
      ...(mcp.linkedTools || []).map((t) => ({ "@type": "PropertyValue" as const, name: "Connected Tool", value: t.name })),
    ],
  };

  const howToSteps: { "@type": "HowToStep"; name: string; text: string }[] = [];
  if (mcp.installCommand) howToSteps.push({ "@type": "HowToStep", name: "Install via CLI", text: mcp.installCommand });
  if (mcp.installAiSdk || mcp.installSdk) howToSteps.push({ "@type": "HowToStep", name: "Install via AI SDK", text: (mcp.installAiSdk || mcp.installSdk)! });
  if (mcp.installTypescript) howToSteps.push({ "@type": "HowToStep", name: "Install via TypeScript", text: mcp.installTypescript });
  if (mcp.configSnippet) howToSteps.push({ "@type": "HowToStep", name: "Configure", text: mcp.configSnippet });

  const jsonLd = howToSteps.length > 0
    ? {
        "@context": "https://schema.org",
        "@graph": [
          softwareApp,
          {
            "@type": "HowTo" as const,
            name: `How to install ${displayName}`,
            step: howToSteps,
          },
        ],
      }
    : { "@context": "https://schema.org", ...softwareApp };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400" aria-label="Breadcrumb">
        <Link href="/aixcelerator" className="hover:text-zinc-700 dark:hover:text-zinc-200">
          AIXcelerator
        </Link>
        <span>/</span>
        <Link href="/aixcelerator/mcp" className="hover:text-zinc-700 dark:hover:text-zinc-200">
          MCP Servers
        </Link>
        <span>/</span>
        <span className="text-zinc-700 dark:text-zinc-200" aria-current="page">
          {displayName}
        </span>
      </nav>

      {/* Hero */}
      <div className="reveal mt-6">
        <EnterprisePageHero
          kicker="MCP profile"
          title={displayName}
          description={mcp.description || "MCP server profile with structured metadata for discoverability and deployment readiness."}
          chips={[
            mcp.industry,
            mcp.category,
            mcp.serverType,
            mcp.language,
            typeof mcp.openSource === "boolean" ? (mcp.openSource ? "Open Source" : "Commercial") : null,
            sourceLabel,
            isPrivate ? "Private" : null,
          ].filter(Boolean) as string[]}
          primaryAction={{
            href: mcp.tryItNowUrl || "/request-demo",
            label: mcp.tryItNowUrl ? "Try it now" : "Book a demo",
            external: Boolean(mcp.tryItNowUrl),
          }}
          secondaryAction={{
            href: mcp.sourceUrl || "/aixcelerator/mcp",
            label: mcp.sourceUrl ? "View source" : "View all MCPs",
            variant: "secondary",
            external: Boolean(mcp.sourceUrl),
          }}
          metrics={[
            lastUpdatedLabel && { label: "Last updated", value: lastUpdatedLabel },
            (tagNames.length + companyNames.length) > 0 && {
              label: "Signals",
              value: `${tagNames.length + companyNames.length} connected`,
            },
            { label: "Visibility", value: isPrivate ? "Private" : "Public" },
          ].filter(Boolean) as { label: string; value: string }[]}
        />
      </div>

      {/* Publisher attribution bar */}
      {(publisherName || typeof mcp.usageCount === "number" || isGitHub) && (
        <div className="reveal mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 px-1">
          {publisherName && (
            <span className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-500 dark:text-zinc-500">By</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{publisherName}</span>
            </span>
          )}
          {typeof mcp.usageCount === "number" && (
            <span className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v10M4.5 9.5 8 13l3.5-3.5" /><path d="M2 2h12" /></svg>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{mcp.usageCount.toLocaleString()}</span>
              <span>installs</span>
            </span>
          )}
          <GitHubStats sourceUrl={mcp.sourceUrl} />
        </div>
      )}

      {/* Sticky tab navigation */}
      <StickyTabBar tabs={stickyTabs} />

      {/* Two-column layout: main content + sidebar */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">

        {/* ════════════ LEFT COLUMN: Main content ════════════ */}
        <div className="space-y-14">

          {/* ── OVERVIEW TAB ── */}
          <section id="overview" className="reveal scroll-mt-[128px]">
            {/* About */}
            {hasAboutSection && (
              <div>
                <SectionHeading title="About This MCP Server" />
                <hr className="mt-3 border-zinc-200 dark:border-zinc-700" />
                <div className="mt-6 space-y-4 text-[0.9375rem] leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {primaryFunctionUnique && <p className="font-medium text-zinc-900 dark:text-zinc-100">{mcp.primaryFunction}</p>}
                  {mcp.longDescription && renderRichText(mcp.longDescription)}
                  {descriptionFallback && <p>{descriptionFallback}</p>}
                </div>
                {capabilities.length > 0 && (
                  <div className="mt-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Capabilities</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {capabilities.map((cap) => (
                        <span key={cap} className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tools & Endpoints */}
            {hasHowItWorks && (
              <div className="mt-10">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Tools & Endpoints
                  {(hasEnrichedTools || structuredTools.length > 0) && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {hasEnrichedTools ? enrichedTools.length : structuredTools.length}
                    </span>
                  )}
                </h3>

                {hasEnrichedTools ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {enrichedTools.map((tool, i) => (
                      <EnrichedToolCard key={i} tool={tool} index={i} />
                    ))}
                  </div>
                ) : structuredTools.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {structuredTools.map((tool, i) => (
                      <MCPToolCard key={i} tool={tool} index={i} />
                    ))}
                  </div>
                ) : null}

                {mcp.exampleWorkflow && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Example Workflow</h3>
                    <div className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {renderParagraphs(mcp.exampleWorkflow)}
                    </div>
                  </div>
                )}

                {companyNames.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Integrations</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {companyNames.map((name) => (
                        <span key={name} className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* What Problems It Solves */}
            {hasUseCases && (
              <div className="mt-10">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">What Problems It Solves</h3>
                <div className="mt-4">
                  <BulletList items={useCases} />
                </div>
              </div>
            )}

            {/* Connected Tools */}
            {mcp.linkedTools && mcp.linkedTools.length > 0 && (
              <div className="mt-10">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Connected Tools</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Tools and services this MCP server integrates with.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mcp.linkedTools.map((tool) => (
                    <Link
                      key={tool.slug}
                      href={`/aixcelerator/tools/${tool.slug}`}
                      className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                    >
                      {tool.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits / Limitations */}
            {hasBenefits && (
              <div className="mt-10">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Why Use {displayName}?</h3>
                <div className="mt-4">
                  <BulletList items={keyBenefits} />
                </div>
                {hasLimitations && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Limitations</h4>
                    <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {limitations.map((item, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {!hasBenefits && hasLimitations && (
              <div className="mt-10">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Known Limitations</h3>
                <div className="mt-4">
                  <BulletList items={limitations} />
                </div>
              </div>
            )}

            {/* Specifications (moved into Overview) */}
            {hasTechSpecs && (
              <div className="mt-10">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Specifications</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <SpecCard label="Status" value={status} />
                  <SpecCard label="Industry" value={mcp.industry || "General"} />
                  <SpecCard label="Category" value={mcp.category || "General"} />
                  {mcp.serverType && <SpecCard label="Server type" value={mcp.serverType} />}
                  {mcp.language && <SpecCard label="Language" value={mcp.language} />}
                  {typeof mcp.openSource === "boolean" && (
                    <SpecCard label="License" value={mcp.openSource ? "Open Source" : "Commercial"} />
                  )}
                  <SpecCard label="Verified" value={mcp.verified ? "Yes" : "Pending"} />
                  {typeof mcp.usageCount === "number" && (
                    <SpecCard label="Usage" value={mcp.usageCount.toLocaleString()} note="Recorded runs or deployments" />
                  )}
                  {typeof mcp.rating === "number" && (
                    <SpecCard label="Rating" value={`${mcp.rating.toFixed(1)} / 5`} />
                  )}
                </div>

                {(authMethods.length > 0 || compatibilityItems.length > 0) && (
                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    {authMethods.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Auth Methods</h4>
                        <div className="mt-3"><BulletList items={authMethods} /></div>
                      </div>
                    )}
                    {compatibilityItems.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Compatibility</h4>
                        <div className="mt-3"><BulletList items={compatibilityItems} /></div>
                      </div>
                    )}
                  </div>
                )}

                {requirements.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Requirements</h4>
                    <div className="mt-3"><BulletList items={requirements} /></div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── HOSTING TAB ── */}
          {hasHostingSection && (
            <section id="hosting" className="reveal scroll-mt-[128px]">
              <SectionHeading title="Hosting" />
              <hr className="mt-3 border-zinc-200 dark:border-zinc-700" />
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {hostingOptions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Hosting Options</h4>
                    <div className="mt-3"><BulletList items={hostingOptions} /></div>
                  </div>
                )}
                {pricingNotes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Pricing</h4>
                    <div className="mt-3"><BulletList items={pricingNotes} /></div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── API TAB ── */}
          {(hasInstallSection || hasEnrichedTools) && (
            <section id="api" className="reveal scroll-mt-[128px]">
              <SectionHeading title="API" />
              <hr className="mt-3 border-zinc-200 dark:border-zinc-700" />
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                Integrate this server into your application. Choose a connection method below.
              </p>

              {/* CLI / AI SDK / TypeScript sub-tabs */}
              {hasInstallSection && (
                <div className="mt-6">
                  <div className="flex gap-0 border-b border-zinc-200 dark:border-zinc-700">
                    {(["cli", "sdk", "typescript"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setApiMethod(tab)}
                        className={`px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                          apiMethod === tab
                            ? "border-b-2 border-[#DC2626] text-zinc-900 dark:border-red-400 dark:text-zinc-100"
                            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                      >
                        {tab === "cli" ? "CLI" : tab === "sdk" ? "AI SDK" : "TypeScript"}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6">
                    {/* CLI tab */}
                    {apiMethod === "cli" && (
                      <div className="space-y-6">
                        {mcp.installCommand && (
                          <NumberedStep step={1} title="Install">
                            <CodeBlock label="Install command" code={mcp.installCommand} language={mcp.language || "bash"} />
                          </NumberedStep>
                        )}
                        {mcp.configSnippet && (
                          <NumberedStep step={mcp.installCommand ? 2 : 1} title="Configure">
                            <CodeBlock label="Configuration" code={mcp.configSnippet} language="json" />
                          </NumberedStep>
                        )}
                        {mcp.configSnippetClaude && (
                          <NumberedStep step={(mcp.installCommand ? 1 : 0) + (mcp.configSnippet ? 1 : 0) + 1} title="Claude Desktop">
                            <CodeBlock label="Claude Desktop config" code={mcp.configSnippetClaude} language="json" />
                          </NumberedStep>
                        )}
                        {mcp.installCli && !mcp.installCommand && !mcp.configSnippet && (
                          <NumberedStep step={1} title="Install via CLI">
                            <CodeBlock label="CLI" code={mcp.installCli} language="bash" />
                          </NumberedStep>
                        )}
                        {!mcp.installCommand && !mcp.configSnippet && !mcp.installCli && !mcp.configSnippetClaude && (
                          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/40">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">CLI installation instructions not yet available for this server.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI SDK tab */}
                    {apiMethod === "sdk" && (
                      <div>
                        {(mcp.installAiSdk || mcp.installSdk) ? (
                          <CodeBlock label="AI SDK" code={(mcp.installAiSdk || mcp.installSdk)!} language="typescript" />
                        ) : (
                          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/40">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">AI SDK integration code not yet available for this server.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TypeScript tab */}
                    {apiMethod === "typescript" && (
                      <div>
                        {mcp.installTypescript ? (
                          <CodeBlock label="TypeScript" code={mcp.installTypescript} language="typescript" />
                        ) : (
                          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/40">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">TypeScript integration code not yet available for this server.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Configuration Parameters */}
              {(requiredParams.length > 0 || optionalParams.length > 0) && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Configuration for {mcp.registryName || mcp.name.toLowerCase().replace(/\s+/g, "-")}
                  </h3>

                  {requiredParams.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Required parameters</div>
                      <div className="space-y-3">
                        {requiredParams.map((param) => (
                          <div key={`${param.toolName}-${param.name}`} className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <code className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">{param.name}</code>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.625rem] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{param.type}</span>
                                <span className="text-[0.625rem] font-bold text-[#DC2626] dark:text-red-400">REQUIRED</span>
                              </div>
                              {param.description && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{param.description}</p>}
                            </div>
                            <CopyButton text={param.name} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {optionalParams.length > 0 && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setShowOptional(!showOptional)}
                        className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                      >
                        <svg
                          className={`h-3.5 w-3.5 transition-transform ${showOptional ? "rotate-180" : ""}`}
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m4 6 4 4 4-4" />
                        </svg>
                        Optional parameters ({optionalParams.length})
                      </button>
                      {showOptional && (
                        <div className="mt-3 space-y-3">
                          {optionalParams.map((param) => (
                            <div key={`${param.toolName}-${param.name}`} className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                              <code className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">{param.name}</code>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.625rem] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{param.type}</span>
                                  <span className="text-[0.625rem] font-medium text-zinc-400 dark:text-zinc-500">OPTIONAL</span>
                                </div>
                                {param.description && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{param.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── PERFORMANCE TAB ── */}
          <section id="performance" className="reveal scroll-mt-[128px]">
            <SectionHeading title="Performance" />
            <hr className="mt-3 border-zinc-200 dark:border-zinc-700" />
            <div className="mt-8">
              <PerformanceTab slug={mcp.slug} />
            </div>
          </section>

          {/* ── USAGE TAB ── */}
          <section id="usage" className="reveal scroll-mt-[128px]">
            <SectionHeading title="Usage" />
            <hr className="mt-3 border-zinc-200 dark:border-zinc-700" />
            <div className="mt-8">
              <UsageTab slug={mcp.slug} />
            </div>
          </section>

          {/* ── Quick Reference ── */}
          <section className="reveal rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
            <SectionHeading title="Quick Reference" />
            <hr className="mt-3 border-zinc-200 dark:border-zinc-700" />
            <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="font-semibold text-zinc-500 dark:text-zinc-400">Name</dt>
                <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{displayName}</dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-500 dark:text-zinc-400">Function</dt>
                <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{mcp.primaryFunction || mcp.description || "MCP server"}</dd>
              </div>
              {tools.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-zinc-500 dark:text-zinc-400">Available Tools</dt>
                  <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{tools.join(", ")}</dd>
                </div>
              )}
              {mcp.serverType && (
                <div>
                  <dt className="font-semibold text-zinc-500 dark:text-zinc-400">Transport</dt>
                  <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{mcp.serverType}</dd>
                </div>
              )}
              {mcp.language && (
                <div>
                  <dt className="font-semibold text-zinc-500 dark:text-zinc-400">Language</dt>
                  <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{mcp.language}</dd>
                </div>
              )}
              {mcp.installCommand && (
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-zinc-500 dark:text-zinc-400">Install</dt>
                  <dd className="mt-1 font-mono text-xs text-zinc-700 dark:text-zinc-300 break-all">{mcp.installCommand}</dd>
                </div>
              )}
              <div>
                <dt className="font-semibold text-zinc-500 dark:text-zinc-400">Source</dt>
                <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{sourceDisplay}</dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-500 dark:text-zinc-400">License</dt>
                <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{typeof mcp.openSource === "boolean" ? (mcp.openSource ? "Open Source" : "Commercial") : "Unknown"}</dd>
              </div>
            </dl>
          </section>

          {/* ── Tags ── */}
          {tagNames.length > 0 && (
            <section className="reveal">
              <div className="flex flex-wrap gap-2">
                {(mcp.tags || []).filter((t) => t.name || t.slug).map((tag) => (
                  <Link
                    key={tag.slug || tag.name}
                    href={`/aixcelerator/mcp?tag=${encodeURIComponent(tag.slug || tag.name || "")}`}
                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
                  >
                    {tag.name || tag.slug}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ════════════ RIGHT COLUMN: Persistent sidebar ════════════ */}
        <ConnectSidebar mcp={mcp} />
      </div>

      {/* ── CTA Band ── */}
      <div className="mt-14">
        <EnterpriseCtaBand
          kicker="Get started"
          title="Ready to integrate this MCP server?"
          description="Book a demo to see how this server fits your workflow, or explore the full catalog."
          primaryHref={mcp.tryItNowUrl || "/request-demo"}
          primaryLabel={mcp.tryItNowUrl ? "Try it now" : "Book a demo"}
          secondaryHref="/aixcelerator/mcp"
          secondaryLabel="View all MCP servers"
        />
      </div>

      {/* ── Related MCP Servers ── */}
      {relatedServers.length > 0 && (
        <section className="reveal mt-14">
          <SectionHeading title="Related MCP Servers" />
          <hr className="mt-3 border-zinc-200 dark:border-zinc-700" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedServers.map((related) => (
              <div key={related.slug || String(related.id)} className="card-elevated rounded-xl">
                <MCPCard mcp={related} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Floating Book a Demo button */}
      <a
        href={mcp.tryItNowUrl || "/request-demo"}
        className="fixed bottom-24 right-8 z-40 hidden lg:flex items-center gap-2 btn btn-cta shadow-lg"
      >
        {mcp.tryItNowUrl ? "Try it now" : "Book a demo"}
      </a>
    </Layout>
  );
}
