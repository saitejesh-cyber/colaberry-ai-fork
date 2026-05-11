import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DEFAULT_DEMO_REQUEST_MESSAGE,
  fetchBotToken,
  isValidWorkEmail,
  submitDemoRequest,
} from "../lib/demoRequest";
import { getTrackingContext } from "../lib/tracking";

type DemoRequestFormProps = {
  sourcePage?: string;
  sourcePath?: string;
  onSuccess?: () => void;
};

type SubmissionState = "idle" | "submitting" | "success" | "error";

type FieldErrors = {
  name?: string;
  email?: string;
  company?: string;
  consent?: string;
};

/** P2 — server caps the `message` field at this length, mirror on the client. */
const MESSAGE_MAX_LENGTH = 4000;

export default function DemoRequestForm({
  sourcePage = "request-demo",
  sourcePath,
  onSuccess,
}: DemoRequestFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [timeline, setTimeline] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [consent, setConsent] = useState(false);
  const [botToken, setBotToken] = useState<string>("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const trackingContext = useMemo(() => getTrackingContext(), []);

  // P1 — fetch a fresh HMAC-signed timing token on mount. The server
  // requires the token to be at least 5 s old at submit time, so kicking
  // the fetch off at mount gives every real user a valid token by the
  // time they finish filling the form. If the fetch fails (offline,
  // CSP, 503) we fall back to an empty token and rely on the server's
  // graceful-degrade path (flag off = ignored; flag on = silent success).
  useEffect(() => {
    let cancelled = false;
    fetchBotToken().then((token) => {
      if (!cancelled) setBotToken(token);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedSourcePath = useMemo(() => {
    if (sourcePath) return sourcePath;
    if (typeof window === "undefined") return undefined;
    return `${window.location.pathname}${window.location.search || ""}`;
  }, [sourcePath]);

  function validateEmail(value: string): string | undefined {
    if (!value.trim()) return "Work email is required.";
    if (!isValidWorkEmail(value)) return "Please enter a valid work email address.";
    return undefined;
  }

  function validateName(value: string): string | undefined {
    if (!value.trim()) return "Name is required.";
    return undefined;
  }

  function validateCompany(value: string): string | undefined {
    if (!value.trim()) return "Company is required.";
    return undefined;
  }

  function validateConsent(value: boolean): string | undefined {
    if (!value) return "Please confirm you agree to be contacted.";
    return undefined;
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "email") {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    }
    if (field === "name") {
      setFieldErrors((prev) => ({ ...prev, name: validateName(name) }));
    }
    if (field === "company") {
      setFieldErrors((prev) => ({ ...prev, company: validateCompany(company) }));
    }
    if (field === "consent") {
      setFieldErrors((prev) => ({ ...prev, consent: validateConsent(consent) }));
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;

    // Validate all required fields before submit
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const companyError = validateCompany(company);
    const consentError = validateConsent(consent);
    setFieldErrors({
      name: nameError,
      email: emailError,
      company: companyError,
      consent: consentError,
    });
    setTouched({ name: true, email: true, company: true, consent: true });

    if (nameError || emailError || companyError || consentError) return;

    setState("submitting");
    setStatusMessage(null);

    try {
      const payload = await submitDemoRequest({
        name,
        email,
        phone,
        company,
        role,
        teamSize,
        timeline,
        message,
        website,
        consent,
        _bt: botToken,
        sourcePage,
        sourcePath: resolvedSourcePath,
        utmSource: trackingContext.utmSource,
        utmMedium: trackingContext.utmMedium,
        utmCampaign: trackingContext.utmCampaign,
        utmTerm: trackingContext.utmTerm,
        utmContent: trackingContext.utmContent,
        referrer: trackingContext.referrer,
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
      setPhone("");
      setCompany("");
      setRole("");
      setTeamSize("");
      setTimeline("");
      setMessage("");
      setWebsite("");
      setConsent(false);
      setFieldErrors({});
      setTouched({});
      onSuccess?.();
    } catch {
      setState("error");
      setStatusMessage("Unable to send request right now.");
    }
  }

  const statusClass =
    state === "success"
      ? "text-[var(--trusted-text)] dark:text-[var(--trusted-text)]"
      : state === "error"
      ? "text-[var(--failure-text)] dark:text-[var(--failure-text)]"
      : "text-zinc-500 dark:text-zinc-400";

  const inputBaseClass = "input-premium mt-2";

  const inputErrorClass =
    "input-premium mt-2 !border-[var(--failure-stroke)] focus:!border-[var(--failure-text)] focus:!shadow-[0_0_0_3px_var(--failure-stroke)/30]";

  return (
    <form
      id="demo-request-form"
      onSubmit={onSubmit}
      className="surface-panel mt-8 p-6"
      noValidate
    >
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Request a tailored walkthrough
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Tell us about your team and we will prepare a demo that fits your workflows.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="demo-name"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400"
          >
            Name <span className="text-[var(--failure-text)]" aria-hidden="true">*</span>
          </label>
          <input
            id="demo-name"
            type="text"
            name="name"
            autoComplete="name"
            required
            aria-required="true"
            aria-invalid={touched.name && !!fieldErrors.name}
            aria-describedby={touched.name && fieldErrors.name ? "demo-name-error" : undefined}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (touched.name) {
                setFieldErrors((prev) => ({ ...prev, name: validateName(event.target.value) }));
              }
            }}
            onBlur={() => handleBlur("name")}
            className={touched.name && fieldErrors.name ? inputErrorClass : inputBaseClass}
            placeholder="Your name"
          />
          {touched.name && fieldErrors.name ? (
            <p id="demo-name-error" className="mt-1 text-xs text-[var(--failure-text)] dark:text-[var(--failure-text)]" role="alert">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="demo-email"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400"
          >
            Work email <span className="text-[var(--failure-text)]" aria-hidden="true">*</span>
          </label>
          <input
            id="demo-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={touched.email && !!fieldErrors.email}
            aria-describedby={touched.email && fieldErrors.email ? "demo-email-error" : undefined}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (touched.email) {
                setFieldErrors((prev) => ({ ...prev, email: validateEmail(event.target.value) }));
              }
            }}
            onBlur={() => handleBlur("email")}
            className={touched.email && fieldErrors.email ? inputErrorClass : inputBaseClass}
            placeholder="name@company.com"
          />
          {touched.email && fieldErrors.email ? (
            <p id="demo-email-error" className="mt-1 text-xs text-[var(--failure-text)] dark:text-[var(--failure-text)]" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="demo-phone"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400"
          >
            Phone
          </label>
          <input
            id="demo-phone"
            type="tel"
            name="phone"
            autoComplete="tel"
            inputMode="tel"
            maxLength={64}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputBaseClass}
            placeholder="+1 555 123 4567"
          />
        </div>

        <div>
          <label
            htmlFor="demo-company"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400"
          >
            Company <span className="text-[var(--failure-text)]" aria-hidden="true">*</span>
          </label>
          <input
            id="demo-company"
            type="text"
            name="company"
            autoComplete="organization"
            required
            aria-required="true"
            aria-invalid={touched.company && !!fieldErrors.company}
            aria-describedby={touched.company && fieldErrors.company ? "demo-company-error" : undefined}
            value={company}
            onChange={(event) => {
              setCompany(event.target.value);
              if (touched.company) {
                setFieldErrors((prev) => ({ ...prev, company: validateCompany(event.target.value) }));
              }
            }}
            onBlur={() => handleBlur("company")}
            className={touched.company && fieldErrors.company ? inputErrorClass : inputBaseClass}
            placeholder="Company name"
          />
          {touched.company && fieldErrors.company ? (
            <p id="demo-company-error" className="mt-1 text-xs text-[var(--failure-text)] dark:text-[var(--failure-text)]" role="alert">
              {fieldErrors.company}
            </p>
          ) : null}
        </div>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          Role
          <input
            type="text"
            name="role"
            autoComplete="organization-title"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className={inputBaseClass}
            placeholder="Title or team"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          Team size
          <input
            type="text"
            name="teamSize"
            value={teamSize}
            onChange={(event) => setTeamSize(event.target.value)}
            className={inputBaseClass}
            placeholder="e.g. 10-50"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          Timeline
          <select
            name="timeline"
            value={timeline}
            onChange={(event) => setTimeline(event.target.value)}
            className="input-premium mt-2"
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

      <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        Notes
        <textarea
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value.slice(0, MESSAGE_MAX_LENGTH))}
          rows={4}
          maxLength={MESSAGE_MAX_LENGTH}
          className="input-premium mt-2 resize-none"
          placeholder={DEFAULT_DEMO_REQUEST_MESSAGE}
          aria-describedby="demo-message-counter"
        />
        <div
          id="demo-message-counter"
          className="mt-1 text-right text-[11px] font-normal normal-case tracking-normal text-zinc-500 dark:text-zinc-400"
          aria-live="polite"
        >
          {message.length.toLocaleString()} / {MESSAGE_MAX_LENGTH.toLocaleString()}
        </div>
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

      <div className="mt-5">
        <label htmlFor="demo-consent" className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
          <input
            id="demo-consent"
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
              if (touched.consent) {
                setFieldErrors((prev) => ({ ...prev, consent: validateConsent(event.target.checked) }));
              }
            }}
            onBlur={() => handleBlur("consent")}
            required
            aria-required="true"
            aria-invalid={touched.consent && !!fieldErrors.consent}
            aria-describedby={touched.consent && fieldErrors.consent ? "demo-consent-error" : undefined}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-100"
          />
          <span>
            I agree to be contacted by Colaberry about my request. We only use your info to respond —
            see our <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-50">privacy policy</Link>.
          </span>
        </label>
        {touched.consent && fieldErrors.consent ? (
          <p id="demo-consent-error" className="mt-1 text-xs text-[var(--failure-text)] dark:text-[var(--failure-text)]" role="alert">
            {fieldErrors.consent}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          className="btn btn-cta"
          disabled={state === "submitting" || !consent}
        >
          {state === "submitting" ? "Sending request..." : "Submit demo request"}
        </button>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          We reply within 1-2 business days. Your info stays internal.
        </p>
      </div>

      {statusMessage ? (
        <p className={`mt-3 text-sm ${statusClass}`} role={state === "error" ? "alert" : "status"} aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
    </form>
  );
}
