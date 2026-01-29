import Layout from "../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import SectionHeader from "../../components/SectionHeader";

export default function Updates() {
  return (
    <Layout>
      <Head>
        <title>Updates | Colaberry AI</title>
      </Head>
      <div className="flex flex-col gap-3">
        <div className="chip chip-brand inline-flex w-fit items-center gap-2 rounded-full border border-brand-blue/20 bg-white py-1 pl-2 pr-3 text-xs text-brand-deep">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-aqua" />
          Modular layer
        </div>
        <SectionHeader
          as="h1"
          size="xl"
          title="News & product"
          description="Announcements, product updates, and curated industry news-combined into a single signal feed."
        />
      </div>

      <div className="mt-6 grid gap-4 sm:mt-8 lg:grid-cols-3">
        <Panel title="Product updates" description="Release notes, roadmap highlights, and changelog.">
          <PlaceholderItem label="Changelog entries" />
          <PlaceholderItem label="Roadmap snapshots" />
          <PlaceholderItem label="Feature spotlights" />
        </Panel>

        <Panel title="In the news" description="Curated links from trusted sources.">
          <PlaceholderItem label="External links" />
          <PlaceholderItem label="Editorial picks" />
          <PlaceholderItem label="Industry signals" />
        </Panel>

        <Panel title="Research drops" description="New white papers and POVs as they publish.">
          <PlaceholderItem label="White papers" />
          <PlaceholderItem label="POVs" />
          <PlaceholderItem label="Reference architectures" />
        </Panel>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/resources"
          className="focus-ring inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-brand-ink hover:bg-slate-50"
        >
          Explore resources
        </Link>
        <Link
          href="/aixcelerator"
          className="inline-flex items-center justify-center rounded-full bg-slate-900 bg-gradient-to-r from-brand-blue to-brand-aqua px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-brand-deep hover:to-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
        >
          Explore AIXcelerator
        </Link>
      </div>
    </Layout>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-panel border-t-4 border-brand-blue/20 p-6">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{description}</div>
      <div className="mt-4 grid gap-2">{children}</div>
    </div>
  );
}

function PlaceholderItem({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2">
      <div className="text-sm text-slate-700">{label}</div>
      <span className="chip chip-muted rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
        Planned
      </span>
    </div>
  );
}
