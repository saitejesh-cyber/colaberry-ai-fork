import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import SectionHeading from "./SectionHeading";

type ToolMetric = {
  name: string;
  calls: number;
  avgLatencyMs: number;
  uptimePercent: number;
};

type PerformanceData = {
  tools: ToolMetric[];
  totalCalls: number;
  avgLatencyMs: number;
  uptimePercent: number;
  latencyTimeSeries: Array<{ date: string; p50LatencyMs: number }>;
};

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-48 rounded bg-zinc-100 dark:bg-zinc-800/50" />
      <div className="h-64 rounded bg-zinc-100 dark:bg-zinc-800/50" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <svg className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m7 16 4-8 4 4 4-6" />
      </svg>
      <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">No performance data yet</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Performance metrics will appear here once telemetry events are recorded.</p>
    </div>
  );
}

export default function PerformanceTab({ slug }: { slug: string }) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/mcp-telemetry?slug=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.performance) setData(json.performance);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Skeleton />;
  if (!data || data.totalCalls === 0) return <EmptyState />;

  return (
    <div className="space-y-8">
      {/* Per-tool metrics table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="py-2.5 pr-4 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Tool</th>
              <th className="py-2.5 pr-4 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Calls</th>
              <th className="py-2.5 pr-4 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Latency</th>
              <th className="py-2.5 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Uptime</th>
            </tr>
          </thead>
          <tbody>
            {data.tools.map((tool) => (
              <tr key={tool.name} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2.5 pr-4 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{tool.name}</td>
                <td className="py-2.5 pr-4 text-right text-sm tabular-nums text-zinc-700 dark:text-zinc-300">{tool.calls.toLocaleString()}</td>
                <td className="py-2.5 pr-4 text-right text-sm tabular-nums text-zinc-700 dark:text-zinc-300">{formatLatency(tool.avgLatencyMs)}</td>
                <td className="py-2.5 text-right text-sm tabular-nums text-zinc-700 dark:text-zinc-300">{tool.uptimePercent}%</td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="border-t-2 border-zinc-200 dark:border-zinc-700 font-semibold">
              <td className="py-2.5 pr-4 text-sm text-zinc-900 dark:text-zinc-100">{data.totalCalls.toLocaleString()} total</td>
              <td className="py-2.5 pr-4 text-right text-sm tabular-nums text-zinc-900 dark:text-zinc-100" />
              <td className="py-2.5 pr-4 text-right text-sm tabular-nums text-zinc-900 dark:text-zinc-100">{formatLatency(data.avgLatencyMs)}</td>
              <td className="py-2.5 text-right text-sm tabular-nums text-zinc-900 dark:text-zinc-100">{data.uptimePercent}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-4">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/60">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Uptime (30d)</p>
          <p className="mt-0.5 text-lg font-bold text-zinc-900 dark:text-zinc-100">{data.uptimePercent}%</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/60">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Latency (30d)</p>
          <p className="mt-0.5 text-lg font-bold text-zinc-900 dark:text-zinc-100">{formatLatency(data.avgLatencyMs)}</p>
        </div>
      </div>

      {/* Latency time-series chart */}
      {data.latencyTimeSeries.length > 1 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Latency Over Time</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.latencyTimeSeries} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} stroke="currentColor" className="text-zinc-400" />
                <YAxis tickFormatter={(v: number) => formatLatency(v)} tick={{ fontSize: 11 }} stroke="currentColor" className="text-zinc-400" width={50} />
                <Tooltip
                  labelFormatter={(label) => formatDate(String(label))}
                  formatter={(value) => [formatLatency(Number(value)), "P50 Latency"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
                />
                <Line type="monotone" dataKey="p50LatencyMs" stroke="#DC2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
