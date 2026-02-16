import Layout from "../../components/Layout";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";
import MediaPanel from "../../components/MediaPanel";
import { heroImage } from "../../lib/media";

export default function CaseStudiesHub() {
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

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Resources"
            title="Case studies"
            description="Browse delivery outcomes by industry. Each industry page contains detailed case studies."
          />
        </div>
        <MediaPanel
          kicker="Impact library"
          title="Outcome snapshots"
          description="Cross-industry delivery proof points."
          image={heroImage("hero-case-studies-premium-v2.svg")}
          alt="Enterprise case study outcomes and performance insights"
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
            aria-label={`View ${item.name} case studies`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                <div className="mt-1 text-sm text-slate-600">View case studies and outcomes.</div>
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
          href="/resources"
          className="btn btn-secondary"
        >
          Back to Resources
        </Link>
        <Link
          href="/industries"
          className="btn btn-primary"
        >
          View Industries
        </Link>
      </div>
    </Layout>
  );
}
