import agents from "../../data/agents.json";
import AgentCard from "../../components/AgentCard";
import Layout from "../../components/Layout";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";

export default function Agents() {
  const industries = Array.from(new Set(agents.map((a) => a.industry))).slice(0, 8);
  const statusCounts = agents.reduce<Record<string, number>>((acc, a) => {
    const key = (a.status || "unknown").toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="Agents catalog"
          title="AI Agents"
          description="A governed catalog of enterprise agents and assistants-aligned to teams, workflows, and industry context."
        />
      </div>

      <section className="surface-panel mt-6 p-5">
        <SectionHeader
          kicker="Catalog snapshot"
          title="Coverage and readiness"
          description="See how many agents are active across industries and stages."
          size="md"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:items-center sm:gap-6">
          <Stat title="Agents" value={String(agents.length)} note="Versioned catalog" />
          <Stat
            title="Industries"
            value={String(new Set(agents.map((a) => a.industry)).size)}
            note="Domain-aligned"
          />
          <Stat
            title="Status mix"
            value={`${statusCounts.active ?? 0} active`}
            note={`${statusCounts.beta ?? 0} beta • ${statusCounts.unknown ?? 0} other`}
          />
        </div>
      </section>

      <div className="mt-8">
        <SectionHeader
          kicker="Filters"
          title="Explore by industry"
          description="Quickly narrow the catalog by domain focus."
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
        {agents.map((a, i) => (
          <AgentCard key={i} agent={a} />
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
