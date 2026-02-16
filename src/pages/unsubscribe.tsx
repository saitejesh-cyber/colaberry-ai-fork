import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import SectionHeader from "../components/SectionHeader";
import StatePanel from "../components/StatePanel";

type UnsubscribeState = "idle" | "submitting" | "success" | "error";

type ApiPayload = {
  ok?: boolean;
  message?: string;
};

export default function UnsubscribePage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const email = typeof router.query.email === "string" ? router.query.email : "";
  const hasUnsubscribeInput = Boolean(token || email);
  const [state, setState] = useState<UnsubscribeState>("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!router.isReady) return;
    if (!hasUnsubscribeInput) return;

    let isActive = true;
    fetch("/api/newsletter-unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token || undefined,
        email: email || undefined,
      }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as ApiPayload;
        if (!isActive) return;
        if (!response.ok || !payload?.ok) {
          setState("error");
          setMessage(payload?.message || "Unable to process unsubscribe request.");
          return;
        }
        setState("success");
        setMessage(payload?.message || "You have been unsubscribed.");
      })
      .catch(() => {
        if (!isActive) return;
        setState("error");
        setMessage("Unable to process unsubscribe request.");
      });

    return () => {
      isActive = false;
    };
  }, [router.isReady, token, email, hasUnsubscribeInput]);

  return (
    <Layout>
      <Head>
        <title>Unsubscribe | Colaberry AI</title>
      </Head>
      <div className="flex flex-col gap-3">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="Newsletter"
          title="Manage your subscription"
          description="Processing your request to unsubscribe from Colaberry AI updates."
        />
      </div>

      <div className="mt-6">
        {!hasUnsubscribeInput ? (
          <StatePanel
            variant="error"
            title="Unable to unsubscribe"
            description="A valid unsubscribe link is required."
          />
        ) : null}
        {hasUnsubscribeInput && state === "idle" ? (
          <StatePanel
            variant="empty"
            title="Processing request"
            description="Please wait while we update your subscription preferences."
          />
        ) : null}
        {state === "success" ? (
          <StatePanel variant="empty" title="Unsubscribed" description={message} />
        ) : null}
        {state === "error" ? (
          <StatePanel
            variant="error"
            title="Unable to unsubscribe"
            description={message}
          />
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/updates" className="btn btn-secondary">
          Back to updates
        </Link>
        <Link href="/" className="btn btn-primary">
          Go to homepage
        </Link>
      </div>
    </Layout>
  );
}
