import Layout from "../../components/Layout";
import Link from "next/link";
import EnterprisePageHero from "../../components/EnterprisePageHero";
import { heroImage } from "../../lib/media";

export default function WhitePapers() {
  return (
    <Layout>
      <EnterprisePageHero
        kicker="Resources"
        title="White papers"
        description="Technical deep-dives, POVs, and reference architectures for enterprise teams deploying AI at scale."
        image={heroImage("hero-whitepapers-cinematic.webp")}
        alt="Enterprise research and architecture review surface"
        imageKicker="Research"
        imageTitle="Reference architectures"
        imageDescription="Technical guidance with reusable frameworks and governance patterns."
        chips={["Architecture", "Governance", "Playbooks", "POVs"]}
        primaryAction={{ label: "Open updates feed", href: "/updates" }}
        secondaryAction={{ label: "Back to resources", href: "/resources", variant: "secondary" }}
        metrics={[
          {
            label: "Focus",
            value: "Technical depth",
            note: "Implementation-ready guidance.",
          },
          {
            label: "Coverage",
            value: "Architecture + governance",
            note: "From system design to controls.",
          },
          {
            label: "Audience",
            value: "Engineering + leadership",
            note: "Built for cross-functional adoption.",
          },
        ]}
      />

      <div className="section-spacing grid gap-4 lg:grid-cols-3">
        <Card title="Reference architectures" description="Platform patterns and enterprise rollout." />
        <Card title="Governance" description="Controls, auditability, and risk management." />
        <Card title="Industry playbooks" description="Domain-specific delivery frameworks." />
      </div>

      <div className="section-spacing flex flex-col gap-3 sm:flex-row">
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
    <div className="surface-panel section-shell p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{description}</div>
        </div>
        <span className="chip chip-muted rounded-full px-2.5 py-1 text-xs font-semibold">
          Planned
        </span>
      </div>
    </div>
  );
}
