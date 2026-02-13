import Layout from "../../components/Layout";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";
import MediaPanel from "../../components/MediaPanel";
import PremiumMediaCard from "../../components/PremiumMediaCard";
import { heroImage } from "../../lib/media";

export default function IndustriesIndex() {
  const industries = [
    { name: "Agriculture", slug: "agriculture", image: heroImage("hero-agents.png") },
    { name: "Energy", slug: "energy", image: heroImage("hero-updates.png") },
    { name: "Utilities", slug: "utilities", image: heroImage("hero-platform.png") },
    { name: "Healthcare & Life Sciences", slug: "healthcare-life-sciences", image: heroImage("hero-resources.png") },
    { name: "Climate Tech", slug: "climate-tech", image: heroImage("hero-industries.png") },
    { name: "Manufacturing", slug: "manufacturing", image: heroImage("hero-solutions.png") },
    { name: "Fintech", slug: "fintech", image: heroImage("hero-mcp.png") },
    { name: "Supply Chain", slug: "supply-chain", image: heroImage("hero-platform.png") },
  ];
  const industryHighlights = [
    {
      href: "/resources/case-studies",
      title: "Outcome stories",
      description: "Case studies with measurable outcomes and delivery context.",
      meta: "Outcomes",
      image: heroImage("hero-solutions.png"),
    },
    {
      href: "/solutions",
      title: "Workspace templates",
      description: "Repeatable industry-aligned playbooks and signal feeds.",
      meta: "Playbooks",
      image: heroImage("hero-platform.png"),
    },
    {
      href: "/updates",
      title: "Domain signals",
      description: "Key data sources, workflows, and AI surfaces per industry.",
      meta: "Signals",
      image: heroImage("hero-updates.png"),
    },
    {
      href: "/aixcelerator/agents",
      title: "Governed delivery",
      description: "Ownership, approvals, and evaluation-ready metadata.",
      meta: "Governance",
      image: heroImage("hero-agents.png"),
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
              <PremiumMediaCard
                key={item.title}
                href={item.href}
                title={item.title}
                description={item.description}
                meta={item.meta}
                image={item.image}
                size="sm"
              />
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
          <PremiumMediaCard
            key={item.slug}
            href={`/industries/${item.slug}`}
            title={item.name}
            description="Case studies, outcomes, and context."
            meta="Industry"
            image={item.image}
            size="sm"
          />
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
