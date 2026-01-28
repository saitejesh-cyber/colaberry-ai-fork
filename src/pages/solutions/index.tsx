import Layout from "../../components/Layout";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";

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

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-blue/20 bg-white py-1 pl-2 pr-3 text-xs text-brand-deep">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-aqua" />
          Modular layer
        </div>
        <SectionHeader
          as="h1"
          size="xl"
          title="Solutions"
          description="Packaged offerings and reusable solution patterns-aligned to industries and delivery playbooks."
        />
      </div>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {solutions.map((item) => (
          <div
            key={item.title}
            className="surface-panel surface-hover border-t-4 border-brand-blue/20 p-5"
          >
            <div className="text-base font-semibold text-slate-900">{item.title}</div>
            <div className="mt-1 text-sm text-slate-600">{item.description}</div>
            <div className="mt-4 inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
              Planned
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/industries"
          className="inline-flex items-center justify-center rounded-full border border-brand-blue/25 bg-white px-4 py-2.5 text-sm font-semibold text-brand-ink hover:bg-slate-50"
        >
          View industries
        </Link>
        <Link
          href="/resources"
          className="inline-flex items-center justify-center rounded-full bg-slate-900 bg-gradient-to-r from-brand-blue to-brand-aqua px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-brand-deep hover:to-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
        >
          Explore resources
        </Link>
      </div>
    </Layout>
  );
}
