import Layout from "../../components/Layout";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";
import MediaPanel from "../../components/MediaPanel";

export default function WhitePapers() {
  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Resources"
            title="White papers"
            description="Technical deep-dives, POVs, and reference architectures."
          />
        </div>
        <MediaPanel
          kicker="Research"
          title="Reference architectures"
          description="Technical guidance with ready-to-use frameworks."
          image="/media/visuals/panel-books.svg"
          alt="Reference architecture illustration"
          aspect="wide"
          fit="contain"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:mt-8 lg:grid-cols-3">
        <Card title="Reference architectures" description="Platform patterns and enterprise rollout." />
        <Card title="Governance" description="Controls, auditability, and risk management." />
        <Card title="Industry playbooks" description="Domain-specific delivery frameworks." />
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/resources"
          className="btn btn-secondary"
        >
          Back to Resources
        </Link>
        <Link
          href="/updates"
          className="btn btn-primary"
        >
          View News & Product
        </Link>
      </div>
    </Layout>
  );
}

function Card({ title, description }: { title: string; description: string }) {
  return (
    <div className="surface-panel border-t-4 border-brand-blue/20 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{description}</div>
        </div>
        <span className="chip chip-muted rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
          Planned
        </span>
      </div>
    </div>
  );
}
