import Layout from "../../components/Layout";
import Link from "next/link";
import EnterprisePageHero from "../../components/EnterprisePageHero";
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
      <EnterprisePageHero
        kicker="Resources"
        title="Case studies"
        description="Browse delivery outcomes by industry. Each industry page contains detailed case studies and impact context."
        image={heroImage("hero-case-studies-cinematic.webp")}
        alt="Enterprise case study outcomes and performance insights"
        imageKicker="Impact library"
        imageTitle="Outcome snapshots"
        imageDescription="Cross-industry delivery proof points and implementation context."
        chips={["Outcomes", "Industry distribution", "Delivery proof", "Impact context"]}
        primaryAction={{ label: "View industries", href: "/industries" }}
        secondaryAction={{ label: "Back to resources", href: "/resources", variant: "secondary" }}
        metrics={[
          {
            label: "Industry tracks",
            value: String(industries.length),
            note: "Current case-study groupings.",
          },
          {
            label: "Coverage model",
            value: "Cross-domain",
            note: "Mapped to enterprise verticals.",
          },
          {
            label: "Focus",
            value: "Outcomes",
            note: "Measured impact over feature lists.",
          },
        ]}
      />

      <div className="section-spacing grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((item) => (
          <Link
            key={item.slug}
            href={`/industries/${item.slug}`}
            className="surface-panel section-card surface-hover surface-interactive group p-5"
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

      <div className="section-spacing flex flex-col gap-3 sm:flex-row">
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
