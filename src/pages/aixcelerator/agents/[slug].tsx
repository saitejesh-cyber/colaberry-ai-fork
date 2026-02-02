import type { GetServerSideProps } from "next";
import Link from "next/link";
import Layout from "../../../components/Layout";
import SectionHeader from "../../../components/SectionHeader";
import { Agent, fetchAgentBySlug } from "../../../lib/cms";

type AgentDetailProps = {
  agent: Agent;
  allowPrivate: boolean;
};

export const getServerSideProps: GetServerSideProps<AgentDetailProps> = async ({ params }) => {
  const slug = String(params?.slug || "");
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";

  try {
    const agent = await fetchAgentBySlug(slug);
    if (!agent) {
      return { notFound: true };
    }
    if (!allowPrivate && (agent.visibility || "public").toLowerCase() === "private") {
      return { notFound: true };
    }
    return { props: { agent, allowPrivate } };
  } catch {
    return { notFound: true };
  }
};

export default function AgentDetail({ agent, allowPrivate }: AgentDetailProps) {
  const isPrivate = (agent.visibility || "public").toLowerCase() === "private";
  const status = agent.status || "Unknown";

  return (
    <Layout>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/aixcelerator" className="hover:text-slate-700">
          AIXcelerator
        </Link>
        <span>/</span>
        <Link href="/aixcelerator/agents" className="hover:text-slate-700">
          Agents
        </Link>
        <span>/</span>
        <span className="text-slate-700">{agent.name}</span>
      </div>

      <div className="hero-surface mt-4 rounded-[32px] p-8 sm:p-10">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="Agent profile"
          title={agent.name}
          description={agent.description || "Detailed overview coming soon."}
        />
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="chip chip-brand rounded-full px-3 py-1 text-xs font-semibold">
            {agent.industry || "General"}
          </span>
          <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
            {isPrivate ? "Private" : "Public"}
          </span>
          {!allowPrivate && isPrivate ? (
            <span className="text-xs text-slate-500">Private listings hidden</span>
          ) : null}
        </div>
      </div>

      <section className="surface-panel mt-6 p-6">
        <SectionHeader
          size="md"
          kicker="Catalog details"
          title="Operational snapshot"
          description="Industry alignment, ownership context, and catalog metadata."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail label="Visibility" value={isPrivate ? "Private" : "Public"} />
          <Detail label="Status" value={status} />
          <Detail label="Industry" value={agent.industry || "General"} />
          <Detail label="Tags" value={formatList(agent.tags)} />
          <Detail label="Companies" value={formatList(agent.companies)} />
        </div>
      </section>
    </Layout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function formatList(items?: { name?: string }[]) {
  if (!items || items.length === 0) {
    return "Not tagged yet";
  }
  return items.map((item) => item.name || "").filter(Boolean).join(", ");
}
