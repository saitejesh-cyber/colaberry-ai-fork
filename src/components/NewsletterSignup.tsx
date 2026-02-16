import { FormEvent, useState } from "react";

type NewsletterSignupProps = {
  sourcePath?: string;
  sourcePage?: string;
  compact?: boolean;
  title?: string;
  description?: string;
  ctaLabel?: string;
};

type SubmissionState = "idle" | "submitting" | "success" | "error";

const DEFAULT_TITLE = "Newsletter";
const DEFAULT_DESCRIPTION = "Get product updates and enterprise AI implementation signals.";

export default function NewsletterSignup({
  sourcePath,
  sourcePage = "unknown",
  compact = false,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  ctaLabel = "Subscribe",
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [unsubscribeUrl, setUnsubscribeUrl] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;

    setState("submitting");
    setMessage(null);
    setUnsubscribeUrl(null);

    try {
      const response = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          website,
          consent: true,
          sourcePath,
          sourcePage,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        reason?: string;
        unsubscribeUrl?: string | null;
      };

      if (!response.ok || !payload?.ok) {
        setState("error");
        setMessage(payload?.message || "Unable to subscribe right now. Please try again.");
        return;
      }

      setState("success");
      setMessage(payload?.message || "Subscription confirmed.");
      setUnsubscribeUrl(payload?.unsubscribeUrl || null);
      setEmail("");
      setWebsite("");
    } catch {
      setState("error");
      setMessage("Unable to subscribe right now. Please try again.");
    }
  }

  const statusClass =
    state === "success"
      ? "text-emerald-700 dark:text-emerald-300"
      : state === "error"
      ? "text-rose-700 dark:text-rose-300"
      : "text-slate-500 dark:text-slate-400";

  return (
    <div className={compact ? "rounded-2xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-700/80 dark:bg-slate-900/70" : ""}>
      <div className={compact ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500" : "text-sm font-semibold text-slate-900 dark:text-slate-100"}>
        {title}
      </div>
      <p className={compact ? "mt-1 text-xs text-slate-600 dark:text-slate-300" : "mt-1 text-sm text-slate-600 dark:text-slate-300"}>
        {description}
      </p>
      <form onSubmit={onSubmit} className={compact ? "mt-3 flex flex-col gap-2" : "mt-3 flex flex-col gap-2 sm:flex-row"}>
        <label htmlFor={`newsletter-email-${sourcePage}`} className="sr-only">
          Email
        </label>
        <input
          id={`newsletter-email-${sourcePage}`}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter work email"
          className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <label htmlFor={`newsletter-website-${sourcePage}`} className="sr-only">
          Website
        </label>
        <input
          id={`newsletter-website-${sourcePage}`}
          name="website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <button type="submit" className={compact ? "btn btn-primary btn-sm" : "btn btn-primary"} disabled={state === "submitting"}>
          {state === "submitting" ? "Subscribing..." : ctaLabel}
        </button>
      </form>
      {message ? <p className={`mt-2 text-xs ${statusClass}`}>{message}</p> : null}
      {state === "success" && unsubscribeUrl ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Need to opt out?
          {" "}
          <a
            href={unsubscribeUrl}
            className="font-medium text-brand-blue hover:underline"
          >
            Unsubscribe
          </a>
        </p>
      ) : null}
    </div>
  );
}
