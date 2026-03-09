import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import Head from "next/head";
import Layout from "../../../components/Layout";
import EnterprisePageHero from "../../../components/EnterprisePageHero";
import EnterpriseCtaBand from "../../../components/EnterpriseCtaBand";
import MCPCard from "../../../components/MCPCard";
import {
  fetchToolBySlug,
  fetchMCPServerBySlug,
  type Tool,
  type MCPServer,
  type Company,
} from "../../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";

type ToolDetailProps = {
  tool: Tool;
  mcpServers: MCPServer[];
  platforms: Company[];
};

export const getStaticPaths: GetStaticPaths = async () => {
  return { paths: [], fallback: "blocking" };
};

export const getStaticProps: GetStaticProps<ToolDetailProps> = async ({ params }) => {
  const slug = String(params?.slug || "");

  try {
    const tool = await fetchToolBySlug(slug);
    if (!tool) {
      return { notFound: true, revalidate: 120 };
    }

    // Fetch full details for each linked MCP server
    const mcpServers: MCPServer[] = [];
    const platformMap = new Map<string, Company>();

    for (const ref of (tool.mcpServers || []).slice(0, 30)) {
      try {
        const mcp = await fetchMCPServerBySlug(ref.slug);
        if (mcp) {
          mcpServers.push(mcp);
          // Collect platform companies
          for (const company of mcp.companies || []) {
            if (company.companyType === "platform" && company.slug && !platformMap.has(company.slug)) {
              platformMap.set(company.slug, company);
            }
          }
        }
      } catch {
        // Skip MCP servers that fail to fetch
      }
    }

    const platforms = Array.from(platformMap.values());

    return {
      props: { tool, mcpServers, platforms },
      revalidate: 600,
    };
  } catch {
    return { notFound: true, revalidate: 120 };
  }
};

function formatCategory(cat?: string | null): string {
  if (!cat) return "Other";
  return cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="border-l-4 border-[#DC2626] pl-4 text-xl font-bold text-zinc-900 dark:border-red-400 dark:text-zinc-100">
      {title}
    </h2>
  );
}

export default function ToolDetail({ tool, mcpServers, platforms }: ToolDetailProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const canonicalUrl = buildCanonical(`/aixcelerator/tools/${tool.slug}`);
  const metaDescription = tool.description || `${tool.name} — end tool connected via MCP servers on Colaberry AI.`;
  const category = formatCategory(tool.toolCategory);

  const seoMeta: SeoMeta = {
    title: `${tool.name} | Tools | Colaberry AI`,
    description: metaDescription,
    canonical: canonicalUrl,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: metaDescription,
    applicationCategory: "Tool",
    applicationSubCategory: tool.toolCategory || undefined,
    operatingSystem: "Web",
    url: canonicalUrl,
    publisher: { "@type": "Organization", name: "Colaberry AI", url: siteUrl },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Category", value: category },
      { "@type": "PropertyValue", name: "MCP Servers", value: String(mcpServers.length) },
      ...mcpServers.map((mcp) => ({
        "@type": "PropertyValue" as const,
        name: "Connected MCP Server",
        value: mcp.name,
      })),
      ...platforms.map((p) => ({
        "@type": "PropertyValue" as const,
        name: "Available Platform",
        value: p.name,
      })),
    ],
  };

  const heroChips: string[] = [category];
  if (mcpServers.length > 0) heroChips.push(`${mcpServers.length} MCP server${mcpServers.length !== 1 ? "s" : ""}`);

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
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/aixcelerator" className="hover:text-zinc-900 dark:hover:text-zinc-100">AIXcelerator</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/aixcelerator/tools" className="hover:text-zinc-900 dark:hover:text-zinc-100">Tools</Link></li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[280px]">{tool.name}</li>
        </ol>
      </nav>

      {/* Hero */}
      <EnterprisePageHero
        kicker="Tool profile"
        title={tool.name}
        description={tool.description || `End tool connected via MCP servers.`}
        chips={heroChips}
      />

      <div className="mt-12 flex flex-col gap-12 max-w-4xl">

        {/* About */}
        {(tool.longDescription || tool.description) && (
          <section className="reveal">
            <SectionHeading title={`About ${tool.name}`} />
            <hr className="mt-3 border-zinc-200 dark:border-zinc-700" />
            <div className="mt-6 prose prose-zinc dark:prose-invert max-w-none text-[0.9375rem] leading-relaxed">
              {tool.longDescription ? (
                <div dangerouslySetInnerHTML={{ __html: tool.longDescription }} />
              ) : (
                <p className="text-zinc-600 dark:text-zinc-300">{tool.description}</p>
              )}
            </div>
          </section>
        )}

        {/* Website */}
        {tool.website && (
          <section className="reveal">
            <SectionHeading title="Resources" />
            <hr className="mt-3 border-zinc-200 dark:border-zinc-700" />
            <div className="mt-6">
              <a
                href={tool.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
              >
                Visit {tool.name} website
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3h7v7M13 3 6 10" />
                </svg>
              </a>
            </div>
          </section>
        )}

        {/* Available MCP Servers */}
        {mcpServers.length > 0 && (
          <section className="reveal">
            <SectionHeading title="Available MCP Servers" />
            <hr className="mt-3 border-zinc-200 dark:border-zinc-700" />
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              {mcpServers.length} MCP server{mcpServers.length !== 1 ? "s" : ""} provide connectivity to {tool.name}.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mcpServers.map((mcp) => (
                <MCPCard key={mcp.slug || String(mcp.id)} mcp={mcp} />
              ))}
            </div>
          </section>
        )}

        {/* Available Platforms */}
        {platforms.length > 0 && (
          <section className="reveal">
            <SectionHeading title="Available Platforms" />
            <hr className="mt-3 border-zinc-200 dark:border-zinc-700" />
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              Connect to {tool.name} via these MCP hosting platforms.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {platforms.map((platform) => (
                <div
                  key={platform.slug}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{platform.name}</p>
                    {platform.website && (
                      <a
                        href={platform.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        {platform.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Reference */}
        <section className="reveal rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <SectionHeading title="Quick Reference" />
          <hr className="mt-3 border-zinc-200 dark:border-zinc-700" />
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="font-semibold text-zinc-500 dark:text-zinc-400">Name</dt>
              <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{tool.name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-zinc-500 dark:text-zinc-400">Category</dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{category}</dd>
            </div>
            <div>
              <dt className="font-semibold text-zinc-500 dark:text-zinc-400">MCP Servers</dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{mcpServers.length}</dd>
            </div>
            {platforms.length > 0 && (
              <div>
                <dt className="font-semibold text-zinc-500 dark:text-zinc-400">Platforms</dt>
                <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{platforms.map((p) => p.name).join(", ")}</dd>
              </div>
            )}
            {tool.website && (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-zinc-500 dark:text-zinc-400">Website</dt>
                <dd className="mt-1 font-mono text-xs text-zinc-700 dark:text-zinc-300 break-all">{tool.website}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <EnterpriseCtaBand
        kicker="Get started"
        title={`Ready to connect to ${tool.name}?`}
        description="Book a demo to see how MCP servers connect to this tool, or explore the full catalog."
        primaryHref="/request-demo"
        primaryLabel="Book a demo"
        secondaryHref="/aixcelerator/tools"
        secondaryLabel="View all tools"
      />
    </Layout>
  );
}
