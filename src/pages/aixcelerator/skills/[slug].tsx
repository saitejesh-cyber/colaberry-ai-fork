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
import { fetchSkillBySlug, Skill } from "../../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";

/* -------------------------------------------------------------------------- */
/*  Data fetching                                                             */
/* -------------------------------------------------------------------------- */

type SkillDetailProps = { skill: Skill; allowPrivate: boolean; skillMdContent: string | null };

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

    return { props: { skill, allowPrivate, skillMdContent }, revalidate: 600 };
  } catch {
    return { notFound: true, revalidate: 120 };
  }
};

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

export default function SkillDetailPage({ skill, skillMdContent }: SkillDetailProps) {
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
    { id: "reviews", label: "Reviews" },
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
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800"
            : "bg-zinc-50 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700"
        }`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        {skill.verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800">
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
            <SectionHeading title="Reviews" />
            <ReviewsSection skillName={skill.name} skillSlug={skill.slug} />
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
        </aside>
      </div>

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

function ReviewsSection({ skillName, skillSlug }: { skillName: string; skillSlug: string }) {
  return (
    <div className="mt-6 space-y-6">
      {/* Review prompt */}
      <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.2 48.2 0 0 0 5.887-.47c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Share your experience</h4>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Have you used <span className="font-medium text-zinc-700 dark:text-zinc-300">{skillName}</span>? Help others by sharing what worked well and any tips.
            </p>
            <div className="mt-4">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                Write a review
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-600">
        <svg className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
        <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">No reviews yet</p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Be the first to review this skill and help the community.
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
