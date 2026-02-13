import { ReactNode } from "react";

type StatePanelVariant = "loading" | "empty" | "error";

type StatePanelProps = {
  variant: StatePanelVariant;
  title: string;
  description?: string;
  action?: ReactNode;
};

const VARIANT_STYLES: Record<
  StatePanelVariant,
  { border: string; badge: string; label: string; iconTone: string }
> = {
  loading: {
    border: "border-brand-blue/25",
    badge: "bg-brand-blue/10 text-brand-deep dark:bg-brand-blue/20 dark:text-slate-100",
    label: "Loading",
    iconTone: "text-brand-deep dark:text-sky-200",
  },
  empty: {
    border: "border-slate-200/80",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200",
    label: "Empty",
    iconTone: "text-slate-500 dark:text-slate-300",
  },
  error: {
    border: "border-rose-200",
    badge: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-200",
    label: "Error",
    iconTone: "text-rose-600 dark:text-rose-300",
  },
};

function StateIcon({ variant, iconTone }: { variant: StatePanelVariant; iconTone: string }) {
  if (variant === "loading") {
    return (
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${iconTone}`} aria-hidden="true" fill="none">
        <path
          d="M12 4a8 8 0 1 1-8 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${iconTone}`} aria-hidden="true" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 ${iconTone}`} aria-hidden="true" fill="none">
      <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function StatePanel({ variant, title, description, action }: StatePanelProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const liveMode = variant === "error" ? "assertive" : "polite";
  const role = variant === "error" ? "alert" : "status";

  return (
    <div
      role={role}
      aria-live={liveMode}
      className={`surface-panel border-l-4 ${variantStyle.border} bg-white/95 p-5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <StateIcon variant={variant} iconTone={variantStyle.iconTone} />
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${variantStyle.badge}`}>
            {variantStyle.label}
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        </div>
        {action ? <div className="flex items-center">{action}</div> : null}
      </div>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
      ) : null}
    </div>
  );
}
