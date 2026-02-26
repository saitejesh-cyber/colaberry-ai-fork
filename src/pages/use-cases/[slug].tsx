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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: useCase.title,
    description: metaDescription,
    url: canonicalUrl,
    about: [useCase.industry, useCase.category].filter(Boolean),
    keywords: [...(useCase.tags || []).map((tag) => tag.name || tag.slug || "")].filter(Boolean),
    isAccessibleForFree: !isPrivate,
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
        <Link href="/solutions" className="hover:text-slate-700">
          Solutions
        </Link>
        <span>/</span>
        <Link href="/use-cases" className="hover:text-slate-700">
          Use Cases
        </Link>
        <span>/</span>
        <span className="text-slate-700" aria-current="page">
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

      {!hasOverview && !safeLongDescription ? (
        <div className="section-spacing">
          <StatePanel
            variant="empty"
            title="Use case content is being populated"
            description="Add overview details in CMS to publish the full use case profile."
          />
        </div>
      ) : (
        <div className="section-spacing grid gap-6">
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
                className="prose mt-4 max-w-none text-slate-700 dark:text-slate-200"
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
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
        </div>
      )}

      {hasRelations ? (
        <section className="surface-panel section-shell section-spacing p-6">
          <SectionHeader
            as="h2"
            size="md"
            kicker="Linked assets"
            title="Related agents and MCP servers"
            description="Connected catalog entries that implement this use case."
          />
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
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
        <section className="surface-panel section-shell section-spacing p-6">
          <SectionHeader
            as="h2"
            size="md"
            kicker="References"
            title="Docs and external links"
            description="Reference endpoints and source materials."
          />
          <div className="mt-4 flex flex-wrap gap-3">
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

      <div className="section-spacing flex flex-col gap-3 sm:flex-row">
        <Link href="/use-cases" className="btn btn-secondary">
          Back to Use Cases
        </Link>
        <Link href="/solutions" className="btn btn-primary">
          View Solutions
        </Link>
      </div>
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

function InfoBlock({ title, body }: { title: string; body?: string | null }) {
  return (
    <div className="section-card rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body || "Not documented yet."}</p>
    </div>
  );
}

function ListBlock({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="section-card rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-slate-600">{empty}</p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          {items.map((item) => (
            <li key={item}>{item}</li>
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
    <div className="section-card rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {links.length === 0 ? (
        <p className="mt-1 text-sm text-slate-600">{empty}</p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {links.map((item) => (
            <Link
              key={`${item.href}|${item.label}`}
              href={item.href}
              className="text-sm font-medium text-brand-deep hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
