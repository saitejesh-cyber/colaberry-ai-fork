import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import sanitizeHtml from "sanitize-html";
import Layout from "../../../components/Layout";
import EnterprisePageHero from "../../../components/EnterprisePageHero";
import EnterpriseCtaBand from "../../../components/EnterpriseCtaBand";
import StickyTabBar, { type TabItem } from "../../../components/StickyTabBar";
import SectionHeading from "../../../components/mcp/SectionHeading";
import SpecCard from "../../../components/mcp/SpecCard";
import BulletList from "../../../components/mcp/BulletList";
import StatePanel from "../../../components/StatePanel";
import SkillCard from "../../../components/SkillCard";
import CollectionGraph from "../../../components/CollectionGraph";
import { fetchSkillBySlug, fetchRelatedSkills, Skill } from "../../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { classifySkill } from "../../../data/skill-taxonomy";
import { CATEGORY_COLORS, type GraphNode, type GraphLink } from "../../../lib/graphUtils";
import type { SkillRelationType } from "../../../data/skill-taxonomy";

/* -------------------------------------------------------------------------- */
/*  Data fetching                                                             */
/* -------------------------------------------------------------------------- */

type SkillDetailProps = { skill: Skill; allowPrivate: boolean; skillMdContent: string | null; relatedSkills: Skill[]; miniGraphNodes: GraphNode[]; miniGraphLinks: GraphLink[] };

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [],
  fallback: "blocking",
});

/**
 * Try to fetch the SKILL.md content from the skill's source repository.
 * Returns null if not available.
 */
async function fetchSkillMdFromSource(sourceUrl: string | undefined | null): Promise<string | null> {
  if (!sourceUrl) return null;
  try {
    // Extract GitHub owner/repo/path from sourceUrl
    const ghMatch = sourceUrl.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/[^/]+\/(.+))?/);
    if (!ghMatch) return null;
    const [, owner, repo, subPath] = ghMatch;
    const skillMdPath = subPath ? `${subPath}/SKILL.md` : "SKILL.md";
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${skillMdPath}`;
    const res = await fetch(rawUrl, {
      headers: { "User-Agent": "colaberry-ai/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 50 ? text : null; // skip trivially small files
  } catch {
    return null;
  }
}

export const getStaticProps: GetStaticProps<SkillDetailProps> = async ({ params }) => {
  const slug = String(params?.slug || "");
  if (!slug) return { notFound: true, revalidate: 120 };

  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";

  try {
    const skill = await fetchSkillBySlug(slug);
    if (!skill) return { notFound: true, revalidate: 120 };
    if (!allowPrivate && (skill.visibility || "public").toLowerCase() === "private")
      return { notFound: true, revalidate: 120 };

    // Fetch SKILL.md content from source repo if available
    const skillMdContent = await fetchSkillMdFromSource(skill.sourceUrl);

    let relatedSkills: Skill[] = [];
    try {
      const visibilityFilter = allowPrivate ? undefined : "public";
      relatedSkills = await fetchRelatedSkills(skill, { visibility: visibilityFilter, limit: 4 });
    } catch {
      relatedSkills = [];
    }

    // Build mini-graph: current skill + related skills
    const miniGraphNodes: GraphNode[] = [];
    const miniGraphLinks: GraphLink[] = [];

    const currentCat = classifySkill(skill);
    miniGraphNodes.push({
      id: skill.slug,
      name: skill.name,
      category: currentCat.slug,
      color: CATEGORY_COLORS[currentCat.slug] || "#a1a1aa",
      val: 3,
      tags: (skill.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean),
    });

    const linkSet = new Set<string>();
    const addMiniLink = (src: string, tgt: string, type: SkillRelationType) => {
      const key = [src, tgt].sort().join("|") + "|" + type;
      if (!linkSet.has(key)) { linkSet.add(key); miniGraphLinks.push({ source: src, target: tgt, type }); }
    };

    for (const related of relatedSkills) {
      const relCat = classifySkill(related);
      miniGraphNodes.push({
        id: related.slug,
        name: related.name,
        category: relCat.slug,
        color: CATEGORY_COLORS[relCat.slug] || "#a1a1aa",
        val: 1.5,
        tags: (related.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean),
      });

      // Determine relationship type
      const currentTags = new Set((skill.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean));
      const relatedTags = (related.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
      const sharedTags = relatedTags.filter((t) => currentTags.has(t)).length;

      if (relCat.slug === currentCat.slug) {
        addMiniLink(skill.slug, related.slug, "belong_to");
      }
      if (sharedTags >= 1) {
        addMiniLink(skill.slug, related.slug, "similar_to");
      }
    }

    return { props: { skill, allowPrivate, skillMdContent, relatedSkills, miniGraphNodes, miniGraphLinks }, revalidate: 600 };
  } catch {
    return { notFound: true, revalidate: 120 };
  }
};

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

export default function SkillDetailPage({ skill, skillMdContent, relatedSkills, miniGraphNodes, miniGraphLinks }: SkillDetailProps) {
  /* ---- derived data ---- */
  const isPrivate = (skill.visibility || "public").toLowerCase() === "private";
  const status = (skill.status || "live").toLowerCase();
  const source = (skill.source || "internal").toLowerCase();
  const sourceLabel =
    source === "external" ? "External" : source === "partner" ? "Partner" : "Internal";
  const sourceDisplay = skill.sourceName ? `${sourceLabel} (${skill.sourceName})` : sourceLabel;
  const categoryLabel = skill.category || toSkillFamily(skill);
  const providerLabel = skill.provider || skill.sourceName || "Provider pending";
  const lastUpdatedLabel = formatDate(skill.lastUpdated);

  /* ---- parsed lists ---- */
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
  const safeLongDescription = sanitizeRichText(skill.longDescription);

  /* ---- section flags ---- */
  const hasNarrative = Boolean(safeLongDescription);
  const hasSpec =
    inputs.length > 0 || outputs.length > 0 || prerequisites.length > 0 ||
    tools.length > 0 || models.length > 0 || securityNotes.length > 0;
  const hasGuidance =
    keyBenefits.length > 0 || requirements.length > 0 ||
    limitations.length > 0 || workflowSteps.length > 0;
  const hasRelations =
    skill.agents.length > 0 || skill.mcpServers.length > 0 || skill.useCases.length > 0;
  const hasLinks = Boolean(skill.docsUrl || skill.demoUrl || skill.sourceUrl);
  const hasOverview = hasNarrative || keyBenefits.length > 0 || limitations.length > 0;
  const hasContent = hasOverview || hasSpec || hasGuidance;
  const relationCount =
    (skill.agents?.length || 0) + (skill.mcpServers?.length || 0) + (skill.useCases?.length || 0);

  /* ---- SEO ---- */
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const canonicalUrl = `${siteUrl}/aixcelerator/skills/${skill.slug}`;
  const metaTitle = `${skill.name} | Skills | Colaberry AI`;
  const metaDescription =
    skill.summary || "Reusable AI skill profile with inputs, outputs, prerequisites, and linked catalog assets.";
  const seoMeta: SeoMeta = {
    title: metaTitle,
    description: metaDescription,
    canonical: buildCanonical(`/aixcelerator/skills/${skill.slug}`),
    ogType: "article",
    ogImage: skill.coverImageUrl || null,
    ogImageAlt: skill.coverImageAlt || skill.name,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: skill.name,
    description: metaDescription,
    url: canonicalUrl,
    inDefinedTermSet: `${siteUrl}/aixcelerator/skills`,
    termCode: skill.slug,
    keywords: [categoryLabel, skill.skillType, skill.industry, ...(skill.tags || []).map((t) => t.name || t.slug || "")].filter(Boolean),
  };

  const softwareAppLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: skill.name,
    description: metaDescription,
    applicationCategory: "AI Skill",
    url: canonicalUrl,
  };

  /* ---- SKILL.md ---- */
  const hasSkillMd = Boolean(skillMdContent);

  /* ---- tabs ---- */
  const tabs: TabItem[] = [
    { id: "overview", label: "Overview" },
    ...(hasSkillMd ? [{ id: "skill-md", label: "SKILL.md" }] : []),
    ...(hasSpec ? [{ id: "technical", label: "Technical" }] : []),
    ...(hasGuidance ? [{ id: "guidance", label: "Guidance" }] : []),
    ...(hasRelations ? [{ id: "linked-assets", label: "Linked Assets" }] : []),
    ...(hasLinks ? [{ id: "references", label: "References" }] : []),
    { id: "reviews", label: "Agent Reviews" },
  ];

  /* ---- render ---- */
  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }} />
      </Head>

      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400" aria-label="Breadcrumb">
        <Link href="/aixcelerator" className="hover:text-zinc-700 dark:hover:text-zinc-200">AIXcelerator</Link>
        <span>/</span>
        <Link href="/aixcelerator/skills" className="hover:text-zinc-700 dark:hover:text-zinc-200">Skills</Link>
        <span>/</span>
        <span className="text-zinc-700 dark:text-zinc-200" aria-current="page">{skill.name}</span>
      </nav>

      {/* Hero */}
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
            skill.sourceUrl
              ? { label: "Download skill", href: skill.sourceUrl, external: true }
              : skill.docsUrl
                ? { label: "View docs", href: skill.docsUrl, external: true }
                : { label: "Browse skills", href: "/aixcelerator/skills" }
          }
          secondaryAction={
            skill.docsUrl && skill.sourceUrl
              ? { label: "View docs", href: skill.docsUrl, variant: "secondary" }
              : { label: "View all skills", href: "/aixcelerator/skills", variant: "secondary" }
          }
          metrics={[
            { label: "Last updated", value: lastUpdatedLabel || "Pending", note: "Latest metadata refresh." },
            { label: "Linked assets", value: `${skill.agents.length} agents · ${skill.mcpServers.length} MCP`, note: "Catalog components using this skill." },
            { label: "Visibility", value: isPrivate ? "Private" : "Public", note: isPrivate ? "Restricted access." : "Available for catalog discovery." },
          ]}
        />
      </div>

      {/* Publisher attribution bar */}
      <div className="reveal mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          By <span className="font-semibold text-zinc-900 dark:text-zinc-100">{providerLabel}</span>
        </span>
        <span className="hidden sm:inline">·</span>
        <span>{categoryLabel}</span>
        <span className="hidden sm:inline">·</span>
        {lastUpdatedLabel && <span>Updated {lastUpdatedLabel}</span>}
        <span className="hidden sm:inline">·</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
          status === "live"
            ? "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700"
            : "bg-zinc-50 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700"
        }`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        {skill.verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M7.4 13.2 4.2 10l1.4-1.4 1.8 1.8 4.8-4.8 1.4 1.4-6.2 6.2Z" fill="currentColor" />
            </svg>
            Verified
          </span>
        )}
      </div>

      {/* Sticky tab navigation */}
      <StickyTabBar tabs={tabs} />

      {/* Two-column layout */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* LEFT COLUMN — main content */}
        <div className="space-y-14">
          {/* Overview tab */}
          <section id="overview" className="scroll-mt-28">
            <SectionHeading title="Overview" />

            {!hasContent ? (
              <div className="mt-6">
                <StatePanel
                  variant="empty"
                  title="Skill content is being populated"
                  description="Add long-form and implementation fields in CMS to publish the full profile."
                />
              </div>
            ) : (
              <div className="mt-6 space-y-8">
                {/* About / Long description */}
                {hasNarrative && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">About</h3>
                    <div
                      className="prose mt-4 max-w-none text-[0.9375rem] leading-relaxed text-zinc-700 dark:text-zinc-300"
                      dangerouslySetInnerHTML={{ __html: safeLongDescription }}
                    />
                  </div>
                )}

                {/* Key benefits */}
                {keyBenefits.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Key Benefits</h3>
                    <div className="mt-4">
                      <BulletList items={keyBenefits} />
                    </div>
                  </div>
                )}

                {/* Limitations */}
                {limitations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Limitations</h3>
                    <div className="mt-4">
                      <BulletList items={limitations} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Technical tab */}
          {hasSpec && (
            <section id="technical" className="scroll-mt-28">
              <SectionHeading title="Technical Specifications" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inputs.length > 0 && <SpecCard label="Inputs" value={inputs.join(", ")} />}
                {outputs.length > 0 && <SpecCard label="Outputs" value={outputs.join(", ")} />}
                {prerequisites.length > 0 && <SpecCard label="Prerequisites" value={prerequisites.join(", ")} />}
                {tools.length > 0 && <SpecCard label="Tools Required" value={tools.join(", ")} />}
                {models.length > 0 && <SpecCard label="Models Supported" value={models.join(", ")} />}
                {securityNotes.length > 0 && <SpecCard label="Security Notes" value={securityNotes.join(", ")} />}
              </div>
            </section>
          )}

          {/* Guidance tab */}
          {hasGuidance && (
            <section id="guidance" className="scroll-mt-28">
              <SectionHeading title="Implementation Guidance" />
              <div className="mt-6 space-y-8">
                {requirements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Requirements</h3>
                    <div className="mt-4">
                      <BulletList items={requirements} />
                    </div>
                  </div>
                )}

                {workflowSteps.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Example Workflow</h3>
                    <div className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {workflowSteps.map((step, i) => (
                        <p key={i}>{step}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Linked assets */}
          {hasRelations && (
            <section id="linked-assets" className="scroll-mt-28">
              <SectionHeading title="Linked Assets" />
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <RelationList
                  title="Agents"
                  empty="No linked agents yet."
                  links={skill.agents.filter((a) => Boolean(a.slug)).map((a) => ({
                    href: `/aixcelerator/agents/${a.slug}`,
                    label: a.name || a.slug,
                  }))}
                />
                <RelationList
                  title="MCP Servers"
                  empty="No linked MCP servers yet."
                  links={skill.mcpServers.filter((s) => Boolean(s.slug)).map((s) => ({
                    href: `/aixcelerator/mcp/${s.slug}`,
                    label: s.name || s.slug,
                  }))}
                />
                <RelationList
                  title="Use Cases"
                  empty="No linked use cases yet."
                  links={skill.useCases.filter((u) => Boolean(u.slug)).map((u) => ({
                    href: `/use-cases/${u.slug}`,
                    label: u.name || u.slug,
                  }))}
                />
              </div>
            </section>
          )}

          {/* References */}
          {hasLinks && (
            <section id="references" className="scroll-mt-28">
              <SectionHeading title="References" />
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {skill.docsUrl && (
                  <a href={skill.docsUrl} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600">
                    <svg className="h-5 w-5 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900 group-hover:text-[#DC2626] dark:text-zinc-100">Documentation</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">View docs</div>
                    </div>
                  </a>
                )}
                {skill.demoUrl && (
                  <a href={skill.demoUrl} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600">
                    <svg className="h-5 w-5 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900 group-hover:text-[#DC2626] dark:text-zinc-100">Demo</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">Try it live</div>
                    </div>
                  </a>
                )}
                {skill.sourceUrl && (
                  <a href={skill.sourceUrl} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600">
                    <svg className="h-5 w-5 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900 group-hover:text-[#DC2626] dark:text-zinc-100">Source Code</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">View repository</div>
                    </div>
                  </a>
                )}
              </div>
            </section>
          )}

          {/* SKILL.md section */}
          {hasSkillMd && (
            <section id="skill-md" className="scroll-mt-28">
              <SectionHeading title="SKILL.md" />
              <SkillMdViewer content={skillMdContent!} sourceUrl={skill.sourceUrl} />
            </section>
          )}

          {/* Reviews section */}
          <section id="reviews" className="scroll-mt-28">
            <SectionHeading title="Agent Reviews" />
            <ReviewsSection skillName={skill.name} skillSlug={skill.slug} sourceUrl={skill.sourceUrl} />
          </section>

          {/* Tags */}
          {(skill.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(skill.tags || []).map((tag) => (
                <span key={tag.slug} className="chip chip-neutral rounded-full px-3 py-1 text-xs font-semibold">
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — sidebar */}
        <aside className="lg:sticky lg:top-28">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700">
            {/* Quick reference */}
            <div className="p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Quick Reference</h3>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                <QR label="Category" value={categoryLabel} />
                <QR label="Provider" value={providerLabel} />
                <QR label="Industry" value={skill.industry || "General"} />
                <QR label="Status" value={status.charAt(0).toUpperCase() + status.slice(1)} />
                <QR label="Source" value={sourceDisplay} />
                <QR label="Verified" value={skill.verified ? "Yes" : "No"} />
                {skill.skillType && <QR label="Skill Type" value={skill.skillType} />}
                <QR label="Visibility" value={isPrivate ? "Private" : "Public"} />
              </dl>
            </div>

            {/* External links */}
            {hasLinks && (
              <div className="border-t border-zinc-200 p-6 dark:border-zinc-700">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">External Links</h3>
                <div className="mt-4 grid gap-2">
                  {skill.docsUrl && (
                    <a href={skill.docsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary justify-center text-sm">
                      View docs ↗
                    </a>
                  )}
                  {skill.demoUrl && (
                    <a href={skill.demoUrl} target="_blank" rel="noreferrer" className="btn btn-secondary justify-center text-sm">
                      Open demo ↗
                    </a>
                  )}
                  {skill.sourceUrl && (
                    <a href={skill.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-ghost justify-center text-sm">
                      Source code ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Linked assets summary */}
            <div className="border-t border-zinc-200 p-6 dark:border-zinc-700">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Linked Assets</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Agents</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{skill.agents.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">MCP Servers</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{skill.mcpServers.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Use Cases</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{skill.useCases.length}</span>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-200/60 pt-3 text-sm dark:border-zinc-700/60">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Total</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{relationCount}</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {(skill.tags || []).length > 0 && (
              <div className="border-t border-zinc-200 p-6 dark:border-zinc-700">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Tags</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(skill.tags || []).map((tag) => (
                    <span key={tag.slug} className="chip chip-neutral rounded-full px-2.5 py-1 text-xs font-semibold">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mini-graph: current skill + related skills */}
          {miniGraphNodes.length > 1 && (
            <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="p-4">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Skill Neighborhood
                </h3>
                <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                  Click a neighbor to explore
                </p>
              </div>
              <CollectionGraph
                nodes={miniGraphNodes}
                links={miniGraphLinks}
                height={250}
                showLabels
                highlightNodeId={skill.slug}
                onNodeClick={(nodeId) => {
                  if (nodeId !== skill.slug) {
                    window.location.href = `/aixcelerator/skills/${nodeId}`;
                  }
                }}
              />
            </div>
          )}
        </aside>
      </div>

      {/* Related skills */}
      {relatedSkills.length > 0 && (
        <section className="surface-panel section-shell mt-12 p-6">
          <SectionHeading title="Related Skills" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedSkills.map((related) => (
              <SkillCard key={related.id} skill={related} />
            ))}
          </div>
        </section>
      )}

      {/* CTA band */}
      <EnterpriseCtaBand
        kicker="Skills catalog"
        title="Discover more skills"
        description="Browse the full catalog of reusable AI skills for agents, workflows, and enterprise integrations."
        primaryHref="/aixcelerator/skills"
        primaryLabel="Browse all skills"
        secondaryHref="/aixcelerator"
        secondaryLabel="Explore the platform"
        className="mt-16"
      />
    </Layout>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helper components                                                         */
/* -------------------------------------------------------------------------- */

function QR({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}

function RelationList({ title, empty, links }: { title: string; empty: string; links: { href: string; label: string }[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-700">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{title}</div>
      {links.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {links.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <Link href={item.href} className="text-sm font-semibold text-zinc-700 hover:text-[#DC2626] dark:text-zinc-300 dark:hover:text-red-400">
                {item.label} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  SKILL.md Viewer                                                           */
/* -------------------------------------------------------------------------- */

function SkillMdViewer({ content, sourceUrl }: { content: string; sourceUrl?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 2000;
  const displayContent = isLong && !expanded ? content.slice(0, 2000) + "\n..." : content;

  return (
    <div className="mt-6">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            SKILL.md
          </div>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-zinc-500 hover:text-[#DC2626] dark:text-zinc-400 dark:hover:text-red-400"
            >
              View on GitHub
            </a>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {displayContent}
          </pre>
        </div>

        {/* Show more / less */}
        {isLong && (
          <div className="border-t border-zinc-200 px-5 py-3 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-medium text-[#DC2626] hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              {expanded ? "Show less" : "Show full SKILL.md"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Reviews Section                                                           */
/* -------------------------------------------------------------------------- */

function ReviewsSection({ skillName, skillSlug, sourceUrl }: { skillName: string; skillSlug: string; sourceUrl?: string | null }) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(`agent-vote-${skillSlug}`);
    return stored === "up" || stored === "down" ? stored : null;
  });

  const agentPrompt = `Review the skill "${skillName}" and share your assessment. Include what worked well, any issues encountered, and tips for other agents.\n\nSkill page: https://colaberry.ai/aixcelerator/skills/${skillSlug}${sourceUrl ? `\nSource: ${sourceUrl}` : ""}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(agentPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: select text */
    }
  };

  const handleVote = (direction: "up" | "down") => {
    const newVote = vote === direction ? null : direction;
    setVote(newVote);
    if (typeof window !== "undefined") {
      if (newVote) {
        localStorage.setItem(`agent-vote-${skillSlug}`, newVote);
      } else {
        localStorage.removeItem(`agent-vote-${skillSlug}`);
      }
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Agent review count heading */}
      <div className="flex items-center gap-2.5">
        <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">0 Agent Reviews</span>
      </div>

      {/* Agent prompt card */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Send this prompt to your agent to leave a review
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
          >
            {copied ? (
              <>
                <svg className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                </svg>
                Copy prompt
              </>
            )}
          </button>
        </div>
        <div className="mt-3 rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800/80">
          <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {agentPrompt}
          </p>
        </div>
      </div>

      {/* Vote section */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Was this skill helpful?</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleVote("up")}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              vote === "up"
                ? "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
            </svg>
            Upvote
          </button>
          <button
            type="button"
            onClick={() => handleVote("down")}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              vote === "down"
                ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400"
                : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715A12.137 12.137 0 0 1 2.25 12c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 0H4.372" />
            </svg>
            Downvote
          </button>
        </div>
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-600">
        <svg className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
        <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">No agent reviews yet</p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Be the first agent to review this skill.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Utility functions                                                         */
/* -------------------------------------------------------------------------- */

function sanitizeRichText(value?: string | null) {
  if (!value) return "";
  return sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "em", "ul", "ol", "li", "a", "blockquote", "h2", "h3", "h4", "code", "pre"],
    allowedAttributes: { a: ["href", "target", "rel"] },
  });
}

function parseList(value?: string | null) {
  if (!value) return [];
  return value.split(/\r?\n|;/).map((e) => e.trim()).filter(Boolean);
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function toSkillFamily(skill: Skill) {
  const value = `${skill.category || ""} ${skill.skillType || ""}`.toLowerCase();
  if (value.includes("official") || value.includes("pre-built") || value.includes("prebuilt")) return "Official pre-built skills";
  if (value.includes("workflow") || value.includes("developer")) return "Developer workflow skills";
  if (value.includes("orchestration") || value.includes("dispatch") || value.includes("meta")) return "Agent orchestration skills";
  return "Specialized domain skills";
}
