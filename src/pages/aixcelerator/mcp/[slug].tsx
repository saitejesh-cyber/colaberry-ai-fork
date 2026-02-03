import type { GetServerSideProps } from "next";
import Link from "next/link";
import Layout from "../../../components/Layout";
import SectionHeader from "../../../components/SectionHeader";
import { fetchMCPServerBySlug, MCPServer } from "../../../lib/cms";

type MCPDetailProps = {
  mcp: MCPServer;
  allowPrivate: boolean;
};

export const getServerSideProps: GetServerSideProps<MCPDetailProps> = async ({ params }) => {
  const slug = String(params?.slug || "");
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";

  try {
    const mcp = await fetchMCPServerBySlug(slug);
    if (!mcp) {
      return { notFound: true };
    }
    if (!allowPrivate && (mcp.visibility || "public").toLowerCase() === "private") {
      return { notFound: true };
    }
    return { props: { mcp, allowPrivate } };
  } catch {
    return { notFound: true };
  }
};

export default function MCPDetail({ mcp, allowPrivate }: MCPDetailProps) {
  const isPrivate = (mcp.visibility || "public").toLowerCase() === "private";
  const status = mcp.status || "Unknown";
  const source = mcp.source || "internal";
  const sourceLabel =
    source === "external" ? "External" : source === "partner" ? "Partner" : "Internal";
  const sourceDisplay = mcp.sourceName
    ? `${sourceLabel} (${mcp.sourceName})`
    : source === "internal"
      ? `${sourceLabel} (Colaberry)`
      : sourceLabel;

  return (
    <Layout>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/aixcelerator" className="hover:text-slate-700">
          AIXcelerator
        </Link>
        <span>/</span>
        <Link href="/aixcelerator/mcp" className="hover:text-slate-700">
          MCP Servers
        </Link>
        <span>/</span>
        <span className="text-slate-700">{mcp.name}</span>
      </div>

      <div className="hero-surface mt-4 rounded-[32px] p-8 sm:p-10">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="MCP profile"
          title={mcp.name}
          description={mcp.description || "Detailed overview coming soon."}
        />
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="chip chip-brand rounded-full px-3 py-1 text-xs font-semibold">
            {mcp.industry || "General"}
          </span>
          <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
            {sourceDisplay}
          </span>
          {mcp.verified ? (
            <span className="chip rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Verified
            </span>
          ) : null}
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
          title="Integration snapshot"
          description="Core metadata, ownership context, and documentation links."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail label="Visibility" value={isPrivate ? "Private" : "Public"} />
          <Detail label="Status" value={status} />
          <Detail label="Source" value={sourceDisplay} />
          <Detail label="Verified" value={mcp.verified ? "Yes" : "No"} />
          <Detail label="Industry" value={mcp.industry || "General"} />
          <Detail label="Category" value={mcp.category || "General"} />
          <Detail label="Documentation" value={mcp.docsUrl ? "Open docs" : "Not linked yet"} />
          <Detail label="Tags" value={formatList(mcp.tags)} />
          <Detail label="Companies" value={formatList(mcp.companies)} />
          <Detail label="Source link" value={mcp.sourceUrl ? "Open source" : "Not linked yet"} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {mcp.docsUrl ? (
            <a
              href={mcp.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              View documentation
            </a>
          ) : null}
          {mcp.sourceUrl ? (
            <a
              href={mcp.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
            >
              View external source
            </a>
          ) : null}
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
