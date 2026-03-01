type ComparisonRow = {
  label: string;
  values: (string | boolean)[];
};

type ComparisonTableProps = {
  columns: string[];
  rows: ComparisonRow[];
};

export default function ComparisonTable({
  columns,
  rows,
}: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--stroke)]">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="bg-[var(--surface-soft)]">
            <th className="sticky left-0 z-[1] bg-[var(--surface-soft)] px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">
              Feature
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-center font-semibold text-[var(--text-primary)]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className="border-t border-[var(--stroke)] transition-colors hover:bg-[var(--surface-soft)]/50"
            >
              <td className="sticky left-0 z-[1] bg-[var(--surface-strong)] px-4 py-3 font-medium text-[var(--text-primary)]">
                {row.label}
              </td>
              {row.values.map((val, i) => (
                <td key={i} className="px-4 py-3 text-center">
                  {typeof val === "boolean" ? (
                    val ? (
                      <span className="inline-flex text-[var(--trust-green)]" aria-label="Included">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]" aria-label="Not included">
                        &mdash;
                      </span>
                    )
                  ) : (
                    <span className="text-[var(--text-secondary)]">{val}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
