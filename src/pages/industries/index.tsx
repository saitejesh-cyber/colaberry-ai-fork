import Layout from "../../components/Layout";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";
import MediaPanel from "../../components/MediaPanel";
import { heroImage } from "../../lib/media";

export default function IndustriesIndex() {
  const industries = [
    { name: "Agriculture", slug: "agriculture" },
    { name: "Energy", slug: "energy" },
    { name: "Utilities", slug: "utilities" },
    { name: "Healthcare & Life Sciences", slug: "healthcare-life-sciences" },
    { name: "Climate Tech", slug: "climate-tech" },
    { name: "Manufacturing", slug: "manufacturing" },
    { name: "Fintech", slug: "fintech" },
    { name: "Supply Chain", slug: "supply-chain" },
  ];
  const industryHighlights = [
    {
      title: "Outcome stories",
      description: "Case studies with measurable outcomes and delivery context.",
    },
    {
      title: "Workspace templates",
      description: "Repeatable industry-aligned playbooks and signal feeds.",
    },
    {
      title: "Domain signals",
      description: "Key data sources, workflows, and AI surfaces per industry.",
    },
    {
      title: "Governed delivery",
      description: "Ownership, approvals, and evaluation-ready metadata.",
    },
  ];

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Industry expertise"
            title="Industries"
            description="Domain-led delivery. Explore industry pages with aligned solutions, case studies, and AI workspaces."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {industryHighlights.map((item) => (
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
          kicker="Industry coverage"
          title="Service line coverage map"
          description="A quick view of industry-aligned AI service lines."
          image={heroImage("hero-industries.png")}
          alt="Industry landscape overview"
          aspect="wide"
          fit="cover"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((item) => (
          <Link
            key={item.slug}
            href={`/industries/${item.slug}`}
            className="surface-panel surface-hover surface-interactive group border border-slate-200/80 bg-white/90 p-5"
            aria-label={`View ${item.name} industry`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                <div className="mt-1 text-sm text-slate-600">Case studies, outcomes, and context.</div>
              </div>
              <div className="mt-0.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
                <span aria-hidden="true">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/resources/case-studies"
          className="btn btn-secondary"
        >
          Browse case studies
        </Link>
        <Link
          href="/solutions"
          className="btn btn-primary"
        >
          Explore solutions
        </Link>
      </div>
    </Layout>
  );
}
