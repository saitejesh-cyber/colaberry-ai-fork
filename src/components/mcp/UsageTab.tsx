import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type UsageData = {
  topClients: Array<{ name: string; calls: number }>;
  totalCalls: number;
  dailySessions: Array<{ date: string; sessions: number }>;
};

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
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">No usage data yet</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Usage analytics will appear here once telemetry events are recorded.</p>
    </div>
  );
}

export default function UsageTab({ slug }: { slug: string }) {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/mcp-telemetry?slug=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.usage) setData(json.usage);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Skeleton />;
  if (!data || data.totalCalls === 0) return <EmptyState />;

  return (
    <div className="space-y-8">
      {/* Top Clients */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Top Clients</h3>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Total {data.totalCalls.toLocaleString()}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="w-10 py-2.5 pr-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">#</th>
                <th className="py-2.5 pr-4 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Client</th>
                <th className="py-2.5 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Calls</th>
              </tr>
            </thead>
            <tbody>
              {data.topClients.map((client, i) => (
                <tr key={client.name} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="py-2.5 pr-3 text-sm font-bold text-zinc-400 dark:text-zinc-500">{i + 1}</td>
                  <td className="py-2.5 pr-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">{client.name}</td>
                  <td className="py-2.5 text-right text-sm tabular-nums text-zinc-700 dark:text-zinc-300">{client.calls.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Sessions chart */}
      {data.dailySessions.length > 1 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Daily Sessions</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailySessions} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} stroke="currentColor" className="text-zinc-400" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-zinc-400" width={40} />
                <Tooltip
                  labelFormatter={(label) => formatDate(String(label))}
                  formatter={(value) => [Number(value).toLocaleString(), "Sessions"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
                />
                <Area type="monotone" dataKey="sessions" stroke="#DC2626" strokeWidth={2} fill="url(#sessionsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
