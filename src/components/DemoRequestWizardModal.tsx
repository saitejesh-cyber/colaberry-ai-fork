import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_DEMO_REQUEST_MESSAGE,
  isValidWorkEmail,
  submitDemoRequest,
} from "../lib/demoRequest";

type DemoRequestWizardModalProps = {
  open: boolean;
  onClose: () => void;
  sourcePage?: string;
  sourcePath?: string;
};

type SubmissionState = "idle" | "submitting" | "success" | "error";

export default function DemoRequestWizardModal({
  open,
  onClose,
  sourcePage = "request-demo-wizard",
  sourcePath,
}: DemoRequestWizardModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [timeline, setTimeline] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const previousOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && state !== "submitting") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, state]);

  useEffect(() => {
    if (open && !previousOpenRef.current) {
      previousOpenRef.current = true;
      const rafId = window.requestAnimationFrame(() => {
        setStep(1);
        setState("idle");
        setStatusMessage(null);
      });
      return () => window.cancelAnimationFrame(rafId);
    }
    if (!open) {
      previousOpenRef.current = false;
    }
  }, [open]);

  const canGoNext = useMemo(() => {
    if (step === 1) return isValidWorkEmail(email);
    return true;
  }, [step, email]);

  const submitDisabled = state === "submitting" || !isValidWorkEmail(email);

  async function handleSubmit() {
    if (submitDisabled) return;
    setState("submitting");
    setStatusMessage(null);
    try {
      const result = await submitDemoRequest({
        name,
        email,
        company,
        role,
        teamSize,
        timeline,
        message,
        website,
        sourcePage,
        sourcePath,
      });
      if (!result.ok) {
        setState("error");
        setStatusMessage(result.message);
        return;
      }
      setState("success");
      setStatusMessage(result.message);
    } catch {
      setState("error");
      setStatusMessage("Unable to send request right now.");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.currentTarget === event.target && state !== "submitting") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-wizard-title"
        className="w-full max-w-2xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Request a demo</div>
            <h2 id="demo-wizard-title" className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Guided booking
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Step-by-step intake so our team can prepare a tailored walkthrough.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            aria-label="Close demo request modal"
            disabled={state === "submitting"}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {state === "success" ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-700/50 dark:bg-emerald-900/20">
            <div className="text-base font-semibold text-emerald-800 dark:text-emerald-200">Request submitted</div>
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
              {statusMessage || "Thanks! We will reach out shortly."}
            </p>
            <div className="mt-4">
              <button type="button" onClick={onClose} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className={`h-2 flex-1 rounded-full ${item <= step ? "bg-brand-blue" : "bg-slate-200 dark:bg-slate-700"}`}
                />
              ))}
            </div>

            <div className="mt-5">
              {step === 1 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Name
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                      placeholder="Your name"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Work email*
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                      placeholder="name@company.com"
                    />
                  </label>
                  {!isValidWorkEmail(email) && email.trim() ? (
                    <p className="sm:col-span-2 text-sm text-rose-600 dark:text-rose-300">Enter a valid work email.</p>
                  ) : null}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Company
                    <input
                      type="text"
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                      placeholder="Company name"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Role
                    <input
                      type="text"
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                      placeholder="Title or team"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Team size
                    <input
                      type="text"
                      value={teamSize}
                      onChange={(event) => setTeamSize(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                      placeholder="e.g. 10-50"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Timeline
                    <select
                      value={timeline}
                      onChange={(event) => setTimeline(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                    >
                      <option value="">Select timeline</option>
                      <option value="Immediate">Immediate</option>
                      <option value="30-60 days">30-60 days</option>
                      <option value="This quarter">This quarter</option>
                      <option value="This year">This year</option>
                      <option value="Exploring">Exploring</option>
                    </select>
                  </label>
                </div>
              ) : null}

              {step === 3 ? (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Notes
                    <textarea
                      rows={5}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      className="mt-2 w-full resize-none rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                      placeholder={DEFAULT_DEMO_REQUEST_MESSAGE}
                    />
                  </label>
                  <input
                    name="website"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />
                  <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Summary</div>
                    <div className="mt-1">Email: {email || "Not provided"}</div>
                    <div>Company: {company || "Not provided"}</div>
                    <div>Timeline: {timeline || "Not provided"}</div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                {statusMessage ? (
                  <p className={`text-sm ${state === "error" ? "text-rose-600 dark:text-rose-300" : "text-slate-600 dark:text-slate-300"}`}>
                    {statusMessage}
                  </p>
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    <p>We usually reply in 1-2 business days.</p>
                    <p className="mt-1">
                      Prefer full form?{" "}
                      <Link href="/request-demo?wizard=off" className="font-semibold text-brand-deep underline underline-offset-4">
                        Open full page
                      </Link>
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                    className="btn btn-secondary"
                    disabled={state === "submitting"}
                  >
                    Back
                  </button>
                ) : null}
                {step < 3 ? (
                  <button type="button" onClick={() => setStep((prev) => prev + 1)} className="btn btn-primary" disabled={!canGoNext}>
                    Next
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={submitDisabled}>
                    {state === "submitting" ? "Sending..." : "Submit request"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
