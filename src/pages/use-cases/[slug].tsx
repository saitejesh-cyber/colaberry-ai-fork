import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import EnterprisePageHero from "../../components/EnterprisePageHero";
import StatePanel from "../../components/StatePanel";
import { fetchUseCaseBySlug, UseCase } from "../../lib/cms";
import { heroImage } from "../../lib/media";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";

type UseCaseDetailProps = {
  useCase: UseCase;
  allowPrivate: boolean;
};

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<UseCaseDetailProps> = async ({ params }) => {
  const slug = String(params?.slug || "");
  if (!slug) {
    return { notFound: true, revalidate: 120 };
  }

  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";

  try {
    const useCase = await fetchUseCaseBySlug(slug);
    if (!useCase) {
      return { notFound: true, revalidate: 120 };
    }
    if (!allowPrivate && (useCase.visibility || "public").toLowerCase() === "private") {
      return { notFound: true, revalidate: 120 };
    }

    return {
      props: { useCase, allowPrivate },
      revalidate: 600,
    };
  } catch {
    return { notFound: true, revalidate: 120 };
  }
};

export default function UseCaseDetailPage({ useCase, allowPrivate }: UseCaseDetailProps) {
  const isPrivate = (useCase.visibility || "public").toLowerCase() === "private";
  const status = (useCase.status || "live").toLowerCase();
  const source = (useCase.source || "internal").toLowerCase();
  const sourceLabel =
    source === "external" ? "External" : source === "partner" ? "Partner" : "Internal";
  const sourceDisplay = useCase.sourceName ? `${sourceLabel} (${useCase.sourceName})` : sourceLabel;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const canonicalUrl = `${siteUrl}/use-cases/${useCase.slug}`;
  const metaTitle = `${useCase.title} | Use Cases | Colaberry AI`;
  const metaDescription =
    useCase.summary ||
    "Enterprise use case profile with problem framing, implementation approach, and outcome signals.";
  const seoMeta: SeoMeta = {
    title: metaTitle,
    description: metaDescription,
    canonical: buildCanonical(`/use-cases/${useCase.slug}`),
    ogType: "article",
    ogImage: useCase.coverImageUrl || null,
    ogImageAlt: useCase.coverImageAlt || useCase.title,
  };
  const keyBenefits = parseList(useCase.keyBenefits);
  const implementationSteps = parseList(useCase.implementationSteps);
  const requirements = parseList(useCase.requirements);
  const limitations = parseList(useCase.limitations);
  const lastUpdatedLabel = formatDate(useCase.lastUpdated);
  const hasOverview =
    Boolean(useCase.problem || useCase.approach || useCase.outcomes || useCase.metrics);
  const hasExecutionDetails =
    keyBenefits.length > 0 ||
    implementationSteps.length > 0 ||
    requirements.length > 0 ||
    limitations.length > 0;
  const hasRelations = useCase.agents.length > 0 || useCase.mcpServers.length > 0;
  const hasLinks = Boolean(useCase.docsUrl || useCase.demoUrl || useCase.sourceUrl);
  const visibilityModeNote = allowPrivate
    ? "Private preview mode enabled for this environment."
    : "Public-only mode in this environment.";
  const safeLongDescription = sanitizeRichText(useCase.longDescription);

  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: useCase.title,
    name: useCase.title,
    description: metaDescription,
    url: canonicalUrl,
    about: [useCase.industry, useCase.category].filter(Boolean),
    keywords: [...(useCase.tags || []).map((tag) => tag.name || tag.slug || "")].filter(Boolean),
    isAccessibleForFree: !isPrivate,
    ...(lastUpdatedLabel ? { dateModified: useCase.lastUpdated } : {}),
    publisher: {
      "@type": "Organization",
      name: "Colaberry AI",
      url: siteUrl,
    },
  };

  const jsonLdHowTo = implementationSteps.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: `How to implement: ${useCase.title}`,
        description: useCase.approach || metaDescription,
        url: canonicalUrl,
        step: implementationSteps.map((step, idx) => ({
          "@type": "HowToStep",
          position: idx + 1,
          text: step,
        })),
      }
    : null;

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }} />
        {jsonLdHowTo && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdHowTo) }} />
        )}
      </Head>

      <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400" aria-label="Breadcrumb">
        <Link href="/solutions" className="hover:text-zinc-700 dark:hover:text-zinc-200">
          Solutions
        </Link>
        <span>/</span>
        <Link href="/use-cases" className="hover:text-zinc-700 dark:hover:text-zinc-200">
          Use Cases
        </Link>
        <span>/</span>
        <span className="text-zinc-700 dark:text-zinc-200" aria-current="page">
          {useCase.title}
        </span>
      </nav>

      <div className="mt-4">
        <EnterprisePageHero
          kicker="Use case profile"
          title={useCase.title}
          description={metaDescription}
          image={heroImage("hero-solutions-cinematic.webp")}
          alt={`${useCase.title} use case preview`}
          imageKicker="Use case lane"
          imageTitle="Workflow orchestration context"
          imageDescription={`${useCase.industry || "General"}${useCase.category ? ` • ${useCase.category}` : ""} • ${
            status.charAt(0).toUpperCase() + status.slice(1)
          }`}
          chips={[
            useCase.industry || "General",
            ...(useCase.category ? [useCase.category] : []),
            status.charAt(0).toUpperCase() + status.slice(1),
            isPrivate ? "Private" : "Public",
            sourceDisplay,
            ...(useCase.verified ? ["Verified"] : []),
          ]}
          primaryAction={
            useCase.docsUrl
              ? { label: "Open docs", href: useCase.docsUrl, external: true }
              : useCase.demoUrl
              ? { label: "Open demo", href: useCase.demoUrl, external: true }
              : { label: "Back to use cases", href: "/use-cases" }
          }
          secondaryAction={{ label: "View solutions", href: "/solutions", variant: "secondary" }}
          metrics={[
            {
              label: "Last updated",
              value: lastUpdatedLabel || "Pending",
              note: "Latest metadata refresh.",
            },
            {
              label: "Linked assets",
              value: `${useCase.agents.length} agents • ${useCase.mcpServers.length} MCP`,
              note: "Catalog components in this workflow.",
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

      <section className="reveal section-spacing grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="grid gap-6">
          {!hasOverview && !safeLongDescription ? (
            <StatePanel
              variant="empty"
              title="Use case content is being populated"
              description="Add overview details in CMS to publish the full use case profile."
            />
          ) : (
            <>
              {safeLongDescription ? (
                <section className="surface-panel section-shell p-6">
                  <SectionHeader
                    as="h2"
                    size="md"
                    kicker="Narrative"
                    title="Long description"
                    description="Context and rationale for this deployment pattern."
                  />
                  <div
                    className="prose mt-6 max-w-none text-zinc-700 dark:text-zinc-200"
                    dangerouslySetInnerHTML={{ __html: safeLongDescription }}
                  />
                </section>
              ) : null}

              {hasOverview ? (
                <section className="surface-panel section-shell p-6">
                  <SectionHeader
                    as="h2"
                    size="md"
                    kicker="Operational overview"
                    title="Problem, approach, and outcomes"
                    description="How this use case is structured from intent through delivery."
                  />
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <InfoBlock title="Problem" body={useCase.problem} />
                    <InfoBlock title="Approach" body={useCase.approach} />
                    <InfoBlock title="Outcomes" body={useCase.outcomes} />
                    <InfoBlock title="Metrics" body={useCase.metrics} />
                    <InfoBlock title="Timeline" body={useCase.timeline} />
                  </div>
                </section>
              ) : null}

              {hasExecutionDetails ? (
                <section className="surface-panel section-shell p-6">
                  <SectionHeader
                    as="h2"
                    size="md"
                    kicker="Execution details"
                    title="Benefits, steps, and constraints"
                    description="Implementation guidance for teams adopting this pattern."
                  />
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <ListBlock title="Key benefits" items={keyBenefits} empty="Benefits not documented yet." />
                    <ListBlock
                      title="Implementation steps"
                      items={implementationSteps}
                      empty="Implementation steps not documented yet."
                    />
                    <ListBlock title="Requirements" items={requirements} empty="Requirements not documented yet." />
                    <ListBlock title="Limitations" items={limitations} empty="Limitations not documented yet." />
                  </div>
                </section>
              ) : null}
            </>
          )}

          {hasRelations ? (
            <section className="surface-panel section-shell p-6">
              <SectionHeader
                as="h2"
                size="md"
                kicker="Linked assets"
                title="Related agents and MCP servers"
                description="Connected catalog entries that implement this use case."
              />
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <RelationList
                  title="Agents"
                  empty="No linked agents yet."
                  links={useCase.agents.map((agent) => ({
                    href: `/aixcelerator/agents/${agent.slug}`,
                    label: agent.name || agent.slug,
                  }))}
                />
                <RelationList
                  title="MCP servers"
                  empty="No linked MCP servers yet."
                  links={useCase.mcpServers.map((server) => ({
                    href: `/aixcelerator/mcp/${server.slug}`,
                    label: server.name || server.slug,
                  }))}
                />
              </div>
            </section>
          ) : null}

          {hasLinks ? (
            <section className="surface-panel section-shell p-6">
              <SectionHeader
                as="h2"
                size="md"
                kicker="References"
                title="Docs and external links"
                description="Reference endpoints and source materials."
              />
              <div className="mt-6 flex flex-wrap gap-3">
                {useCase.docsUrl ? (
                  <a href={useCase.docsUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                    Open docs
                  </a>
                ) : null}
                {useCase.demoUrl ? (
                  <a href={useCase.demoUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                    Open demo
                  </a>
                ) : null}
                {useCase.sourceUrl ? (
                  <a href={useCase.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
                    Open source reference
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/use-cases" className="btn btn-secondary">
              Back to Use Cases
            </Link>
            <Link href="/solutions" className="btn btn-primary">
              View Solutions
            </Link>
          </div>
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
            <MetadataRow label="Title" value={useCase.title} />
            <MetadataRow label="Slug" value={useCase.slug} />
            <MetadataRow label="Industry" value={useCase.industry || "General"} />
            <MetadataRow label="Category" value={useCase.category || "Not provided"} />
            <MetadataRow label="Status" value={status.charAt(0).toUpperCase() + status.slice(1)} />
            <MetadataRow label="Visibility" value={isPrivate ? "Private" : "Public"} />
            <MetadataRow label="Source" value={sourceDisplay} />
            <MetadataRow label="Verified" value={useCase.verified ? "Yes" : "No"} />
            <MetadataRow label="Last updated" value={lastUpdatedLabel || "Not provided"} />
          </dl>

          {(useCase.tags || []).length > 0 && (
            <div className="mt-6 border-t border-zinc-200/60 pt-6 dark:border-zinc-700/60">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Tags
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(useCase.tags || []).map((tag) => (
                  <span key={tag.slug} className="chip chip-muted rounded-md px-2.5 py-1 text-xs font-semibold">
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
    </Layout>
  );
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function parseList(value?: string | null) {
  if (!value) return [];
  return value
    .split(/\r?\n|;/g)
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean);
}

function sanitizeRichText(value?: string | null) {
  if (!value) return "";
  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "ul",
      "ol",
      "li",
      "h2",
      "h3",
      "h4",
      "a",
      "blockquote",
      "code",
      "pre",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-section">
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}

function InfoBlock({ title, body }: { title: string; body?: string | null }) {
  return (
    <div className="detail-section">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{title}</div>
      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{body || "Not documented yet."}</p>
    </div>
  );
}

function ListBlock({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="detail-section">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{title}</div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#008EA8]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RelationList({
  title,
  links,
  empty,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
  empty: string;
}) {
  return (
    <div className="card-elevated p-5">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{title}</div>
      {links.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {links.map((item) => (
            <li key={`${item.href}|${item.label}`}>
              <Link
                href={item.href}
                className="text-sm font-semibold text-[#4F2AA3] hover:underline dark:text-[#7B5CE0] dark:hover:text-[#C4B3FF]"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
