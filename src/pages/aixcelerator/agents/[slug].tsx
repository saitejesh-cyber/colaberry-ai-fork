import type { GetServerSideProps } from "next";
import Link from "next/link";
import Head from "next/head";
import Layout from "../../../components/Layout";
import SectionHeader from "../../../components/SectionHeader";
import { Agent, fetchAgentBySlug } from "../../../lib/cms";

type AgentDetailProps = {
  agent: Agent;
  allowPrivate: boolean;
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
    return { props: { agent, allowPrivate } };
  } catch {
    return { notFound: true };
  }
};

export default function AgentDetail({ agent, allowPrivate }: AgentDetailProps) {
  const isPrivate = (agent.visibility || "public").toLowerCase() === "private";
  const status = agent.status || "Unknown";
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
      </div>

      <section className="surface-panel mt-6 p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="LLM metadata"
          title="Structured profile"
          description="Structured metadata optimized for LLM retrieval and catalog indexing."
        />
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <MetadataRow label="Name" value={agent.name} />
          <MetadataRow label="Slug" value={agent.slug || "Not provided"} />
          <MetadataRow label="Industry" value={agent.industry || "General"} />
          <MetadataRow label="Status" value={status} />
          <MetadataRow label="Visibility" value={isPrivate ? "Private" : "Public"} />
          <MetadataRow label="Source" value={sourceDisplay} />
          <MetadataRow label="Verified" value={agent.verified ? "Yes" : "No"} />
          <MetadataRow label="Tags" value={formatList(agent.tags)} />
          <MetadataRow label="Companies" value={formatList(agent.companies)} />
          <MetadataRow
            label="Source URL"
            value={agent.sourceUrl || "Not linked yet"}
            href={agent.sourceUrl || undefined}
          />
        </dl>
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
