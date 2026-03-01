import Head from "next/head";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import StatePanel from "../../components/StatePanel";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";

type EntityKey = "all" | "agents" | "mcpServers" | "useCases" | "skills" | "podcasts";

type Summary = {
  total: number;
  fresh: number;
  stale: number;
  complete: number;
  incomplete: number;
  averageCompleteness: number;
};

type ReportRow = {
  entity: EntityKey;
  id: number;
  name: string;
  slug: string;
  href: string;
  status: string;
  visibility: string;
  source: string;
  updatedAt: string;
  isFresh: boolean;
  completenessScore: number;
  requiredChecks: number;
  missingChecks: number;
  missingFields: string[];
};

type ReportPayload = {
  ok?: boolean;
  generatedAt?: string;
  totals?: { rows?: number; warnings?: number };
  summaryByEntity?: Record<Exclude<EntityKey, "all">, Summary>;
  warnings?: Array<{ entity: Exclude<EntityKey, "all">; message: string }>;
  rows?: ReportRow[];
  message?: string;
};

const ENTITY_OPTIONS: Array<{ value: EntityKey; label: string }> = [
  { value: "all", label: "All entities" },
  { value: "agents", label: "Agents" },
  { value: "mcpServers", label: "MCP servers" },
  { value: "useCases", label: "Use cases" },
  { value: "skills", label: "Skills" },
  { value: "podcasts", label: "Podcasts" },
];

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InternalCatalogHealthPage() {
  const [apiKey, setApiKey] = useState("");
  const [entity, setEntity] = useState<EntityKey>("all");
  const [includePrivate, setIncludePrivate] = useState(false);
  const [freshnessDays, setFreshnessDays] = useState(90);
  const [maxRecords, setMaxRecords] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);

  const rows = useMemo(() => report?.rows || [], [report]);
  const summaryByEntity = report?.summaryByEntity;
  const warnings = report?.warnings || [];

  const worstRows = useMemo(
    () =>
      [...rows]
        .sort((a, b) => a.completenessScore - b.completenessScore || b.missingChecks - a.missingChecks)
        .slice(0, 40),
    [rows]
  );

  function getAdminHeaders(): Record<string, string> {
    const key = apiKey.trim();
    if (!key) return {};
    return { "x-colaberry-admin-key": key };
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("catalog-admin-key");
    if (stored) setApiKey(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!apiKey.trim()) {
      window.localStorage.removeItem("catalog-admin-key");
      return;
    }
    window.localStorage.setItem("catalog-admin-key", apiKey.trim());
  }, [apiKey]);

  async function loadReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        entity,
        includePrivate: String(includePrivate),
        freshnessDays: String(freshnessDays),
        maxRecords: String(maxRecords),
      });
      const response = await fetch(`/api/catalog-health?${query.toString()}`, {
        method: "GET",
        headers: getAdminHeaders(),
      });
      const payload = (await response.json()) as ReportPayload;
      if (!response.ok || !payload?.ok) {
        setReport(null);
        setError(payload?.message || "Unable to load catalog health report.");
        return;
      }
      setReport(payload);
    } catch {
      setReport(null);
      setError("Unable to load catalog health report.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadCsv() {
    setError(null);
    try {
      const query = new URLSearchParams({
        format: "csv",
        entity,
        includePrivate: String(includePrivate),
        freshnessDays: String(freshnessDays),
        maxRecords: String(maxRecords),
      });
      const response = await fetch(`/api/catalog-health?${query.toString()}`, {
        method: "GET",
        headers: getAdminHeaders(),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Unable to export CSV.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `catalog-health-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      const message = downloadError instanceof Error ? downloadError.message : "Unable to export CSV.";
      setError(message);
    }
  }

  const seoMeta: SeoMeta = {
    title: "Internal Catalog Health | Colaberry AI",
    description: "Internal catalog health and completeness audit for agents, MCP servers, use cases, skills, and podcasts.",
    canonical: buildCanonical("/internal/catalog-health"),
    noindex: true,
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
      </Head>

      <div className="flex flex-col gap-3">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="Internal ops"
          title="Catalog health and completeness"
          description="Audit freshness and LLM-indexable metadata coverage for agents, MCP servers, use cases, skills, and podcasts."
        />
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          This report highlights stale records and missing fields so content can be enriched before release.
        </p>
      </div>

      <section className="surface-panel section-shell section-spacing p-6">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Report filters"
          title="Run catalog health scan"
          description="Use API key in non-local environments. Localhost requests are allowed without key."
        />
        <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={loadReport}>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Admin API key
            <input
              type="password"
              className="input"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="x-colaberry-admin-key"
            />
          </label>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Entity
            <select className="input" value={entity} onChange={(event) => setEntity(event.target.value as EntityKey)}>
              {ENTITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Freshness window (days)
            <input
              type="number"
              min={1}
              max={3650}
              className="input"
              value={freshnessDays}
              onChange={(event) => setFreshnessDays(Number(event.target.value) || 90)}
            />
          </label>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Max records per entity
            <input
              type="number"
              min={10}
              max={10000}
              className="input"
              value={maxRecords}
              onChange={(event) => setMaxRecords(Number(event.target.value) || 1000)}
            />
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700/70 dark:bg-zinc-900/70 dark:text-zinc-200">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300 text-[#4F2AA3] focus:ring-[#4F2AA3]"
              checked={includePrivate}
              onChange={(event) => setIncludePrivate(event.target.checked)}
            />
            Include private records
          </label>

          <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-1">
            <button type="submit" className="btn btn-primary h-10 px-5" disabled={loading}>
              {loading ? "Loading..." : "Run report"}
            </button>
            <button type="button" className="btn btn-secondary h-10 px-5" onClick={downloadCsv}>
              Export CSV
            </button>
          </div>
        </form>
      </section>

      {error ? (
        <div className="section-spacing">
          <StatePanel variant="error" title="Report error" description={error} />
        </div>
      ) : null}

      {report ? (
        <section className="section-spacing grid gap-6">
          <div className="surface-panel section-shell p-6">
            <SectionHeader
              as="h2"
              size="md"
              kicker="Snapshot"
              title="Catalog health summary"
              description={`Generated ${formatDate(report.generatedAt || "")} • ${report.totals?.rows || 0} rows analyzed.`}
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {(Object.keys(summaryByEntity || {}) as Array<Exclude<EntityKey, "all">>).map((key) => {
                const value = summaryByEntity?.[key];
                if (!value) return null;
                return (
                  <article key={key} className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-700/70 dark:bg-zinc-900/70">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{key}</p>
                    <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{value.total}</p>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                      {value.fresh} fresh • {value.incomplete} incomplete
                    </p>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                      Avg completeness {value.averageCompleteness}%
                    </p>
                  </article>
                );
              })}
            </div>

            {warnings.length > 0 ? (
              <div className="mt-5 rounded-lg border border-amber-300/50 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-semibold">Warnings</p>
                <ul className="mt-2 space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={`${warning.entity}-${index}`}>
                      {warning.entity}: {warning.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="surface-panel section-shell p-6">
            <SectionHeader
              as="h2"
              size="md"
              kicker="Priority queue"
              title="Lowest-completeness records"
              description="Start enrichment with records that have the most missing metadata."
            />
            {worstRows.length === 0 ? (
              <div className="mt-5">
                <StatePanel
                  variant="empty"
                  title="No rows returned"
                  description="No catalog records matched current filters."
                />
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      <th className="px-3 py-2">Entity</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Completeness</th>
                      <th className="px-3 py-2">Fresh</th>
                      <th className="px-3 py-2">Updated</th>
                      <th className="px-3 py-2">Missing fields</th>
                    </tr>
                  </thead>
                  <tbody>
                    {worstRows.map((row) => (
                      <tr key={`${row.entity}-${row.id}`} className="rounded-lg bg-zinc-50/80 dark:bg-zinc-900/70">
                        <td className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          {row.entity}
                        </td>
                        <td className="px-3 py-3 text-zinc-900 dark:text-zinc-100">
                          <a href={row.href} className="font-semibold hover:text-[#4F2AA3] dark:hover:text-[#7B5CE0]">
                            {row.name}
                          </a>
                          <p className="mt-0.5 text-xs text-zinc-500">{row.slug}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex rounded-md border border-zinc-300/80 px-2 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                            {row.completenessScore}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                          {row.isFresh ? "Fresh" : "Stale"}
                        </td>
                        <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-300">{formatDate(row.updatedAt)}</td>
                        <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                          {row.missingFields.length ? row.missingFields.join(", ") : "None"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </Layout>
  );
}
