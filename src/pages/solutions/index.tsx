import Layout from "../../components/Layout";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";
import MediaPanel from "../../components/MediaPanel";

export default function Solutions() {
  const solutions = [
    {
      title: "Agent operations",
      description: "Governed rollout patterns for agent ownership, lifecycle, and reliability.",
    },
    {
      title: "Knowledge assistants",
      description: "Secure retrieval + workflow assistants for enterprise teams.",
    },
    {
      title: "Document automation",
      description: "Summarization, extraction, drafting, and review with audit-ready metadata.",
    },
    {
      title: "MCP integration",
      description: "Standardized tool access for automation across systems.",
    },
    {
      title: "Governance & guardrails",
      description: "Policies, data boundaries, and controls for enterprise adoption.",
    },
    {
      title: "Industry playbooks",
      description: "Domain context and repeatable delivery patterns by industry.",
    },
  ];
  const solutionHighlights = [
    {
      title: "Operational playbooks",
      description: "Repeatable patterns ready for enterprise deployment.",
    },
    {
      title: "Governance baked in",
      description: "Approvals, ownership, and audit-ready delivery context.",
    },
    {
      title: "Integration ready",
      description: "MCP connectors and tool access with consistent patterns.",
    },
    {
      title: "Outcome aligned",
      description: "Mapped to industry outcomes and measurable value.",
    },
  ];

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <div className="chip chip-brand inline-flex w-fit items-center gap-2 rounded-full border border-brand-blue/20 bg-white py-1 pl-2 pr-3 text-xs text-brand-deep">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-aqua" />
            Modular layer
          </div>
          <SectionHeader
            as="h1"
            size="xl"
            title="Solutions"
            description="Packaged offerings and reusable solution patterns-aligned to industries and delivery playbooks."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {solutionHighlights.map((item) => (
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
          kicker="Solution preview"
          title="Operational playbooks"
          description="Repeatable solution patterns ready for deployment."
          image="/media/hero/hero-solutions.png"
          alt="Operational playbook overview"
          aspect="wide"
          fit="cover"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {solutions.map((item) => (
          <div key={item.title} className="surface-panel border-t-4 border-brand-blue/20 p-5">
            <div className="text-base font-semibold text-slate-900">{item.title}</div>
            <div className="mt-1 text-sm text-slate-600">{item.description}</div>
            <div className="chip chip-muted mt-4 inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
              Planned
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/industries"
          className="btn btn-secondary"
        >
          View industries
        </Link>
        <Link
          href="/resources"
          className="btn btn-primary"
        >
          Explore resources
        </Link>
      </div>
    </Layout>
  );
}
