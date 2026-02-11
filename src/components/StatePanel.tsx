import { ReactNode } from "react";

type StatePanelVariant = "loading" | "empty" | "error";

type StatePanelProps = {
  variant: StatePanelVariant;
  title: string;
  description?: string;
  action?: ReactNode;
};

const VARIANT_STYLES: Record<StatePanelVariant, { border: string; badge: string; label: string }> = {
  loading: {
    border: "border-brand-blue/25",
    badge: "bg-brand-blue/10 text-brand-deep dark:bg-brand-blue/20 dark:text-slate-100",
    label: "Loading",
  },
  empty: {
    border: "border-slate-200/80",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200",
    label: "Empty",
  },
  error: {
    border: "border-rose-200",
    badge: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-200",
    label: "Error",
  },
};

export default function StatePanel({ variant, title, description, action }: StatePanelProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const liveMode = variant === "error" ? "assertive" : "polite";
  const role = variant === "error" ? "alert" : "status";

  return (
    <div
      role={role}
      aria-live={liveMode}
      className={`surface-panel border-l-4 ${variantStyle.border} p-5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${variantStyle.badge}`}>
            {variantStyle.label}
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        </div>
        {action ? <div className="flex items-center">{action}</div> : null}
      </div>
      {description ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      ) : null}
    </div>
  );
}
