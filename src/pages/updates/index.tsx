import Layout from "../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import SectionHeader from "../../components/SectionHeader";
import MediaPanel from "../../components/MediaPanel";

export default function Updates() {
  const updateHighlights = [
    {
      title: "Product releases",
      description: "Feature updates, changelogs, and release notes.",
    },
    {
      title: "Research drops",
      description: "New white papers, POVs, and technical assets.",
    },
    {
      title: "Ecosystem signals",
      description: "Curated headlines and market signals in one feed.",
    },
    {
      title: "Roadmap highlights",
      description: "What is shipping next across the platform layers.",
    },
  ];

  return (
    <Layout>
      <Head>
        <title>Updates | Colaberry AI</title>
      </Head>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
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
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {updateHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm"
              >
                <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                <div className="mt-1 text-xs text-slate-600">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
        <MediaPanel
          kicker="Signal feed"
          title="Updates and announcements"
          description="Product releases and ecosystem signals in one place."
          image="/media/hero/hero-updates.png"
          alt="City skyline highlighting update signals"
          aspect="wide"
          fit="cover"
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
          className="btn btn-secondary"
        >
          Explore resources
        </Link>
        <Link
          href="/aixcelerator"
          className="btn btn-primary"
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
