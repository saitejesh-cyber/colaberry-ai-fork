import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

/**
 * Header auth control for the global email magic-link login.
 *
 * Anonymous → a "Sign in" button that deep-links to /login with a same-site
 * `redirect` back to the current page. Authenticated → the signed-in email +
 * a "Sign out" action (POST /api/auth/logout). Auth state is read client-side
 * from /api/auth/me, so this stays SSR/hydration-safe: the server and first
 * client render both emit the anonymous "Sign in" state (and a bare /login
 * href), then the component upgrades after mount — no markup mismatch.
 *
 * The login itself ships dark: with no AUTH_JWT keys /api/auth/me returns
 * `{ authenticated:false }` and this simply shows "Sign in" (→ /login, which
 * renders "login unavailable" until keys are set).
 */

type AuthState = { ready: boolean; email: string | null };

function PersonGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

export default function HeaderAuth({
  variant = "desktop",
  onNavigate,
}: {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ ready: false, email: null });

  useEffect(() => {
    setMounted(true);
    let alive = true;
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { authenticated?: boolean; email?: string } | null) => {
        if (alive) setAuth({ ready: true, email: d?.authenticated && d.email ? d.email : null });
      })
      .catch(() => {
        if (alive) setAuth({ ready: true, email: null });
      });
    return () => {
      alive = false;
    };
  }, []);

  // Same-site redirect back to the current page after sign-in. Only added
  // post-mount so SSR + first client render both emit a bare "/login".
  const redirect = router.asPath && router.asPath.startsWith("/") ? router.asPath : "/";
  const loginHref = mounted ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      /* best-effort — clear local state regardless */
    }
    setAuth({ ready: true, email: null });
    onNavigate?.();
    void router.replace(router.asPath);
  };

  if (variant === "mobile") {
    if (auth.email) {
      return (
        <div className="flex flex-col gap-2">
          <span
            title={auth.email}
            className="inline-flex w-full items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            <PersonGlyph />
            <span className="truncate">{auth.email}</span>
          </span>
          <button
            type="button"
            onClick={signOut}
            className="focus-ring inline-flex h-10 w-full items-center justify-center rounded-full border border-zinc-200 text-sm font-semibold text-zinc-700 transition hover:border-[#DC2626]/40 hover:text-[#DC2626] dark:border-zinc-700 dark:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      );
    }
    return (
      <Link
        href={loginHref}
        onClick={onNavigate}
        className="focus-ring inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-zinc-200 text-sm font-semibold text-zinc-700 transition hover:border-[#DC2626]/40 hover:text-[#DC2626] dark:border-zinc-700 dark:text-zinc-200"
      >
        <PersonGlyph />
        <span>Sign in</span>
      </Link>
    );
  }

  // desktop — sits immediately left of the "Book a demo" CTA
  if (auth.email) {
    return (
      <div className="ml-1 flex shrink-0 items-center gap-1.5">
        <span
          title={auth.email}
          className="inline-flex h-10 max-w-[180px] items-center gap-1.5 rounded-full border border-zinc-200 px-3 text-sm font-medium text-zinc-700 max-[1500px]:h-9 max-[1500px]:max-w-[130px] max-[1500px]:text-xs dark:border-zinc-700 dark:text-zinc-200"
        >
          <PersonGlyph />
          <span className="truncate">{auth.email}</span>
        </span>
        <button
          type="button"
          onClick={signOut}
          className="btn btn-ghost h-10 shrink-0 whitespace-nowrap px-3 text-sm max-[1500px]:h-9 max-[1500px]:px-2 max-[1500px]:text-xs"
        >
          Sign out
        </button>
      </div>
    );
  }
  return (
    <Link
      href={loginHref}
      className="btn btn-secondary ml-1 h-10 shrink-0 gap-1.5 whitespace-nowrap px-4 text-sm max-[1500px]:h-9 max-[1500px]:px-3 max-[1500px]:text-xs"
    >
      <PersonGlyph />
      <span>Sign in</span>
    </Link>
  );
}
