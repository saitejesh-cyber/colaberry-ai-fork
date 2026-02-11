import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import { ReactNode, useEffect, useRef, useState } from "react";
import { fetchGlobalNavigation, GlobalNavigation } from "../lib/cms";

const fallbackNavigation: GlobalNavigation = {
  headerLinks: [
    {
      label: "Platform",
      href: "/aixcelerator",
      order: 1,
      group: "header",
      children: [
        { label: "Overview", href: "/aixcelerator", order: 1 },
        { label: "Agents", href: "/aixcelerator/agents", order: 2 },
        { label: "MCP servers", href: "/aixcelerator/mcp", order: 3 },
      ],
    },
    {
      label: "Agents",
      href: "/aixcelerator/agents",
      order: 2,
      group: "header",
      children: [{ label: "Agents catalog", href: "/aixcelerator/agents", order: 1 }],
    },
    {
      label: "MCP",
      href: "/aixcelerator/mcp",
      order: 3,
      group: "header",
      children: [{ label: "MCP servers", href: "/aixcelerator/mcp", order: 1 }],
    },
    {
      label: "Industries",
      href: "/industries",
      order: 4,
      group: "header",
      children: [{ label: "All industries", href: "/industries", order: 1 }],
    },
    {
      label: "Solutions",
      href: "/solutions",
      order: 5,
      group: "header",
      children: [{ label: "Solutions overview", href: "/solutions", order: 1 }],
    },
    {
      label: "Resources",
      href: "/resources",
      order: 6,
      group: "header",
      children: [
        { label: "Resources hub", href: "/resources", order: 1 },
        { label: "Podcasts", href: "/resources/podcasts", order: 2 },
        { label: "White papers", href: "/resources/white-papers", order: 3 },
        { label: "Books", href: "/resources/books", order: 4 },
        { label: "Case studies", href: "/resources/case-studies", order: 5 },
      ],
    },
    {
      label: "Updates",
      href: "/updates",
      order: 7,
      group: "header",
      children: [{ label: "News & product", href: "/updates", order: 1 }],
    },
  ],
  footerColumns: [
    {
      title: "Product",
      links: [
        { label: "Platform", href: "/aixcelerator", order: 1, group: "Product" },
        { label: "Agents", href: "/aixcelerator/agents", order: 2, group: "Product" },
        { label: "MCP servers", href: "/aixcelerator/mcp", order: 3, group: "Product" },
        { label: "Solutions", href: "/solutions", order: 4, group: "Product" },
        { label: "Industries", href: "/industries", order: 5, group: "Product" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Resources hub", href: "/resources", order: 1, group: "Resources" },
        { label: "Podcasts", href: "/resources/podcasts", order: 2, group: "Resources" },
        { label: "White papers", href: "/resources/white-papers", order: 3, group: "Resources" },
        { label: "News & product", href: "/updates", order: 4, group: "Resources" },
      ],
    },
  ],
  cta: { label: "Book a demo", href: "/request-demo", group: "header" },
  socialLinks: [
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/company/colaberry",
      target: "_blank",
      icon: "linkedin",
      order: 1,
      group: "social",
    },
    {
      label: "Instagram",
      href: "https://www.instagram.com/colaberryinc/",
      target: "_blank",
      icon: "instagram",
      order: 2,
      group: "social",
    },
    {
      label: "X",
      href: "https://x.com/colaberryinc?lang=en",
      target: "_blank",
      icon: "x",
      order: 3,
      group: "social",
    },
    {
      label: "Facebook",
      href: "https://www.facebook.com/colaberryschoolofdataanalytics/",
      target: "_blank",
      icon: "facebook",
      order: 4,
      group: "social",
    },
    {
      label: "YouTube",
      href: "https://www.youtube.com/channel/UCb23caPCK7xW8roOkr_iKRA",
      target: "_blank",
      icon: "youtube",
      order: 5,
      group: "social",
    },
  ],
  legalLinks: [],
};

const SOCIAL_ICON_PATHS: Record<string, ReactNode> = {
  linkedin: (
    <>
      <path
        d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 1 0-4 0v7h-4V9h4v2.2A4.5 4.5 0 0 1 16 8Z"
        fill="currentColor"
      />
      <rect x="2" y="9" width="4" height="12" fill="currentColor" />
      <circle cx="4" cy="4" r="2" fill="currentColor" />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </>
  ),
  x: (
    <path
      d="M4 4h4.6l4 5.6L16.9 4H21l-6.6 8.6L21 20h-4.7l-4.2-5.9L7.3 20H3l7-8.9L4 4Z"
      fill="currentColor"
    />
  ),
  facebook: (
    <path
      d="M14.5 8.5h3V5h-3c-2.5 0-4.5 2-4.5 4.5V12H7v3h3v6h3.5v-6h3l.5-3h-3.5V9.5c0-.6.4-1 1-1Z"
      fill="currentColor"
    />
  ),
  youtube: (
    <>
      <path
        d="M23 12s0-4.3-.6-5.7c-.4-1-1.2-1.8-2.2-2.2C18.8 3.5 12 3.5 12 3.5s-6.8 0-8.2.6c-1 .4-1.8 1.2-2.2 2.2C1 7.7 1 12 1 12s0 4.3.6 5.7c.4 1 1.2 1.8 2.2 2.2 1.4.6 8.2.6 8.2.6s6.8 0 8.2-.6c1-.4 1.8-1.2 2.2-2.2.6-1.4.6-5.7.6-5.7Z"
        fill="currentColor"
      />
      <polygon points="10 8.5 16 12 10 15.5" fill="#ffffff" />
    </>
  ),
};

const DEFAULT_SOCIAL_ICON = (
  <path
    d="M10.4 13.6a1 1 0 0 1 1.4 0l1.6 1.6a4 4 0 1 1-5.7 5.7l-1.6-1.6a1 1 0 0 1 1.4-1.4l1.6 1.6a2 2 0 1 0 2.8-2.8l-1.6-1.6a1 1 0 0 1 0-1.5Zm2.8-2.8a1 1 0 0 1 0-1.4l1.6-1.6a4 4 0 1 1 5.7 5.7l-1.6 1.6a1 1 0 0 1-1.4-1.4l1.6-1.6a2 2 0 1 0-2.8-2.8l-1.6 1.6a1 1 0 0 1-1.5 0Z"
    fill="currentColor"
  />
);

function normalizeIconKey(value?: string | null) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveSocialIcon(icon?: string | null, label?: string | null) {
  const raw = normalizeIconKey(icon) || normalizeIconKey(label);
  const normalized =
    raw === "twitter" || raw === "xcom"
      ? "x"
      : raw === "linkedin" || raw === "linked" || raw === "ln"
      ? "linkedin"
      : raw === "instagram" || raw === "ig"
      ? "instagram"
      : raw === "facebook" || raw === "fb"
      ? "facebook"
      : raw === "youtube" || raw === "yt"
      ? "youtube"
      : raw;
  return SOCIAL_ICON_PATHS[normalized] ?? DEFAULT_SOCIAL_ICON;
}

function getLinkRel(target?: string | null) {
  return target === "_blank" ? "noreferrer noopener" : undefined;
}

function mergeGlobalNavigation(primary: GlobalNavigation | null, fallback: GlobalNavigation): GlobalNavigation {
  if (!primary) return fallback;
  const fallbackHeaderIndex = new Map(
    fallback.headerLinks.map((link) => [`${link.label}|${link.href}`, link])
  );
  const headerLinks = primary.headerLinks.length
    ? primary.headerLinks.map((link) => {
        if (link.children?.length) return link;
        const fallbackLink = fallbackHeaderIndex.get(`${link.label}|${link.href}`);
        const fallbackChildren = fallbackLink?.children ?? [];
        return fallbackChildren.length ? { ...link, children: fallbackChildren } : link;
      })
    : fallback.headerLinks;

  return {
    headerLinks,
    footerColumns: primary.footerColumns.length ? primary.footerColumns : fallback.footerColumns,
    cta: primary.cta?.label && primary.cta?.href ? primary.cta : fallback.cta,
    socialLinks: primary.socialLinks.length ? primary.socialLinks : fallback.socialLinks,
    legalLinks: primary.legalLinks.length ? primary.legalLinks : fallback.legalLinks,
  };
}

export default function Layout({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [globalNav, setGlobalNav] = useState<GlobalNavigation>(fallbackNavigation);
  const [searchOpen, setSearchOpen] = useState(false);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const logoSrc = theme === "dark" ? "/brand/colaberry-ai-logo-dark.svg" : "/brand/colaberry-ai-logo.svg";

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  useEffect(() => {
    let isActive = true;
    fetchGlobalNavigation()
      .then((data) => {
        if (!isActive) return;
        setGlobalNav(mergeGlobalNavigation(data, fallbackNavigation));
      })
      .catch(() => {
        if (!isActive) return;
        setGlobalNav(fallbackNavigation);
      });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [searchOpen]);

  useEffect(() => {
    const dismissed = window.localStorage.getItem("colaberry_discovery_prompt_dismissed");
    if (dismissed) return;
    const timer = window.setTimeout(() => {
      setDiscoveryOpen(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem("theme", next);
  };
  const openSearch = () => setSearchOpen(true);
  const closeSearch = () => setSearchOpen(false);
  const dismissDiscovery = () => {
    setDiscoveryOpen(false);
    window.localStorage.setItem("colaberry_discovery_prompt_dismissed", "true");
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
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <span className="inline-flex items-center justify-center px-1">
                <Image
                  src={logoSrc}
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
            {globalNav.headerLinks.map((link) => {
              const hasChildren = !!link.children?.length;
              const dropdownSurfaceClass =
                theme === "dark"
                  ? "border-slate-700 bg-slate-950 text-slate-100"
                  : "border-slate-200/80 bg-white text-slate-900";
              const dropdownItemClass =
                theme === "dark"
                  ? "text-slate-100 hover:bg-slate-800 hover:text-white"
                  : "text-slate-900 hover:bg-slate-100 hover:text-slate-900";
              return (
                <div key={`${link.label}-${link.href}`} className="relative group">
                  <Link
                    href={link.href}
                    target={link.target ?? undefined}
                    rel={getLinkRel(link.target)}
                    className="nav-link focus-ring inline-flex items-center gap-1"
                    aria-haspopup={hasChildren ? "menu" : undefined}
                  >
                    {link.label}
                    {hasChildren ? (
                      <svg
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                        className="h-4 w-4 text-slate-400 group-hover:text-brand-ink"
                        fill="currentColor"
                      >
                        <path
                          d="M5.5 7.5 10 12l4.5-4.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    ) : null}
                  </Link>
                  {hasChildren ? (
                    <div className="absolute left-0 top-full z-50 pt-2 opacity-0 transition duration-150 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto pointer-events-none">
                      <div
                        className={`min-w-[12rem] translate-y-1 rounded-xl border p-2 shadow-xl transition duration-150 group-hover:translate-y-0 group-focus-within:translate-y-0 ${dropdownSurfaceClass}`}
                      >
                        <div className="grid gap-1">
                          {link.children?.map((child) => (
                            <Link
                              key={`${child.label}-${child.href}`}
                              href={child.href}
                              target={child.target ?? undefined}
                              rel={getLinkRel(child.target)}
                              className={`focus-ring rounded-lg px-3 py-2 text-sm font-medium ${dropdownItemClass}`}
                              role="menuitem"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            <button
              type="button"
              onClick={openSearch}
              className="btn btn-ghost btn-icon"
              aria-label="Open global search"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
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
            </button>

            <span className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-ghost btn-icon"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className="sr-only">
                {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              </span>
              <ThemeIcon isDark={theme === "dark"} />
            </button>
            {globalNav.cta ? (
              <Link
                href={globalNav.cta.href}
                target={globalNav.cta.target ?? undefined}
                rel={getLinkRel(globalNav.cta.target)}
                className="btn btn-primary btn-sm ml-1"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <path
                    d="M7 3v2M17 3v2M4 8h16M6 6h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8.5 12.5h3M8.5 16h6.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <span>{globalNav.cta.label}</span>
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={openSearch}
              className="btn btn-ghost btn-icon"
              aria-label="Open global search"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
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
            </button>

            <details className="relative lg:hidden">
              <summary className="focus-ring list-none rounded-full border border-slate-200/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800/70">
                Menu
              </summary>
              <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200/60 bg-white/90 p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900/90">
                {globalNav.headerLinks.map((link) => {
                  const hasChildren = !!link.children?.length;
                  return (
                    <div key={`${link.label}-${link.href}`}>
                      <MobileLink href={link.href} target={link.target}>
                        {link.label}
                      </MobileLink>
                      {hasChildren ? (
                        <div className="ml-3 grid gap-1">
                          {link.children?.map((child) => (
                            <MobileLink
                              key={`${child.label}-${child.href}`}
                              href={child.href}
                              target={child.target}
                              className="text-xs text-slate-600 dark:text-slate-300"
                            >
                              {child.label}
                            </MobileLink>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="btn btn-ghost btn-sm mt-2 w-full"
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  <span className="sr-only">
                    {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  </span>
                  <ThemeIcon isDark={theme === "dark"} />
                </button>
                <div className="my-2 h-px bg-slate-200 dark:bg-slate-700" />
                {globalNav.cta ? (
                  <Link
                    href={globalNav.cta.href}
                    target={globalNav.cta.target ?? undefined}
                    rel={getLinkRel(globalNav.cta.target)}
                  className="btn btn-primary btn-sm mt-1 w-full"
                >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                      <path
                        d="M7 3v2M17 3v2M4 8h16M6 6h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <path
                        d="M8.5 12.5h3M8.5 16h6.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>{globalNav.cta.label}</span>
                  </Link>
                ) : null}
              </div>
            </details>
          </div>
        </div>
      </header>

      <main id="main-content" className="main-offset relative w-full flex-1 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-slate-200/60 bg-white/90 dark:border-slate-800/60 dark:bg-slate-950/70">
        <div className="grid w-full grid-cols-1 gap-6 px-4 py-8 text-sm text-slate-800 dark:text-slate-200 sm:grid-cols-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center px-1">
                <Image
                  src={logoSrc}
                  alt="Colaberry.AI"
                  width={260}
                  height={60}
                  className="h-9 w-auto"
                />
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">AI consulting + delivery platform for agents and MCP.</div>
            <div className="mt-3 text-xs text-slate-800 dark:text-slate-300">© {new Date().getFullYear()} Colaberry AI</div>
          </div>
          {globalNav.footerColumns.map((column, index) => (
            <div key={`${column.title}-${index}`}>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                {column.title}
              </div>
              <div className="mt-2 grid gap-2">
                {column.links.map((link) => (
                  <div key={`${link.label}-${link.href}`}>
                    <FooterLink href={link.href} target={link.target}>
                      {link.label}
                    </FooterLink>
                    {link.children?.length ? (
                      <div className="ml-3 mt-1 grid gap-1">
                        {link.children.map((child) => (
                          <FooterLink
                            key={`${child.label}-${child.href}`}
                            href={child.href}
                            target={child.target}
                            className="text-xs font-medium"
                          >
                            {child.label}
                          </FooterLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="sm:justify-self-end">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100 sm:text-right">
              Follow
            </div>
            <div className="mt-3 flex items-center gap-3 sm:justify-end">
              {globalNav.socialLinks.map((link) => (
                <SocialIcon
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  target={link.target}
                />
              ))}
            </div>
          </div>
        </div>
        {globalNav.legalLinks.length > 0 ? (
          <div className="border-t border-slate-200/60 px-4 py-4 text-xs text-slate-600 dark:border-slate-800/60 dark:text-slate-300 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-4">
              {globalNav.legalLinks.map((link) => (
                <FooterLink
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  target={link.target}
                  className="text-xs font-medium"
                >
                  {link.label}
                </FooterLink>
              ))}
            </div>
          </div>
        ) : null}
      </footer>
      {searchOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
          onClick={closeSearch}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-search-title"
            className="w-full max-w-2xl rounded-3xl border border-slate-200/70 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Global search
                </div>
                <h2 id="global-search-title" className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                  Search the Colaberry catalog
                </h2>
              </div>
              <button
                type="button"
                onClick={closeSearch}
                className="btn btn-ghost btn-icon"
                aria-label="Close search"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path
                    d="M6 6 18 18M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <form action="/search" method="get" role="search" className="mt-5">
              <label htmlFor="global-search-input" className="sr-only">
                Search
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    id="global-search-input"
                    name="q"
                    type="search"
                    placeholder="Search agents, MCP servers, resources, updates..."
                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 placeholder:text-slate-500 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
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
                  </span>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Search
                </button>
              </div>
            </form>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Agents catalog", href: "/aixcelerator/agents" },
                { label: "MCP servers", href: "/aixcelerator/mcp" },
                { label: "Solutions overview", href: "/solutions" },
                { label: "Resources hub", href: "/resources" },
                { label: "Industry playbooks", href: "/industries" },
                { label: "News & updates", href: "/updates" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="focus-ring rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-blue/30 hover:text-brand-blue dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {discoveryOpen ? (
        <div className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-6">
          <div className="surface-panel border border-slate-200/70 bg-white/95 p-4 shadow-xl dark:border-slate-700 dark:bg-slate-950/90">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Quick start
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  Explore the enterprise catalog
                </div>
              </div>
              <button
                type="button"
                onClick={dismissDiscovery}
                className="btn btn-ghost btn-icon"
                aria-label="Dismiss"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <path
                    d="M6 6 18 18M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Jump straight into the catalog or explore validated MCP infrastructure and resources.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                { label: "Agents catalog", href: "/aixcelerator/agents" },
                { label: "MCP servers", href: "/aixcelerator/mcp" },
                { label: "Resources hub", href: "/resources" },
                { label: "Industry playbooks", href: "/industries" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="focus-ring rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-blue/30 hover:text-brand-blue dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileLink({
  href,
  target,
  className,
  children,
}: {
  href: string;
  target?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const classes = [
    "focus-ring",
    "block",
    "rounded-lg",
    "px-3",
    "py-2",
    "text-sm",
    "text-slate-700",
    "hover:bg-slate-50",
    "dark:text-slate-200",
    "dark:hover:bg-slate-800/70",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Link
      href={href}
      target={target ?? undefined}
      rel={getLinkRel(target)}
      className={classes}
    >
      {children}
    </Link>
  );
}

function FooterLink({
  href,
  target,
  className,
  children,
}: {
  href: string;
  target?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const classes = ["footer-link", "focus-ring", "hover:underline", "underline-offset-4", className ?? "font-semibold"]
    .filter(Boolean)
    .join(" ");
  return (
    <Link
      href={href}
      target={target ?? undefined}
      rel={getLinkRel(target)}
      className={classes}
    >
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
  icon,
  target,
}: {
  href: string;
  label: string;
  icon?: string | null;
  target?: string | null;
}) {
  const iconMarkup = resolveSocialIcon(icon, label);
  const linkTarget = target ?? "_blank";
  return (
    <a
      href={href}
      target={linkTarget}
      rel={getLinkRel(linkTarget)}
      className="social-button focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/70 bg-white/80 text-slate-500 transition hover:border-brand-blue/40 hover:text-brand-blue hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-brand-teal/50 dark:hover:text-white"
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        {iconMarkup}
      </svg>
      <span className="sr-only">{label}</span>
    </a>
  );
}
