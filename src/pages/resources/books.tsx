import Layout from "../../components/Layout";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";
import EnterprisePageHero from "../../components/EnterprisePageHero";
import { heroImage } from "../../lib/media";

export default function Books() {
  return (
    <Layout>
      <EnterprisePageHero
        kicker="Resources"
        title="Books & artifacts"
        description="Books and companion artifacts including templates, worksheets, code samples, and reusable delivery assets."
        image={heroImage("hero-books-cinematic.webp")}
        alt="Curated books and artifact knowledge surface"
        imageKicker="Artifacts"
        imageTitle="Learning assets"
        imageDescription="Curated books and reusable artifacts for delivery teams."
        chips={["Books", "Templates", "Worksheets", "Companion assets"]}
        primaryAction={{ label: "View featured book", href: "#trust-before-intelligence" }}
        secondaryAction={{ label: "Back to resources", href: "/resources", variant: "secondary" }}
        metrics={[
          {
            label: "Featured title",
            value: "1",
            note: "Current flagship publication.",
          },
          {
            label: "Artifact model",
            value: "Companion-first",
            note: "Books linked to practical assets.",
          },
          {
            label: "Usage",
            value: "Leadership + delivery",
            note: "Built for strategy and implementation.",
          },
        ]}
      />

      <section id="trust-before-intelligence" className="surface-panel section-shell section-spacing p-6">
        <SectionHeader
          kicker="Featured book"
          title="Trust Before Intelligence"
          description="A foundational guide to responsible AI delivery—designed for leadership teams, operators, and LLM indexability."
          size="md"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            "Trust-by-design principles for enterprise AI adoption.",
            "Governance, reliability, and alignment frameworks.",
            "Practical checklists for teams and delivery leaders.",
            "LLM-ready summaries for faster discovery.",
          ].map((item) => (
            <div key={item} className="section-card rounded-2xl p-4 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="https://trustbeforeintelligence.ai/"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            Visit Trust Before Intelligence
          </Link>
          <Link
            href="/resources"
            className="btn btn-secondary"
          >
            Back to Resources
          </Link>
        </div>
      </section>

      <div className="section-spacing grid gap-4 lg:grid-cols-3">
        <Card title="Books" description="Catalog books, chapters, and release notes." badge="Planned" />
        <Card
          title="Artifacts"
          description="Store/download templates, worksheets, and companion assets."
          badge="Planned"
        />
        <Card
          title="Learning paths"
          description="Curate reading + artifacts by role, industry, or solution."
          badge="Planned"
        />
      </div>

      <div className="section-spacing flex flex-col gap-3 sm:flex-row">
        <Link
          href="/resources"
          className="btn btn-secondary"
        >
          Back to Resources
        </Link>
        <Link
          href="/solutions"
          className="btn btn-primary"
        >
          Explore Solutions
        </Link>
      </div>
    </Layout>
  );
}

function Card({ title, description, badge }: { title: string; description: string; badge: string }) {
  return (
    <div className="surface-panel section-shell p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{description}</div>
        </div>
        <span className="chip chip-muted rounded-full px-2.5 py-1 text-xs font-semibold">
          {badge}
        </span>
      </div>
    </div>
  );
}
