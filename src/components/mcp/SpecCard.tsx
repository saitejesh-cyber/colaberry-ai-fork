export default function SpecCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
      {note && <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{note}</div>}
    </div>
  );
}
