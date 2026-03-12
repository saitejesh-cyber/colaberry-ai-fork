import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import Layout from "../../../components/Layout";
import EnterprisePageHero from "../../../components/EnterprisePageHero";
import SectionHeader from "../../../components/SectionHeader";
import StatePanel from "../../../components/StatePanel";
import { fetchSkillBySlug, Skill } from "../../../lib/cms";

import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";

type SkillDetailProps = {
  skill: Skill;
  allowPrivate: boolean;
};

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [],
  fallback: "blocking",
});

export const getStaticProps: GetStaticProps<SkillDetailProps> = async ({ params }) => {
  const slug = String(params?.slug || "");
  if (!slug) {
    return { notFound: true, revalidate: 120 };
  }

  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";

  try {
    const skill = await fetchSkillBySlug(slug);
    if (!skill) {
      return { notFound: true, revalidate: 120 };
    }
    if (!allowPrivate && (skill.visibility || "public").toLowerCase() === "private") {
      return { notFound: true, revalidate: 120 };
    }

    return {
      props: { skill, allowPrivate },
      revalidate: 600,
    };
  } catch {
    return { notFound: true, revalidate: 120 };
  }
};

export default function SkillDetailPage({ skill }: SkillDetailProps) {
  const isPrivate = (skill.visibility || "public").toLowerCase() === "private";
  const status = (skill.status || "live").toLowerCase();
  const source = (skill.source || "internal").toLowerCase();
  const sourceLabel =
    source === "external" ? "External" : source === "partner" ? "Partner" : "Internal";
  const sourceDisplay = skill.sourceName ? `${sourceLabel} (${skill.sourceName})` : sourceLabel;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const canonicalUrl = `${siteUrl}/aixcelerator/skills/${skill.slug}`;
  const metaTitle = `${skill.name} | Skills | Colaberry AI`;
  const metaDescription =
    skill.summary ||
    "Reusable AI skill profile with inputs, outputs, prerequisites, and linked catalog assets.";
  const seoMeta: SeoMeta = {
    title: metaTitle,
    description: metaDescription,
    canonical: buildCanonical(`/aixcelerator/skills/${skill.slug}`),
    ogType: "article",
    ogImage: skill.coverImageUrl || null,
    ogImageAlt: skill.coverImageAlt || skill.name,
  };
  const keyBenefits = parseList(skill.keyBenefits);
  const requirements = parseList(skill.requirements);
  const limitations = parseList(skill.limitations);
  const workflowSteps = parseList(skill.exampleWorkflow);
  const inputs = parseList(skill.inputs);
  const outputs = parseList(skill.outputs);
  const prerequisites = parseList(skill.prerequisites);
  const tools = parseList(skill.toolsRequired);
  const models = parseList(skill.modelsSupported);
  const securityNotes = parseList(skill.securityNotes);
  const lastUpdatedLabel = formatDate(skill.lastUpdated);
  const safeLongDescription = sanitizeRichText(skill.longDescription);
  const hasNarrative = Boolean(safeLongDescription);
  const hasSpec =
    inputs.length > 0 ||
    outputs.length > 0 ||
    prerequisites.length > 0 ||
    tools.length > 0 ||
    models.length > 0 ||
    securityNotes.length > 0;
  const hasGuidance =
    keyBenefits.length > 0 ||
    requirements.length > 0 ||
    limitations.length > 0 ||
    workflowSteps.length > 0;
  const hasRelations =
    skill.agents.length > 0 || skill.mcpServers.length > 0 || skill.useCases.length > 0;
  const hasLinks = Boolean(skill.docsUrl || skill.demoUrl || skill.sourceUrl);
  const categoryLabel = skill.category || toSkillFamily(skill);
  const providerLabel = skill.provider || skill.sourceName || "Provider pending";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: skill.name,
    description: metaDescription,
    url: canonicalUrl,
    inDefinedTermSet: `${siteUrl}/aixcelerator/skills`,
    termCode: skill.slug,
    keywords: [
      categoryLabel,
      skill.skillType,
      skill.industry,
      ...(skill.tags || []).map((tag) => tag.name || tag.slug || ""),
    ].filter(Boolean),
  };

  const softwareAppLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: skill.name,
    description: metaDescription,
    applicationCategory: "AI Skill",
    url: canonicalUrl,
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }} />
      </Head>

      <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400" aria-label="Breadcrumb">
        <Link href="/aixcelerator" className="hover:text-zinc-700 dark:hover:text-zinc-200">
          AIXcelerator
        </Link>
        <span>/</span>
        <Link href="/aixcelerator/skills" className="hover:text-zinc-700 dark:hover:text-zinc-200">
          Skills
        </Link>
        <span>/</span>
        <span className="text-zinc-700 dark:text-zinc-200" aria-current="page">
          {skill.name}
        </span>
      </nav>

      <div className="mt-4">
        <EnterprisePageHero
          kicker="Skill profile"
          title={skill.name}
          description={metaDescription}
          chips={[
            categoryLabel,
            providerLabel,
            skill.industry || "General",
            status.charAt(0).toUpperCase() + status.slice(1),
            isPrivate ? "Private" : "Public",
            sourceDisplay,
            ...(skill.verified ? ["Verified"] : []),
          ]}
          primaryAction={
            skill.docsUrl
              ? { label: "View docs", href: skill.docsUrl, external: true }
              : { label: "Back to skills", href: "/aixcelerator/skills" }
          }
          secondaryAction={{ label: "View all skills", href: "/aixcelerator/skills", variant: "secondary" }}
          metrics={[
            {
              label: "Last updated",
              value: lastUpdatedLabel || "Pending",
              note: "Latest metadata refresh.",
            },
            {
              label: "Linked assets",
              value: `${skill.agents.length} agents · ${skill.mcpServers.length} MCP`,
              note: "Catalog components using this skill.",
            },
            {
              label: "Visibility",
              value: isPrivate ? "Private" : "Public",
              note: isPrivate ? "Restricted access." : "Available for catalog discovery.",
            },
          ]}
        />
      </div>

      <section className="reveal section-spacing grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="grid gap-6">
          {!hasNarrative && !hasSpec && !hasGuidance ? (
            <StatePanel
              variant="empty"
              title="Skill content is being populated"
              description="Add long-form and implementation fields in CMS to publish the full profile."
            />
          ) : (
            <>
              {hasNarrative ? (
                <section className="surface-panel section-shell p-6">
                  <SectionHeader
                    as="h2"
                    size="md"
                    kicker="Narrative"
                    title="Long description"
                    description="Deep context and intended usage pattern."
                  />
                  <div
                    className="prose mt-6 max-w-none text-zinc-700 dark:text-zinc-200"
                    dangerouslySetInnerHTML={{ __html: safeLongDescription }}
                  />
                </section>
              ) : null}

              {hasSpec ? (
                <section className="surface-panel section-shell p-6">
                  <SectionHeader
                    as="h2"
                    size="md"
                    kicker="Technical spec"
                    title="Inputs, outputs, and dependencies"
                    description="Core metadata required for agent and workflow integration."
                  />
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <ListBlock title="Inputs" items={inputs} empty="Inputs not documented yet." />
                    <ListBlock title="Outputs" items={outputs} empty="Outputs not documented yet." />
                    <ListBlock
                      title="Prerequisites"
                      items={prerequisites}
                      empty="Prerequisites not documented yet."
                    />
                    <ListBlock title="Tools required" items={tools} empty="Tools not documented yet." />
                    <ListBlock title="Models supported" items={models} empty="Models not documented yet." />
                    <ListBlock title="Security notes" items={securityNotes} empty="Security notes not documented yet." />
                  </div>
                </section>
              ) : null}

              {hasGuidance ? (
                <section className="surface-panel section-shell p-6">
                  <SectionHeader
                    as="h2"
                    size="md"
                    kicker="Implementation guidance"
                    title="Benefits, requirements, and constraints"
                    description="Operational readiness guidance before adoption."
                  />
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <ListBlock title="Key benefits" items={keyBenefits} empty="Benefits not documented yet." />
                    <ListBlock title="Requirements" items={requirements} empty="Requirements not documented yet." />
                    <ListBlock title="Limitations" items={limitations} empty="Limitations not documented yet." />
                    <ListBlock title="Example workflow" items={workflowSteps} empty="Workflow example not documented yet." />
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
                title="Related agents, MCP servers, and use cases"
                description="Where this skill is used in the broader platform graph."
              />
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <RelationList
                  title="Agents"
                  empty="No linked agents yet."
                  links={skill.agents.filter((agent) => Boolean(agent.slug)).map((agent) => ({
                    href: `/aixcelerator/agents/${agent.slug}`,
                    label: agent.name || agent.slug,
                  }))}
                />
                <RelationList
                  title="MCP servers"
                  empty="No linked MCP servers yet."
                  links={skill.mcpServers.filter((server) => Boolean(server.slug)).map((server) => ({
                    href: `/aixcelerator/mcp/${server.slug}`,
                    label: server.name || server.slug,
                  }))}
                />
                <RelationList
                  title="Use cases"
                  empty="No linked use cases yet."
                  links={skill.useCases.filter((useCase) => Boolean(useCase.slug)).map((useCase) => ({
                    href: `/use-cases/${useCase.slug}`,
                    label: useCase.name || useCase.slug,
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
                title="Docs and source links"
                description="External references for validation, source tracing, and demos."
              />
              <div className="mt-6 flex flex-wrap gap-3">
                {skill.docsUrl ? (
                  <a href={skill.docsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                    View docs
                  </a>
                ) : null}
                {skill.demoUrl ? (
                  <a href={skill.demoUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                    Open demo
                  </a>
                ) : null}
                {skill.sourceUrl ? (
                  <a href={skill.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
                    Source link
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}
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
            <MetadataRow label="Name" value={skill.name} />
            <MetadataRow label="Slug" value={skill.slug} />
            <MetadataRow label="Category" value={categoryLabel} />
            <MetadataRow label="Provider" value={providerLabel} />
            <MetadataRow label="Industry" value={skill.industry || "General"} />
            <MetadataRow label="Skill type" value={skill.skillType || "Not provided"} />
            <MetadataRow label="Status" value={status.charAt(0).toUpperCase() + status.slice(1)} />
            <MetadataRow label="Visibility" value={isPrivate ? "Private" : "Public"} />
            <MetadataRow label="Source" value={sourceDisplay} />
            <MetadataRow label="Verified" value={skill.verified ? "Yes" : "No"} />
            <MetadataRow label="Last updated" value={lastUpdatedLabel || "Not provided"} />
          </dl>

          {(skill.tags || []).length > 0 && (
            <>
              <div className="mt-6 border-t border-zinc-200/60 pt-6 dark:border-zinc-700/60">
                <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Tags
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(skill.tags || []).map((tag) => (
                    <span key={tag.slug} className="chip chip-muted rounded-md px-2.5 py-1 text-xs font-semibold">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </section>
    </Layout>
  );
}

function sanitizeRichText(value?: string | null) {
  if (!value) return "";
  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
      "h2",
      "h3",
      "h4",
      "code",
      "pre",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
  });
}

function parseList(value?: string | null) {
  if (!value) return [];
  return value
    .split(/\r?\n|;/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function toSkillFamily(skill: Skill) {
  const value = `${skill.category || ""} ${skill.skillType || ""}`.toLowerCase();
  if (value.includes("official") || value.includes("pre-built") || value.includes("prebuilt")) {
    return "Official pre-built skills";
  }
  if (value.includes("workflow") || value.includes("developer")) {
    return "Developer workflow skills";
  }
  if (value.includes("orchestration") || value.includes("dispatch") || value.includes("meta")) {
    return "Agent orchestration skills";
  }
  if (value.includes("domain") || value.includes("cloud") || value.includes("business")) {
    return "Specialized domain skills";
  }
  return "Specialized domain skills";
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-section">
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}

function ListBlock({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="detail-section">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{title}</div>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#008EA8]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{empty}</p>
      )}
    </div>
  );
}

function RelationList({
  title,
  empty,
  links,
}: {
  title: string;
  empty: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="card-elevated p-5">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{title}</div>
      {links.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {links.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <Link href={item.href} className="text-sm font-semibold text-brand-deep hover:underline dark:text-brand-purple-300 dark:hover:text-brand-purple-200">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
