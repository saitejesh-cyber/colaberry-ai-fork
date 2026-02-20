import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import Layout from "../../../components/Layout";
import SectionHeader from "../../../components/SectionHeader";
import StatePanel from "../../../components/StatePanel";
import { fetchSkillBySlug, Skill } from "../../../lib/cms";

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

export default function SkillDetailPage({ skill, allowPrivate }: SkillDetailProps) {
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
          Platform
        </Link>
        <span>/</span>
        <Link href="/aixcelerator/skills" className="hover:text-slate-700">
          Skills
        </Link>
        <span>/</span>
        <span className="text-slate-700" aria-current="page">
          {skill.name}
        </span>
      </nav>

      <div className="hero-surface mt-4 rounded-[32px] p-8 sm:p-10">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="Skill profile"
          title={skill.name}
          description={metaDescription}
        />
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="chip chip-brand rounded-full px-3 py-1 text-xs font-semibold">{categoryLabel}</span>
          <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">{providerLabel}</span>
          {skill.industry ? (
            <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
              {skill.industry}
            </span>
          ) : null}
          <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
            {isPrivate ? "Private" : "Public"}
          </span>
          <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
            {sourceDisplay}
          </span>
          {skill.verified ? (
            <span className="chip rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Verified
            </span>
          ) : null}
          {!allowPrivate && isPrivate ? (
            <span className="text-xs text-slate-500">Private listings hidden</span>
          ) : null}
        </div>
        {lastUpdatedLabel ? (
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Last updated {lastUpdatedLabel}
          </p>
        ) : null}
      </div>

      {!hasNarrative && !hasSpec && !hasGuidance ? (
        <div className="mt-6">
          <StatePanel
            variant="empty"
            title="Skill content is being populated"
            description="Add long-form and implementation fields in CMS to publish the full profile."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          {hasNarrative ? (
            <section className="surface-panel border border-slate-200/80 bg-white/90 p-6">
              <SectionHeader
                as="h2"
                size="md"
                kicker="Narrative"
                title="Long description"
                description="Deep context and intended usage pattern."
              />
              <div
                className="prose mt-4 max-w-none text-slate-700 dark:text-slate-200"
                dangerouslySetInnerHTML={{ __html: safeLongDescription }}
              />
            </section>
          ) : null}

          {hasSpec ? (
            <section className="surface-panel border border-slate-200/80 bg-white/90 p-6">
              <SectionHeader
                as="h2"
                size="md"
                kicker="Technical spec"
                title="Inputs, outputs, and dependencies"
                description="Core metadata required for agent and workflow integration."
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
            <section className="surface-panel border border-slate-200/80 bg-white/90 p-6">
              <SectionHeader
                as="h2"
                size="md"
                kicker="Implementation guidance"
                title="Benefits, requirements, and constraints"
                description="Operational readiness guidance before adoption."
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ListBlock title="Key benefits" items={keyBenefits} empty="Benefits not documented yet." />
                <ListBlock title="Requirements" items={requirements} empty="Requirements not documented yet." />
                <ListBlock title="Limitations" items={limitations} empty="Limitations not documented yet." />
                <ListBlock title="Example workflow" items={workflowSteps} empty="Workflow example not documented yet." />
              </div>
            </section>
          ) : null}
        </div>
      )}

      {hasRelations ? (
        <section className="surface-panel mt-6 border border-slate-200/80 bg-white/90 p-6">
          <SectionHeader
            as="h2"
            size="md"
            kicker="Linked assets"
            title="Related agents, MCP servers, and use cases"
            description="Where this skill is used in the broader platform graph."
          />
          <div className="mt-4 grid gap-5 lg:grid-cols-3">
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
        <section className="surface-panel mt-6 border border-slate-200/80 bg-white/90 p-6">
          <SectionHeader
            as="h2"
            size="md"
            kicker="References"
            title="Docs and source links"
            description="External references for validation, source tracing, and demos."
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {skill.docsUrl ? (
              <a href={skill.docsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                View docs
              </a>
            ) : null}
            {skill.demoUrl ? (
              <a href={skill.demoUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                Open demo
              </a>
            ) : null}
            {skill.sourceUrl ? (
              <a href={skill.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                Source link
              </a>
            ) : null}
          </div>
        </section>
      ) : null}
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
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</div>
      {items.length ? (
        <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-blue" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
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
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</div>
      {links.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {links.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <Link href={item.href} className="text-sm font-semibold text-brand-blue hover:text-brand-deep">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
