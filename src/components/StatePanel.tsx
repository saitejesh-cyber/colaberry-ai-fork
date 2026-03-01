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
    border: "border-[var(--pivot-stroke)]",
    badge: "bg-[var(--pivot-surface)] text-[var(--pivot-text)] dark:bg-[var(--pivot-surface)] dark:text-[var(--pivot-text)]",
    label: "Loading",
    iconTone: "text-[var(--pivot-fill)] dark:text-[var(--pivot-fill)]",
  },
  empty: {
    border: "border-[var(--neutral-stroke)]",
    badge: "bg-[var(--neutral-fill)] text-[var(--neutral-text)] dark:bg-[var(--neutral-fill)] dark:text-[var(--neutral-text)]",
    label: "Empty",
    iconTone: "text-[var(--neutral-text)] dark:text-[var(--neutral-text)]",
  },
  error: {
    border: "border-[var(--failure-stroke)]",
    badge: "bg-[var(--failure-fill)] text-[var(--failure-text)] dark:bg-[var(--failure-fill)] dark:text-[var(--failure-text)]",
    label: "Error",
    iconTone: "text-[var(--failure-text)] dark:text-[var(--failure-text)]",
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
      className={`surface-panel border-l-4 ${variantStyle.border} bg-white/95 dark:bg-[var(--surface-strong)]/95 p-5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <StateIcon variant={variant} iconTone={variantStyle.iconTone} />
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${variantStyle.badge}`}>
            {variantStyle.label}
          </span>
          <span className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</span>
        </div>
        {action ? <div className="flex items-center">{action}</div> : null}
      </div>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
      ) : null}
    </div>
  );
}
