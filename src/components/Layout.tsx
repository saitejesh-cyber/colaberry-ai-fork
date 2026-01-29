import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import { ReactNode, useEffect, useState } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem("theme", next);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-transparent text-slate-900">
      <Head>
        <link rel="preconnect" href="https://www.buzzsprout.com" />
        <link rel="dns-prefetch" href="https://www.buzzsprout.com" />
      </Head>
      <a href="#main-content" className="skip-link focus-ring">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/90 backdrop-blur-md shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <span className="inline-flex items-center justify-center px-1">
                <Image
                  src="/brand/colaberry-ai-logo.svg"
                  alt="Colaberry.AI"
                  width={260}
                  height={60}
                  priority
                  className="h-8 w-auto sm:h-9 lg:h-10"
                />
              </span>
              <div className="hidden leading-tight sm:block">
                <div className="text-sm font-semibold text-brand-ink">AI Platform</div>
                <div className="text-xs text-slate-700">Consulting • AIXcelerator • Labs</div>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 text-sm lg:flex">
            <Link
              href="/aixcelerator"
              className="focus-ring rounded-full px-3 py-2 font-semibold text-slate-900 hover:bg-brand-blue/10 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
            >
              Platform
            </Link>
            <Link
              href="/aixcelerator/agents"
              className="focus-ring rounded-full px-3 py-2 font-semibold text-slate-900 hover:bg-brand-blue/10 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
            >
              Agents
            </Link>
            <Link
              href="/aixcelerator/mcp"
              className="focus-ring rounded-full px-3 py-2 font-semibold text-slate-900 hover:bg-brand-blue/10 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
            >
              MCP
            </Link>
            <Link
              href="/industries"
              className="focus-ring rounded-full px-3 py-2 font-semibold text-slate-900 hover:bg-brand-blue/10 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
            >
              Industries
            </Link>
            <Link
              href="/solutions"
              className="focus-ring rounded-full px-3 py-2 font-semibold text-slate-900 hover:bg-brand-blue/10 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
            >
              Solutions
            </Link>
            <Link
              href="/resources"
              className="focus-ring rounded-full px-3 py-2 font-semibold text-slate-900 hover:bg-brand-blue/10 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
            >
              Resources
            </Link>
            <Link
              href="/updates"
              className="focus-ring rounded-full px-3 py-2 font-semibold text-slate-900 hover:bg-brand-blue/10 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
            >
              Updates
            </Link>

            <form
              className="ml-2 hidden items-center lg:flex"
              onSubmit={(event) => event.preventDefault()}
            >
              <label htmlFor="site-search" className="sr-only">
                Search
              </label>
              <div className="relative">
                <input
                  id="site-search"
                  name="q"
                  type="search"
                  placeholder="Search what you need:"
                  className="w-64 rounded-full border border-slate-300 bg-white/90 px-4 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-500 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:placeholder:text-slate-500"
                />
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-teal"
                  fill="none"
                >
                  <path
                    d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M16.25 16.25 21 21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </form>

            <span className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <button
              type="button"
              onClick={toggleTheme}
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-slate-400 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100/90 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800/70"
              aria-label="Toggle light and dark mode"
            >
              {theme === "dark" ? "Dark" : "Light"}
              <ThemeIcon isDark={theme === "dark"} />
            </button>
            <Link
              href="/request-demo"
              className="ml-1 inline-flex items-center justify-center rounded-full bg-slate-900 bg-gradient-to-r from-brand-blue to-brand-aqua px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-brand-deep hover:to-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
            >
              Book a demo
            </Link>
          </nav>

          <details className="relative lg:hidden">
            <summary className="focus-ring list-none rounded-full border border-slate-200/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800/70">
              Menu
            </summary>
            <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200/60 bg-white/90 p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900/90">
              <form className="px-1 pb-2" onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="site-search-mobile" className="sr-only">
                Search
              </label>
              <div className="relative">
                <input
                  id="site-search-mobile"
                  name="q"
                  type="search"
                  placeholder="Search what you need:"
                  className="w-full rounded-full border border-slate-200/60 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:placeholder:text-slate-500"
                />
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-teal"
                    fill="none"
                  >
                    <path
                      d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M16.25 16.25 21 21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </form>
              <MobileLink href="/aixcelerator">Platform</MobileLink>
              <MobileLink href="/aixcelerator/agents">Agents</MobileLink>
              <MobileLink href="/aixcelerator/mcp">MCP</MobileLink>
              <MobileLink href="/industries">Industries</MobileLink>
              <MobileLink href="/solutions">Solutions</MobileLink>
              <MobileLink href="/resources">Resources</MobileLink>
              <MobileLink href="/updates">Updates</MobileLink>
              <button
                type="button"
                onClick={toggleTheme}
                className="focus-ring mt-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70"
              >
                <span>Theme</span>
                <span className="text-xs font-semibold">{theme === "dark" ? "Dark" : "Light"}</span>
              </button>
              <div className="my-2 h-px bg-slate-200 dark:bg-slate-700" />
              <Link
                href="/request-demo"
                className="mt-1 block rounded-full bg-slate-900 bg-gradient-to-r from-brand-blue to-brand-aqua px-3 py-2 text-center text-xs font-semibold text-white shadow-sm hover:from-brand-deep hover:to-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
              >
                Book a demo
              </Link>
            </div>
          </details>
        </div>
      </header>

      <main id="main-content" className="main-offset relative w-full flex-1 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-slate-200/60 bg-white/80">
        <div className="grid w-full grid-cols-1 gap-6 px-4 py-8 text-sm text-slate-700 sm:grid-cols-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center px-1">
                <Image
                  src="/brand/colaberry-ai-logo.svg"
                  alt="Colaberry.AI"
                  width={260}
                  height={60}
                  className="h-9 w-auto"
                />
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-900">AI consulting + delivery platform for agents and MCP.</div>
            <div className="mt-3 text-xs text-slate-800">© {new Date().getFullYear()} Colaberry AI</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-900">Product</div>
            <div className="mt-2 grid gap-2">
              <FooterLink href="/aixcelerator">Platform</FooterLink>
              <FooterLink href="/aixcelerator/agents">Agents</FooterLink>
              <FooterLink href="/aixcelerator/mcp">MCP servers</FooterLink>
              <FooterLink href="/solutions">Solutions</FooterLink>
              <FooterLink href="/industries">Industries</FooterLink>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-900">Resources</div>
            <div className="mt-2 grid gap-2">
              <FooterLink href="/resources">Resources hub</FooterLink>
              <FooterLink href="/resources/podcasts">Podcasts</FooterLink>
              <FooterLink href="/resources/white-papers">White papers</FooterLink>
              <FooterLink href="/updates">News & product</FooterLink>
            </div>
          </div>
          <div className="sm:justify-self-end">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-900 sm:text-right">
              Follow
            </div>
            <div className="mt-3 flex items-center gap-3 sm:justify-end">
              <SocialIcon href="https://www.linkedin.com/company/colaberry" label="LinkedIn">
                <path
                  d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 1 0-4 0v7h-4V9h4v2.2A4.5 4.5 0 0 1 16 8Z"
                  fill="currentColor"
                />
                <rect x="2" y="9" width="4" height="12" fill="currentColor" />
                <circle cx="4" cy="4" r="2" fill="currentColor" />
              </SocialIcon>
              <SocialIcon
                href="https://www.instagram.com/colaberryinc/"
                label="Instagram"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
              </SocialIcon>
              <SocialIcon href="https://x.com/colaberryinc?lang=en" label="X">
                <path
                  d="M4 4h4.6l4 5.6L16.9 4H21l-6.6 8.6L21 20h-4.7l-4.2-5.9L7.3 20H3l7-8.9L4 4Z"
                  fill="currentColor"
                />
              </SocialIcon>
              <SocialIcon
                href="https://www.facebook.com/colaberryschoolofdataanalytics/"
                label="Facebook"
              >
                <path
                  d="M14.5 8.5h3V5h-3c-2.5 0-4.5 2-4.5 4.5V12H7v3h3v6h3.5v-6h3l.5-3h-3.5V9.5c0-.6.4-1 1-1Z"
                  fill="currentColor"
                />
              </SocialIcon>
              <SocialIcon
                href="https://www.youtube.com/channel/UCb23caPCK7xW8roOkr_iKRA"
                label="YouTube"
              >
                <path
                  d="M23 12s0-4.3-.6-5.7c-.4-1-1.2-1.8-2.2-2.2C18.8 3.5 12 3.5 12 3.5s-6.8 0-8.2.6c-1 .4-1.8 1.2-2.2 2.2C1 7.7 1 12 1 12s0 4.3.6 5.7c.4 1 1.2 1.8 2.2 2.2 1.4.6 8.2.6 8.2.6s6.8 0 8.2-.6c1-.4 1.8-1.2 2.2-2.2.6-1.4.6-5.7.6-5.7Z"
                  fill="currentColor"
                />
                <polygon points="10 8.5 16 12 10 15.5" fill="#ffffff" />
              </SocialIcon>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MobileLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="focus-ring block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70"
    >
      {children}
    </Link>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="focus-ring text-slate-900 hover:text-brand-ink dark:text-slate-300 dark:hover:text-white">
      {children}
    </Link>
  );
}

function ThemeIcon({ isDark }: { isDark: boolean }) {
  return isDark ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="social-button focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/70 bg-white/80 text-slate-500 transition hover:border-brand-blue/40 hover:text-brand-blue hover:shadow-sm"
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        {children}
      </svg>
      <span className="sr-only">{label}</span>
    </a>
  );
}
