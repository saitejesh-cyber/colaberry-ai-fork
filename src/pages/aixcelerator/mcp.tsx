import mcps from "../../data/mcps.json";
import MCPCard from "../../components/MCPCard";
import Layout from "../../components/Layout";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";

export default function MCP() {
  const industries = Array.from(new Set(mcps.map((m) => m.industry))).slice(0, 8);

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="MCP library"
          title="MCP Servers"
          description="A curated MCP server library for connecting agents to business apps, data, and developer tools-with patterns that support security, reliability, and observability."
        />
      </div>

      <section className="surface-panel mt-6 p-5">
        <SectionHeader
          kicker="Catalog snapshot"
          title="Coverage and delivery readiness"
          description="A quick view of integration breadth and industry alignment."
          size="md"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:items-center sm:gap-6">
          <Stat title="Servers" value={String(mcps.length)} note="Curated library" />
          <Stat
            title="Industries"
            value={String(new Set(mcps.map((m) => m.industry)).size)}
            note="Domain-aware"
          />
          <Stat title="Delivery" value="Integration-ready" note="Auth-ready patterns" />
        </div>
      </section>

      <div className="mt-8">
        <SectionHeader
          kicker="Filters"
          title="Explore by industry"
          description="Browse MCP servers by the domains they support."
          size="md"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {industries.map((industry) => (
            <Link
              key={industry}
              href={`/industries/${encodeURIComponent(industry)}`}
              className="rounded-full border border-brand-blue/25 bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-deep hover:bg-brand-blue/15"
            >
              {industry}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {mcps.map((m, i) => (
          <MCPCard key={i} mcp={m} />
        ))}
      </div>
    </Layout>
  );
}

function Stat({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-600">{note}</div>
    </div>
  );
}
