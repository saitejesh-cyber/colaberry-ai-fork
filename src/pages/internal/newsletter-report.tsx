import Head from "next/head";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import StatePanel from "../../components/StatePanel";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";

type ReportStatusFilter = "all" | "subscribed" | "unsubscribed" | "bounced";

type ReportSummary = {
  total: number;
  subscribed: number;
  unsubscribed: number;
  bounced: number;
  unknown: number;
  bySourcePage: Record<string, number>;
  byUtmCampaign?: Record<string, number>;
};

type ReportRow = {
  id: string;
  email: string;
  status: string;
  sourcePage: string;
  sourcePath: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  referrer: string;
  subscribedAt: string;
  unsubscribedAt: string;
  createdAt: string;
  updatedAt: string;
};

type ReportResponse = {
  ok?: boolean;
  generatedAt?: string;
  summary?: ReportSummary;
  rows?: ReportRow[];
  message?: string;
};

type TemplatePreviewResponse = {
  ok?: boolean;
  subject?: string;
  unsubscribeUrl?: string;
  html?: string;
  text?: string;
  message?: string;
};

type SendMode = "test" | "campaign";

type SendResponse = {
  ok?: boolean;
  requestId?: string;
  mode?: SendMode;
  provider?: string;
  dryRun?: boolean;
  total?: number;
  sent?: number;
  failed?: number;
  result?: {
    recipient?: string;
    messageId?: string | null;
    subject?: string;
    unsubscribeUrl?: string;
  };
  failures?: Array<{ email: string; error: string }>;
  message?: string;
};

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

export default function InternalNewsletterReportPage() {
  const [apiKey, setApiKey] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>("all");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);

  const [previewEmail, setPreviewEmail] = useState("sample@colaberry.ai");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TemplatePreviewResponse | null>(null);
  const [sendMode, setSendMode] = useState<SendMode>("test");
  const [sendDryRun, setSendDryRun] = useState(true);
  const [sendRecipient, setSendRecipient] = useState("sample@colaberry.ai");
  const [sendLimit, setSendLimit] = useState(25);
  const [sendConfirm, setSendConfirm] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<SendResponse | null>(null);

  const rows = useMemo(() => report?.rows || [], [report]);
  const summary = report?.summary;
  const topCampaigns = useMemo(
    () =>
      Object.entries(summary?.byUtmCampaign || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [summary?.byUtmCampaign]
  );

  function getAdminHeaders(): Record<string, string> {
    const key = apiKey.trim();
    if (!key) return {};
    return { "x-colaberry-admin-key": key };
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("newsletter-admin-key");
    if (stored) {
      setApiKey(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!apiKey.trim()) {
      window.localStorage.removeItem("newsletter-admin-key");
      return;
    }
    window.localStorage.setItem("newsletter-admin-key", apiKey.trim());
  }, [apiKey]);

  async function loadReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportLoading(true);
    setReportError(null);
    try {
      const query = statusFilter !== "all" ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const response = await fetch(`/api/newsletter-report${query}`, {
        method: "GET",
        headers: getAdminHeaders(),
      });
      const payload = (await response.json()) as ReportResponse;
      if (!response.ok || !payload?.ok) {
        setReport(null);
        setReportError(payload?.message || "Unable to load report.");
        return;
      }
      setReport(payload);
    } catch {
      setReport(null);
      setReportError("Unable to load report.");
    } finally {
      setReportLoading(false);
    }
  }

  async function downloadCsv() {
    setReportError(null);
    try {
      const queryStatus = statusFilter !== "all" ? `&status=${encodeURIComponent(statusFilter)}` : "";
      const response = await fetch(`/api/newsletter-report?format=csv${queryStatus}`, {
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
      anchor.download = `newsletter-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to export CSV.";
      setReportError(message);
    }
  }

  async function loadTemplatePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const query = `?email=${encodeURIComponent(previewEmail.trim())}`;
      const response = await fetch(`/api/newsletter-template-preview${query}`, {
        method: "GET",
        headers: getAdminHeaders(),
      });
      const payload = (await response.json()) as TemplatePreviewResponse;
      if (!response.ok || !payload?.ok) {
        setPreview(null);
        setPreviewError(payload?.message || "Unable to load template preview.");
        return;
      }
      setPreview(payload);
    } catch {
      setPreview(null);
      setPreviewError("Unable to load template preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function sendNewsletter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendMode === "test" && !sendRecipient.trim()) {
      setSendError("Enter recipient email for test send.");
      return;
    }
    if (sendMode === "campaign" && sendConfirm.trim().toUpperCase() !== "SEND") {
      setSendError('For campaign sends, type "SEND" in confirmation field.');
      return;
    }

    setSendLoading(true);
    setSendError(null);
    try {
      const payload = {
        mode: sendMode,
        dryRun: sendDryRun,
        recipientEmail: sendMode === "test" ? sendRecipient.trim() : undefined,
        limit: sendMode === "campaign" ? sendLimit : undefined,
        confirm: sendMode === "campaign" ? sendConfirm.trim() : undefined,
      };
      const response = await fetch("/api/newsletter-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as SendResponse;
      if (!response.ok || !result?.ok) {
        setSendResult(null);
        setSendError(result?.message || "Unable to send newsletter.");
        return;
      }
      setSendResult(result);
    } catch {
      setSendResult(null);
      setSendError("Unable to send newsletter.");
    } finally {
      setSendLoading(false);
    }
  }

  const seoMeta: SeoMeta = {
    title: "Internal Newsletter Ops | Colaberry AI",
    description: "Internal dashboard for subscriber reporting, CSV exports, and newsletter template operations.",
    canonical: buildCanonical("/internal/newsletter-report"),
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
          title="Newsletter report and template ops"
          description="Secure dashboard for subscriber reporting, CSV exports, and unsubscribe-safe template previews."
        />
      </div>

      <section className="surface-panel mt-6 border border-zinc-200/80 bg-white/90 p-6 dark:border-zinc-700/80 dark:bg-zinc-900/90">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Report"
          title="Subscriber analytics"
          description="Load audience status, source attribution, and export CSV."
        />

        <form onSubmit={loadReport} className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto_auto] md:items-end">
          <div>
            <label htmlFor="report-admin-key" className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Admin key
            </label>
            <input
              id="report-admin-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Enter report API key"
              className="mt-1 w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-[#4F2AA3]/40 focus:outline-none focus:ring-2 focus:ring-[#4F2AA3]/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Required in production. Optional on localhost development.
            </p>
          </div>
          <div>
            <label htmlFor="report-status" className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Status
            </label>
            <select
              id="report-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ReportStatusFilter)}
              className="mt-1 w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-[#4F2AA3]/40 focus:outline-none focus:ring-2 focus:ring-[#4F2AA3]/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
            >
              <option value="all">All</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="bounced">Bounced</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={reportLoading}>
            {reportLoading ? "Loading..." : "Load report"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={downloadCsv}>
            Export CSV
          </button>
        </form>

        {reportError ? (
          <div className="mt-4">
            <StatePanel variant="error" title="Report error" description={reportError} />
          </div>
        ) : null}

        {summary ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Total" value={summary.total} />
            <MetricCard label="Subscribed" value={summary.subscribed} />
            <MetricCard label="Unsubscribed" value={summary.unsubscribed} />
            <MetricCard label="Bounced" value={summary.bounced} />
            <MetricCard label="Unknown" value={summary.unknown} />
          </div>
        ) : null}

        {topCampaigns.length > 0 ? (
          <div className="mt-4 rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-4 text-sm dark:border-zinc-700/70 dark:bg-zinc-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Top UTM campaigns</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {topCampaigns.map(([campaign, count]) => (
                <span key={campaign} className="chip chip-muted rounded-md px-3 py-1 text-xs font-semibold">
                  {campaign} · {count}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div className="table-shell mt-5">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-[0.16em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source page</th>
                  <th className="px-4 py-3">UTM campaign</th>
                  <th className="px-4 py-3">Subscribed</th>
                  <th className="px-4 py-3">Unsubscribed</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 250).map((row) => (
                  <tr key={`${row.id}-${row.email}`} className="border-t border-zinc-200/70 bg-white">
                    <td className="px-4 py-3 font-medium text-zinc-900">{row.email || "—"}</td>
                    <td className="px-4 py-3 text-zinc-700">{row.status || "unknown"}</td>
                    <td className="px-4 py-3 text-zinc-600">{row.sourcePage || "unknown"}</td>
                    <td className="px-4 py-3 text-zinc-600">{row.utmCampaign || "none"}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatDate(row.subscribedAt)}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatDate(row.unsubscribedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="surface-panel mt-6 border border-zinc-200/80 bg-white/90 p-6 dark:border-zinc-700/80 dark:bg-zinc-900/90">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Template"
          title="Outbound newsletter preview"
          description="Preview HTML/text with unsubscribe links wired to each recipient."
        />

        <form onSubmit={loadTemplatePreview} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label htmlFor="template-email" className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Recipient email
            </label>
            <input
              id="template-email"
              type="email"
              value={previewEmail}
              onChange={(event) => setPreviewEmail(event.target.value)}
              placeholder="recipient@company.com"
              className="mt-1 w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-[#4F2AA3]/40 focus:outline-none focus:ring-2 focus:ring-[#4F2AA3]/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={previewLoading}>
            {previewLoading ? "Loading..." : "Load template"}
          </button>
        </form>

        {previewError ? (
          <div className="mt-4">
            <StatePanel variant="error" title="Template error" description={previewError} />
          </div>
        ) : null}

        {preview?.unsubscribeUrl ? (
          <div className="mt-4 rounded-lg border border-zinc-200/80 bg-white/85 p-4 text-xs text-zinc-600">
            <span className="font-semibold text-zinc-900">Unsubscribe URL:</span>{" "}
            <span className="break-all">{preview.unsubscribeUrl}</span>
          </div>
        ) : null}

        {preview?.html ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200/80 bg-white">
            <iframe
              title="Newsletter HTML preview"
              srcDoc={preview.html}
              className="h-[520px] w-full"
            />
          </div>
        ) : null}
      </section>

      <section className="surface-panel mt-6 border border-zinc-200/80 bg-white/90 p-6 dark:border-zinc-700/80 dark:bg-zinc-900/90">
        <SectionHeader
          as="h2"
          size="md"
          kicker="Dispatch"
          title="Send newsletter"
          description="Use test mode first. Campaign mode requires explicit confirmation."
        />

        <form onSubmit={sendNewsletter} className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="send-mode" className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Mode
            </label>
            <select
              id="send-mode"
              value={sendMode}
              onChange={(event) => setSendMode(event.target.value as SendMode)}
              className="mt-1 w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-[#4F2AA3]/40 focus:outline-none focus:ring-2 focus:ring-[#4F2AA3]/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
            >
              <option value="test">Test</option>
              <option value="campaign">Campaign</option>
            </select>
          </div>

          <div>
            <label htmlFor="send-dry-run" className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Dry run
            </label>
            <div className="mt-1 flex h-[44px] items-center rounded-lg border border-zinc-200/80 bg-white px-4">
              <input
                id="send-dry-run"
                type="checkbox"
                checked={sendDryRun}
                onChange={(event) => setSendDryRun(event.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="send-dry-run" className="ml-2 text-sm text-zinc-700">
                Simulate without sending provider email
              </label>
            </div>
          </div>

          {sendMode === "test" ? (
            <div className="md:col-span-2">
              <label htmlFor="send-recipient" className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Test recipient email
              </label>
              <input
                id="send-recipient"
                type="email"
                value={sendRecipient}
                onChange={(event) => setSendRecipient(event.target.value)}
                placeholder="recipient@company.com"
                className="mt-1 w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-[#4F2AA3]/40 focus:outline-none focus:ring-2 focus:ring-[#4F2AA3]/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="send-limit" className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Batch limit
                </label>
                <input
                  id="send-limit"
                  type="number"
                  min={1}
                  max={300}
                  value={sendLimit}
                  onChange={(event) => setSendLimit(Number(event.target.value || 1))}
                  className="mt-1 w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-[#4F2AA3]/40 focus:outline-none focus:ring-2 focus:ring-[#4F2AA3]/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                />
              </div>
              <div>
                <label htmlFor="send-confirm" className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Confirmation
                </label>
                <input
                  id="send-confirm"
                  type="text"
                  value={sendConfirm}
                  onChange={(event) => setSendConfirm(event.target.value)}
                  placeholder='Type "SEND"'
                  className="mt-1 w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-[#4F2AA3]/40 focus:outline-none focus:ring-2 focus:ring-[#4F2AA3]/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500"

/>
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={sendLoading}>
              {sendLoading ? "Sending..." : "Run dispatch"}
            </button>
          </div>
        </form>

        {sendError ? (
          <div className="mt-4">
            <StatePanel variant="error" title="Dispatch error" description={sendError} />
          </div>
        ) : null}

        {sendResult?.ok ? (
          <div className="mt-4 rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-4 text-sm text-emerald-800">
            <div className="font-semibold">
              Dispatch complete ({sendResult.mode || "unknown"}) via {sendResult.provider || "provider"}
              {sendResult.dryRun ? " [dry-run]" : ""}
            </div>
            {typeof sendResult.total === "number" ? (
              <div className="mt-1">
                total: {sendResult.total}, sent: {sendResult.sent || 0}, failed: {sendResult.failed || 0}
              </div>
            ) : null}
            {sendResult.result?.recipient ? (
              <div className="mt-1">
                recipient: {sendResult.result.recipient}
                {sendResult.result.messageId ? `, messageId: ${sendResult.result.messageId}` : ""}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </Layout>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200/80 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-300">{label}</div>
      <div className="mt-1 text-xl font-semibold text-zinc-900">{value}</div>
    </div>
  );
}
