import { FormEvent, useState } from "react";
import { DEFAULT_DEMO_REQUEST_MESSAGE, submitDemoRequest } from "../lib/demoRequest";

type DemoRequestFormProps = {
  sourcePage?: string;
  sourcePath?: string;
};

type SubmissionState = "idle" | "submitting" | "success" | "error";

export default function DemoRequestForm({
  sourcePage = "request-demo",
  sourcePath,
}: DemoRequestFormProps) {
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;

    setState("submitting");
    setStatusMessage(null);

    try {
      const payload = await submitDemoRequest({
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

      if (!payload.ok) {
        setState("error");
        setStatusMessage(payload.message);
        return;
      }

      setState("success");
      setStatusMessage(payload.message);
      setName("");
      setEmail("");
      setCompany("");
      setRole("");
      setTeamSize("");
      setTimeline("");
      setMessage("");
      setWebsite("");
    } catch {
      setState("error");
      setStatusMessage("Unable to send request right now.");
    }
  }

  const statusClass =
    state === "success"
      ? "text-emerald-700 dark:text-emerald-300"
      : state === "error"
      ? "text-rose-700 dark:text-rose-300"
      : "text-slate-500 dark:text-slate-400";

  return (
    <form
      id="demo-request-form"
      onSubmit={onSubmit}
      className="surface-panel mt-8 p-6"
    >
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Request a tailored walkthrough
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Tell us about your team and we will prepare a demo that fits your workflows.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Name
          <input
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500"
            placeholder="Your name"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Work email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500"
            placeholder="name@company.com"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Company
          <input
            type="text"
            name="company"
            autoComplete="organization"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500"
            placeholder="Company name"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Role
          <input
            type="text"
            name="role"
            autoComplete="organization-title"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500"
            placeholder="Title or team"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Team size
          <input
            type="text"
            name="teamSize"
            value={teamSize}
            onChange={(event) => setTeamSize(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500"
            placeholder="e.g. 10-50"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Timeline
          <select
            name="timeline"
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

      <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        Notes
        <textarea
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          className="mt-2 w-full resize-none rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500"
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

      <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" className="btn btn-primary" disabled={state === "submitting"}>
          {state === "submitting" ? "Sending request..." : "Submit demo request"}
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          We reply within 1-2 business days. Your info stays internal.
        </p>
      </div>

      {statusMessage ? (
        <p className={`mt-3 text-sm ${statusClass}`} aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
    </form>
  );
}
