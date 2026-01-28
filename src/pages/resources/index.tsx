import Layout from "../../components/Layout";
import Link from "next/link";

export default function Resources() {
  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-blue/25 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-deep shadow-sm">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-aqua" />
          Modular layer
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Resources
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A home for research, artifacts, and updates-built to support both internal publishing and
          curated external sources as we evolve.
        </p>
      </div>

      <div className="surface-panel mt-6 p-4 sm:mt-8">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Search resources
        </div>
        <label htmlFor="resource-search" className="sr-only">
          Search resources
        </label>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="resource-search"
            type="search"
            placeholder="Search podcasts, white papers, case studies..."
            className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
          />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-slate-800"
          >
            Search
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {["Podcasts", "White papers", "Case studies", "Updates", "Artifacts"].map((label) => (
            <span
              key={label}
              className="rounded-full border border-slate-200/80 bg-white px-3 py-1 font-semibold"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        <ResourceCard
          href="/resources/podcasts"
          title="Podcasts"
          description="Internal posts + curated external aggregation."
          meta="Internal + External"
        />
        <ResourceCard
          href="/resources/books"
          title="Books & artifacts"
          description="Books, companion assets, templates, and working artifacts."
          meta="Artifacts"
        />
        <ResourceCard
          href="/resources/case-studies"
          title="Case studies"
          description="Outcomes and delivery stories, organized by industry."
          meta="By industry"
        />
        <ResourceCard
          href="/resources/white-papers"
          title="White papers"
          description="Technical deep-dives, POVs, and best-practice guidance."
          meta="Research"
        />
        <ResourceCard
          href="/solutions"
          title="Solutions"
          description="Reusable solution patterns and packaged offerings."
          meta="Playbooks"
        />
        <ResourceCard
          href="/updates"
          title="News & product"
          description="A single feed for product updates, announcements, and relevant news."
          meta="Aggregator"
        />
      </div>

      <div className="surface-panel mt-10 p-6 sm:mt-12">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          How this evolves
        </div>
        <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
            <div className="font-semibold text-slate-900">Internal publishing</div>
            <div className="mt-1 text-slate-600">
              Structured posting for podcasts, books, white papers, and curated collections.
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
            <div className="font-semibold text-slate-900">External aggregation</div>
            <div className="mt-1 text-slate-600">
              Pull in relevant sources (feeds, links, announcements) with light editorial control.
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ResourceCard({
  href,
  title,
  description,
  meta,
}: {
  href: string;
  title: string;
  description: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="surface-panel surface-hover group p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{description}</div>
        </div>
        <div className="mt-0.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
          →
        </div>
      </div>
      <div className="mt-4 inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700">
        {meta}
      </div>
    </Link>
  );
}
