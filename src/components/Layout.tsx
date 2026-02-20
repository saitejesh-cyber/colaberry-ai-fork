import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/router";
import { fetchGlobalNavigation, GlobalNavigation } from "../lib/cms";
import NewsletterSignup from "./NewsletterSignup";
import CookieConsentBanner from "./CookieConsentBanner";
import DemoRequestWizardModal from "./DemoRequestWizardModal";

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
        { label: "Skills", href: "/aixcelerator/skills", order: 4 },
        { label: "Use cases", href: "/use-cases", order: 5 },
        { label: "Discovery assistant", href: "/assistant", order: 6 },
      ],
    },
    {
      label: "Industries",
      href: "/industries",
      order: 2,
      group: "header",
      children: [{ label: "All industries", href: "/industries", order: 1 }],
    },
    {
      label: "Solutions",
      href: "/solutions",
      order: 3,
      group: "header",
      children: [{ label: "Solutions overview", href: "/solutions", order: 1 }],
    },
    {
      label: "Resources",
      href: "/resources",
      order: 4,
      group: "header",
      children: [
        { label: "Resources hub", href: "/resources", order: 1 },
        { label: "Podcasts", href: "/resources/podcasts", order: 2 },
        { label: "White papers", href: "/resources/white-papers", order: 3 },
        { label: "Articles", href: "/resources/articles", order: 4 },
        { label: "Books", href: "/resources/books", order: 5 },
        { label: "Case studies", href: "/resources/case-studies", order: 6 },
      ],
    },
    {
      label: "Updates",
      href: "/updates",
      order: 5,
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
        { label: "Skills", href: "/aixcelerator/skills", order: 4, group: "Product" },
        { label: "Discovery assistant", href: "/assistant", order: 5, group: "Product" },
        { label: "Solutions", href: "/solutions", order: 6, group: "Product" },
        { label: "Use cases", href: "/use-cases", order: 7, group: "Product" },
        { label: "Industries", href: "/industries", order: 8, group: "Product" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Resources hub", href: "/resources", order: 1, group: "Resources" },
        { label: "Podcasts", href: "/resources/podcasts", order: 2, group: "Resources" },
        { label: "White papers", href: "/resources/white-papers", order: 3, group: "Resources" },
        { label: "Articles", href: "/resources/articles", order: 4, group: "Resources" },
        { label: "News & product", href: "/updates", order: 5, group: "Resources" },
      ],
    },
  ],
  cta: { label: "Request a demo", href: "/request-demo", group: "header" },
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
  legalLinks: [
    { label: "Privacy Policy", href: "/privacy-policy", order: 1, group: "legal" },
    { label: "Cookie Policy", href: "/cookie-policy", order: 2, group: "legal" },
  ],
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

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function normalizePath(path: string) {
  if (!path) return "/";
  if (isExternalHref(path)) return path;
  const [pathname] = path.split(/[?#]/);
  const clean = pathname || "/";
  if (clean.length > 1 && clean.endsWith("/")) return clean.slice(0, -1);
  return clean;
}

function isActiveNavPath(currentPath: string, href: string, navPaths: string[]) {
  if (!href || isExternalHref(href)) return false;
  const linkPath = normalizePath(href);
  if (currentPath === linkPath) return true;
  if (linkPath === "/") return currentPath === "/";
  if (!currentPath.startsWith(`${linkPath}/`)) return false;

  const hasMoreSpecific = navPaths.some((candidate) => {
    if (candidate.length <= linkPath.length) return false;
    return currentPath === candidate || currentPath.startsWith(`${candidate}/`);
  });
  return !hasMoreSpecific;
}

const PLATFORM_CHILD_BLUEPRINT = [
  { label: "Overview", href: "/aixcelerator" },
  { label: "Agents", href: "/aixcelerator/agents" },
  { label: "MCP servers", href: "/aixcelerator/mcp" },
  { label: "Skills", href: "/aixcelerator/skills" },
  { label: "Use cases", href: "/use-cases" },
  { label: "Discovery assistant", href: "/assistant" },
];

const PLATFORM_CHILD_ALIASES: Record<string, string> = {
  agents: "/aixcelerator/agents",
  mcp: "/aixcelerator/mcp",
  "mcp servers": "/aixcelerator/mcp",
  "mcp server": "/aixcelerator/mcp",
  skills: "/aixcelerator/skills",
  skill: "/aixcelerator/skills",
  "use cases": "/use-cases",
  "use case": "/use-cases",
  "discovery assistant": "/assistant",
};

function findPlatformChildBlueprint(link: GlobalNavigation["headerLinks"][number]) {
  const normalizedPath = normalizePath(link.href);
  const byPath = PLATFORM_CHILD_BLUEPRINT.find((entry) => normalizePath(entry.href) === normalizedPath);
  if (byPath) return byPath;

  const labelKey = link.label.trim().toLowerCase();
  const aliasPath = PLATFORM_CHILD_ALIASES[labelKey];
  if (!aliasPath) return null;
  return PLATFORM_CHILD_BLUEPRINT.find((entry) => normalizePath(entry.href) === normalizePath(aliasPath)) || null;
}

function isPlatformLink(link: GlobalNavigation["headerLinks"][number]) {
  const label = link.label.trim().toLowerCase();
  return label === "platform" || normalizePath(link.href) === "/aixcelerator";
}

function normalizeHeaderNavigation(headerLinks: GlobalNavigation["headerLinks"]) {
  if (!headerLinks.length) return headerLinks;

  const platformIndex = headerLinks.findIndex(isPlatformLink);
  if (platformIndex < 0) return headerLinks;

  const platformLink = headerLinks[platformIndex];
  const collectedChildren = new Map<string, GlobalNavigation["headerLinks"][number]>();
  const upsertPlatformChild = (entry: GlobalNavigation["headerLinks"][number]) => {
    const matchedBlueprint = findPlatformChildBlueprint(entry);
    if (!matchedBlueprint) return;
    const path = normalizePath(matchedBlueprint.href);
    if (!collectedChildren.has(path)) {
      collectedChildren.set(path, {
        ...entry,
        label: matchedBlueprint.label,
        href: matchedBlueprint.href,
      });
    }
  };

  (platformLink.children || []).forEach((child) => upsertPlatformChild(child));

  const nextHeaderLinks = headerLinks
    .filter((link, index) => {
      if (index === platformIndex) return false;
      if (findPlatformChildBlueprint(link)) {
        upsertPlatformChild({
          label: link.label,
          href: link.href,
          target: link.target,
          order: link.order,
          group: link.group,
        });
        (link.children || []).forEach((child) => upsertPlatformChild(child));
        return false;
      }
      return true;
    })
    .map((link) => {
      if (link.label.trim().toLowerCase() !== "solutions" || !link.children?.length) {
        return link;
      }
      const children = link.children.filter((child) => normalizePath(child.href) !== "/use-cases");
      return children.length === link.children.length ? link : { ...link, children };
    });

  PLATFORM_CHILD_BLUEPRINT.forEach((entry) => {
    if (!collectedChildren.has(normalizePath(entry.href))) {
      collectedChildren.set(normalizePath(entry.href), {
        label: entry.label,
        href: entry.href,
      });
    }
  });

  const normalizedPlatformChildren = PLATFORM_CHILD_BLUEPRINT.map((entry, index) => {
    const matched = collectedChildren.get(normalizePath(entry.href));
    return {
      ...matched,
      label: matched?.label || entry.label,
      href: matched?.href || entry.href,
      order: index + 1,
    };
  });

  const normalizedPlatform = {
    ...platformLink,
    label: "Platform",
    href: "/aixcelerator",
    children: normalizedPlatformChildren,
  };

  const insertAt = Math.min(platformIndex, nextHeaderLinks.length);
  nextHeaderLinks.splice(insertAt, 0, normalizedPlatform);
  return nextHeaderLinks;
}

function getRequestDemoLabel(label: string) {
  if (/book a demo/i.test(label)) return "Request a demo";
  return label;
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
  const normalizedHeaderLinks = normalizeHeaderNavigation(headerLinks);

  return {
    headerLinks: normalizedHeaderLinks,
    footerColumns: primary.footerColumns.length ? primary.footerColumns : fallback.footerColumns,
    cta: primary.cta?.label && primary.cta?.href ? primary.cta : fallback.cta,
    socialLinks: primary.socialLinks.length ? primary.socialLinks : fallback.socialLinks,
    legalLinks: primary.legalLinks.length ? primary.legalLinks : fallback.legalLinks,
  };
}

type WorkspaceLink = {
  label: string;
  href: string;
  target?: string | null;
};

type WorkspaceSection = {
  title: string;
  links: WorkspaceLink[];
};

function dedupeWorkspaceLinks(links: WorkspaceLink[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${normalizePath(link.href)}|${link.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getHeaderLinkByLabel(nav: GlobalNavigation, label: string) {
  const target = label.trim().toLowerCase();
  return nav.headerLinks.find((link) => link.label.trim().toLowerCase() === target);
}

function buildWorkspaceSections(nav: GlobalNavigation): WorkspaceSection[] {
  const platformLink = nav.headerLinks.find(isPlatformLink) || fallbackNavigation.headerLinks[0];
  const resourcesLink =
    getHeaderLinkByLabel(nav, "resources") || getHeaderLinkByLabel(fallbackNavigation, "resources");
  const updatesLink =
    getHeaderLinkByLabel(nav, "updates") || getHeaderLinkByLabel(fallbackNavigation, "updates");
  const industriesLink =
    getHeaderLinkByLabel(nav, "industries") || getHeaderLinkByLabel(fallbackNavigation, "industries");
  const solutionsLink =
    getHeaderLinkByLabel(nav, "solutions") || getHeaderLinkByLabel(fallbackNavigation, "solutions");

  const platformChildren = (platformLink.children || []).map((child) => ({
    label: child.label,
    href: child.href,
    target: child.target,
  }));
  const platformSectionLinks = dedupeWorkspaceLinks([
    { label: "Overview", href: platformLink.href, target: platformLink.target },
    ...platformChildren,
  ]).filter((link) => normalizePath(link.href) !== "/assistant");

  const resourceChildren = (resourcesLink?.children || []).filter((child) =>
    ["podcasts", "white papers", "articles", "books", "case studies", "resources hub"].includes(
      child.label.trim().toLowerCase()
    )
  );
  const catalogLinks = dedupeWorkspaceLinks([
    { label: "Search catalog", href: "/search" },
    { label: "Discovery assistant", href: "/assistant" },
    ...resourceChildren.map((child) => ({ label: child.label, href: child.href, target: child.target })),
    updatesLink ? { label: "News & product", href: updatesLink.href, target: updatesLink.target } : null,
  ].filter(Boolean) as WorkspaceLink[]);

  const exploreLinks = dedupeWorkspaceLinks([
    industriesLink ? { label: "Industries", href: industriesLink.href, target: industriesLink.target } : null,
    solutionsLink ? { label: "Solutions", href: solutionsLink.href, target: solutionsLink.target } : null,
    resourcesLink ? { label: "Resources", href: resourcesLink.href, target: resourcesLink.target } : null,
  ].filter(Boolean) as WorkspaceLink[]);

  return [
    { title: "Platform", links: platformSectionLinks },
    { title: "Catalog", links: catalogLinks },
    { title: "Explore", links: exploreLinks },
  ].filter((section) => section.links.length > 0);
}

function isCatalogWorkspacePath(path: string) {
  return (
    path === "/assistant" ||
    path.startsWith("/assistant/") ||
    path === "/aixcelerator" ||
    path.startsWith("/aixcelerator/") ||
    path === "/use-cases" ||
    path.startsWith("/use-cases/") ||
    path === "/search"
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hasMounted, setHasMounted] = useState(false);
  const [globalNav, setGlobalNav] = useState<GlobalNavigation>(fallbackNavigation);
  const [searchOpen, setSearchOpen] = useState(false);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workspaceRailCollapsed, setWorkspaceRailCollapsed] = useState(false);
  const [workspaceMobileRailOpen, setWorkspaceMobileRailOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [allowBackdropClose, setAllowBackdropClose] = useState(true);
  const [demoWizardOpen, setDemoWizardOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const currentPath = normalizePath(router.asPath || "/");
  const isCatalogWorkspace = isCatalogWorkspacePath(currentPath);
  const headerNavPaths = globalNav.headerLinks
    .map((link) => normalizePath(link.href))
    .filter((href) => !isExternalHref(href));
  const workspaceSections = useMemo(() => buildWorkspaceSections(globalNav), [globalNav]);
  const workspaceNavPaths = useMemo(
    () =>
      workspaceSections
        .flatMap((section) => section.links)
        .map((link) => normalizePath(link.href))
        .filter((href) => !isExternalHref(href)),
    [workspaceSections]
  );
  const workspaceGridStyle = useMemo(
    () =>
      ({
        "--workspace-rail-width": workspaceRailCollapsed ? "5.5rem" : "17rem",
      } as CSSProperties),
    [workspaceRailCollapsed]
  );

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      const storedTheme = window.localStorage.getItem("theme");
      const resolvedTheme = storedTheme === "dark" ? "dark" : "light";
      setTheme(resolvedTheme);
      setHasMounted(true);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(pointer: coarse)");
    const handleChange = () => setAllowBackdropClose(!media.matches);
    handleChange();
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
    } else {
      media.addListener(handleChange);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", handleChange);
      } else {
        media.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [hasMounted, theme]);

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
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
      if (event.key === "Tab") {
        const dialog = searchDialogRef.current;
        if (!dialog) return;
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("aria-hidden"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const backgroundNodes = [
      document.querySelector("header"),
      document.querySelector("main"),
      document.querySelector("footer"),
    ].filter(Boolean) as HTMLElement[];
    backgroundNodes.forEach((node) => {
      node.setAttribute("aria-hidden", "true");
      node.setAttribute("inert", "");
    });
    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      backgroundNodes.forEach((node) => {
        node.removeAttribute("aria-hidden");
        node.removeAttribute("inert");
      });
      previousFocusRef.current?.focus();
      window.clearTimeout(focusTimer);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!workspaceMobileRailOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setWorkspaceMobileRailOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [workspaceMobileRailOpen]);

  useEffect(() => {
    if (!isCatalogWorkspace) return;
    const dismissed = window.localStorage.getItem("colaberry_discovery_prompt_dismissed");
    if (dismissed) return;
    const timer = window.setTimeout(() => {
      setDiscoveryOpen(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [isCatalogWorkspace]);

  useEffect(() => {
    const handleRouteChangeStart = () => {
      setMobileMenuOpen(false);
      setWorkspaceMobileRailOpen(false);
      setSearchOpen(false);
      setDiscoveryOpen(false);
    };
    router.events.on("routeChangeStart", handleRouteChangeStart);
    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
    };
  }, [router.events]);

  const toggleTheme = () => {
    setTheme((previous) => (previous === "dark" ? "light" : "dark"));
  };
  const isDarkMode = hasMounted ? theme === "dark" : false;
  const themeToggleLabel = hasMounted
    ? isDarkMode
      ? "Switch to light mode"
      : "Switch to dark mode"
    : "Toggle color mode";
  const openSearch = () => {
    setMobileMenuOpen(false);
    setSearchOpen(true);
  };
  const closeSearch = () => setSearchOpen(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const openMobileMenu = () => {
    setSearchOpen(false);
    setWorkspaceMobileRailOpen(false);
    setMobileMenuOpen(true);
  };
  const dismissDiscovery = () => {
    setDiscoveryOpen(false);
    window.localStorage.setItem("colaberry_discovery_prompt_dismissed", "true");
  };
  const handleDemoCtaClick = (event: ReactMouseEvent<HTMLElement>, href?: string | null) => {
    if (normalizePath(href || "") !== "/request-demo") return;
    if (currentPath === "/request-demo") return;
    event.preventDefault();
    setDemoWizardOpen(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.dataset.demoModal === "off") return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (normalizePath(url.pathname) !== "/request-demo") return;
      if (url.searchParams.get("wizard") === "off" || url.searchParams.get("modal") === "off") return;
      if (currentPath === "/request-demo") return;

      event.preventDefault();
      setMobileMenuOpen(false);
      setDemoWizardOpen(true);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [currentPath]);

  const desktopHeaderItems = globalNav.headerLinks.map((link) => {
    const hasChildren = !!link.children?.length;
    const isParentActive = isActiveNavPath(currentPath, link.href, headerNavPaths);
    const childNavPaths = (link.children || [])
      .map((child) => normalizePath(child.href))
      .filter((href) => !isExternalHref(href));
    const dropdownSurfaceClass =
      "border-slate-200/80 bg-white/95 text-slate-900 dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100";
    const menuKey = `${link.label}-${link.href}`;
    const isOpen = openMenu === menuKey;
    return (
      <div
        key={menuKey}
        className="relative group"
        onMouseEnter={() => setOpenMenu(menuKey)}
        onMouseLeave={() => setOpenMenu((current) => (current === menuKey ? null : current))}
        onFocusCapture={() => setOpenMenu(menuKey)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setOpenMenu((current) => (current === menuKey ? null : current));
          }
        }}
      >
        <Link
          href={link.href}
          target={link.target ?? undefined}
          rel={getLinkRel(link.target)}
          className={`nav-link focus-ring inline-flex items-center gap-1.5 ${isParentActive ? "nav-link-active" : ""}`}
          aria-haspopup={hasChildren ? "menu" : undefined}
          aria-expanded={hasChildren ? isOpen : undefined}
        >
          {link.label}
          {hasChildren ? (
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-y-[1px] group-hover:text-brand-ink"
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
          <div
            className={`absolute left-0 top-full z-50 pt-3 transition duration-150 ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <div
              className={`nav-dropdown-panel min-w-[14rem] rounded-2xl border p-2.5 shadow-xl transition duration-150 ${isOpen ? "translate-y-0" : "translate-y-1"} ${dropdownSurfaceClass}`}
              role="menu"
              aria-label={`${link.label} menu`}
            >
              <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">
                Explore {link.label}
              </div>
              <div className="grid gap-1">
                {link.children?.map((child) => {
                  const isChildActive = isActiveNavPath(currentPath, child.href, childNavPaths);
                  return (
                    <Link
                      key={`${child.label}-${child.href}`}
                      href={child.href}
                      target={child.target ?? undefined}
                      rel={getLinkRel(child.target)}
                      className={`nav-dropdown-link focus-ring flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium ${isChildActive ? "nav-dropdown-link-active" : ""}`}
                      role="menuitem"
                    >
                      <span>{child.label}</span>
                      <span className="text-slate-400">→</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  });

  return (
    <div className="flex min-h-dvh flex-col bg-transparent text-slate-900">
      <Head>
        <link rel="preconnect" href="https://www.buzzsprout.com" />
        <link rel="dns-prefetch" href="https://www.buzzsprout.com" />
      </Head>
      <a href="#main-content" className="skip-link focus-ring">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/82 dark:border-slate-800/70 dark:bg-slate-950/80">
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
                  className="brand-logo-light h-8 w-auto sm:h-9 lg:h-10"
                />
                <Image
                  src="/brand/colaberry-ai-logo-dark.svg"
                  alt="Colaberry.AI"
                  width={260}
                  height={60}
                  priority
                  className="brand-logo-dark h-8 w-auto sm:h-9 lg:h-10"
                />
              </span>
              <div className="hidden leading-tight sm:block">
                <div className="text-sm font-semibold text-brand-ink">AI Platform</div>
                <div className="text-xs text-slate-700">Consulting • AIXcelerator • Labs</div>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-1.5 text-sm lg:flex">
            {isCatalogWorkspace ? (
              <>
                <button
                  type="button"
                  onClick={() => setWorkspaceRailCollapsed((current) => !current)}
                  className="btn btn-secondary btn-sm"
                  aria-label={workspaceRailCollapsed ? "Expand catalog menu" : "Collapse catalog menu"}
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                    <path
                      d="M4 5h12M4 10h12M4 15h12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>{workspaceRailCollapsed ? "Expand menu" : "Collapse menu"}</span>
                </button>
                <Link href="/assistant" className="btn btn-ghost btn-sm">
                  Assistant
                </Link>
                <span className="hidden rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 2xl:inline-flex dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300">
                  Catalog workspace
                </span>
                <div className="hidden h-6 w-px bg-slate-200/80 xl:block dark:bg-slate-700/80" />
                <div className="hidden items-center gap-1.5 xl:flex">{desktopHeaderItems}</div>
              </>
            ) : (
              desktopHeaderItems
            )}

            <div className="ml-2 flex items-center gap-2 border-l border-slate-200/80 pl-3 dark:border-slate-700/80">
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

              <button
                type="button"
                onClick={toggleTheme}
                className="btn btn-ghost btn-icon"
                aria-label={themeToggleLabel}
              >
                <span className="sr-only">{themeToggleLabel}</span>
                <ThemeIcon isDark={isDarkMode} />
              </button>
            </div>
            {globalNav.cta ? (
              <Link
                href={globalNav.cta.href}
                target={globalNav.cta.target ?? undefined}
                rel={getLinkRel(globalNav.cta.target)}
                className="btn btn-primary ml-1 h-10 px-4 text-sm"
                onClick={(event) => handleDemoCtaClick(event, globalNav.cta?.href)}
              >
                <span>{getRequestDemoLabel(globalNav.cta.label)}</span>
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-1.5 lg:hidden">
            {isCatalogWorkspace ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setWorkspaceMobileRailOpen(true);
                }}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white/85 px-3 text-sm font-semibold text-slate-700 hover:border-brand-blue/35 hover:text-brand-deep dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                aria-label="Open catalog sidebar"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span>Catalog</span>
              </button>
            ) : null}
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
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-ghost btn-icon"
              aria-label={themeToggleLabel}
            >
              <span className="sr-only">{themeToggleLabel}</span>
              <ThemeIcon isDark={isDarkMode} />
            </button>
            {!isCatalogWorkspace ? (
              <button
                type="button"
                onClick={openMobileMenu}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white/85 px-3 text-sm font-semibold text-slate-700 hover:border-brand-blue/35 hover:text-brand-deep dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                aria-label="Open navigation menu"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span>Menu</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>
      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-[55] bg-slate-950/45 backdrop-blur-sm lg:hidden"
          onClick={closeMobileMenu}
        >
          <aside
            className="absolute right-0 top-0 flex h-full w-[min(92vw,380px)] flex-col border-l border-slate-200/70 bg-white/95 p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-950/95"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">
                  Navigation
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                  Explore Colaberry AI
                </div>
              </div>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="btn btn-ghost btn-icon"
                aria-label="Close navigation menu"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pb-3">
              <div className="grid gap-2">
                {globalNav.headerLinks.map((link) => {
                  const hasChildren = !!link.children?.length;
                  const isParentActive = isActiveNavPath(currentPath, link.href, headerNavPaths);
                  const childNavPaths = (link.children || [])
                    .map((child) => normalizePath(child.href))
                    .filter((href) => !isExternalHref(href));

                  return (
                    <div
                      key={`${link.label}-${link.href}`}
                      className="rounded-2xl border border-slate-200/80 bg-white/90 p-1 dark:border-slate-700/80 dark:bg-slate-900/70"
                    >
                      <MobileLink
                        href={link.href}
                        target={link.target}
                        active={isParentActive}
                        onClick={closeMobileMenu}
                        className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold"
                      >
                        <span>{link.label}</span>
                        {hasChildren ? <span className="text-slate-400">→</span> : null}
                      </MobileLink>
                      {hasChildren ? (
                        <div className="mx-3 mb-2 mt-1 grid gap-1 border-l border-slate-200/80 pl-3 dark:border-slate-700/80">
                          {link.children?.map((child) => (
                            <MobileLink
                              key={`${child.label}-${child.href}`}
                              href={child.href}
                              target={child.target}
                              active={isActiveNavPath(currentPath, child.href, childNavPaths)}
                              onClick={closeMobileMenu}
                              className="text-xs font-medium text-slate-600 dark:text-slate-300"
                            >
                              {child.label}
                            </MobileLink>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 dark:border-slate-700/80 dark:bg-slate-900/70">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">
                Preferences
              </div>
              <Link
                href="/assistant"
                className="btn btn-secondary btn-sm mt-2 w-full justify-center"
                onClick={closeMobileMenu}
              >
                Discovery assistant
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                className="btn btn-ghost btn-sm mt-2 w-full justify-center"
                aria-label={themeToggleLabel}
              >
                <ThemeIcon isDark={isDarkMode} />
                <span>Toggle color mode</span>
              </button>
              {globalNav.cta ? (
                <Link
                  href={globalNav.cta.href}
                  target={globalNav.cta.target ?? undefined}
                  rel={getLinkRel(globalNav.cta.target)}
                  className="btn btn-primary mt-2 h-10 w-full justify-center text-sm"
                  onClick={(event) => {
                    closeMobileMenu();
                    handleDemoCtaClick(event, globalNav.cta?.href);
                  }}
                >
                  <span>{getRequestDemoLabel(globalNav.cta.label)}</span>
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {isCatalogWorkspace && workspaceMobileRailOpen ? (
        <div
          className="fixed inset-0 z-[58] bg-slate-950/45 backdrop-blur-sm lg:hidden"
          onClick={() => setWorkspaceMobileRailOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 flex h-full w-[min(88vw,340px)] flex-col border-r border-slate-200/70 bg-white/95 p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-950/95"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                  Catalog menu
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                  Aixcelerator workspace
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWorkspaceMobileRailOpen(false)}
                className="btn btn-ghost btn-icon"
                aria-label="Close catalog sidebar"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto">
              {workspaceSections.map((section) => (
                <div key={section.title} className="mb-4">
                  <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                    {section.title}
                  </div>
                  <div className="mt-2 grid gap-1">
                    {section.links.map((link) => {
                      const isActive = isActiveNavPath(currentPath, link.href, workspaceNavPaths);
                      return (
                        <MobileLink
                          key={`${section.title}-${link.label}-${link.href}`}
                          href={link.href}
                          target={link.target}
                          active={isActive}
                          onClick={() => setWorkspaceMobileRailOpen(false)}
                          className="text-sm font-semibold"
                        >
                          {link.label}
                        </MobileLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/assistant"
              className="btn btn-secondary btn-sm mt-2 w-full justify-center"
              onClick={() => setWorkspaceMobileRailOpen(false)}
            >
              Open assistant
            </Link>
          </aside>
        </div>
      ) : null}

      {isCatalogWorkspace ? (
        <div className="w-full flex-1 lg:grid lg:grid-cols-[var(--workspace-rail-width)_minmax(0,1fr)] lg:gap-6 lg:px-8" style={workspaceGridStyle}>
          <aside className="hidden lg:block">
            <div className="main-offset sticky top-0 h-screen pb-6">
              <div className="surface-panel h-full overflow-y-auto p-3">
                {workspaceSections.map((section) => (
                  <div key={section.title} className="mb-4">
                    <div className={`px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300 ${workspaceRailCollapsed ? "text-center" : ""}`}>
                      {workspaceRailCollapsed ? section.title.charAt(0) : section.title}
                    </div>
                    <div className="mt-2 grid gap-1">
                      {section.links.map((link) => {
                        const isActive = isActiveNavPath(currentPath, link.href, workspaceNavPaths);
                        return (
                          <Link
                            key={`${section.title}-${link.label}-${link.href}`}
                            href={link.href}
                            target={link.target ?? undefined}
                            rel={getLinkRel(link.target)}
                            title={workspaceRailCollapsed ? link.label : undefined}
                            className={`focus-ring flex items-center gap-2 rounded-xl border px-2.5 py-2 text-sm font-semibold transition ${
                              isActive
                                ? "border-brand-blue/40 bg-brand-blue/10 text-brand-deep dark:border-sky-300/55 dark:bg-sky-900/35 dark:text-sky-100"
                                : "border-slate-200/70 bg-white/80 text-slate-700 hover:border-brand-blue/35 hover:text-brand-deep dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-200 dark:hover:border-sky-300/45 dark:hover:text-sky-100"
                            } ${workspaceRailCollapsed ? "justify-center" : ""}`}
                          >
                            <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${isActive ? "border-brand-blue/45 bg-white/90 text-brand-deep dark:border-sky-200/60 dark:bg-slate-900/85 dark:text-sky-100" : "border-slate-200/80 bg-white/90 text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"}`}>
                              {link.label
                                .split(" ")
                                .map((token) => token[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                            {!workspaceRailCollapsed ? <span className="line-clamp-1">{link.label}</span> : null}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
          <main id="main-content" className="main-offset relative min-w-0 px-4 sm:px-6 lg:px-0">
            {children}
          </main>
        </div>
      ) : (
        <main id="main-content" className="main-offset relative w-full flex-1 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      )}

      <footer className="footer-surface mt-10 border-t border-slate-200/70 dark:border-slate-800/70">
        <div className="grid w-full grid-cols-1 gap-8 px-4 py-10 text-sm text-slate-800 dark:text-slate-200 sm:px-6 lg:grid-cols-[1.35fr_1fr_1fr_auto] lg:px-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/25 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep dark:border-brand-teal/30 dark:bg-slate-900/70">
              Enterprise AI destination
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center px-1">
                <Image
                  src="/brand/colaberry-ai-logo.svg"
                  alt="Colaberry.AI"
                  width={260}
                  height={60}
                  className="brand-logo-light h-9 w-auto"
                />
                <Image
                  src="/brand/colaberry-ai-logo-dark.svg"
                  alt="Colaberry.AI"
                  width={260}
                  height={60}
                  className="brand-logo-dark h-9 w-auto"
                />
              </span>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              AI consulting and delivery platform for discoverable agents, MCP servers, and trusted knowledge assets.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/request-demo" className="btn btn-primary btn-compact">
                Request a demo
              </Link>
              <Link href="/aixcelerator" className="btn btn-secondary btn-compact">
                Explore platform
              </Link>
            </div>
            <div className="pt-1 text-xs text-slate-700 dark:text-slate-300">© {new Date().getFullYear()} Colaberry AI</div>
          </div>

          {globalNav.footerColumns.map((column, index) => (
            <div key={`${column.title}-${index}`}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-900 dark:text-slate-100">
                {column.title}
              </div>
              <div className="mt-3 grid gap-2.5">
                {column.links.map((link) => (
                  <div key={`${link.label}-${link.href}`}>
                    <FooterLink href={link.href} target={link.target}>
                      {link.label}
                    </FooterLink>
                    {link.children?.length ? (
                      <div className="ml-3 mt-1.5 grid gap-1.5 border-l border-slate-200/80 pl-3 dark:border-slate-700/80">
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
            <div className="max-w-sm">
              <NewsletterSignup
                compact
                sourcePath={router.asPath}
                sourcePage="layout-footer"
                title="Newsletter"
                description="Get product updates and enterprise AI signals."
                ctaLabel="Subscribe"
              />
            </div>
            <div className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-900 dark:text-slate-100 sm:text-right">
              Stay connected
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 sm:text-right">
              Follow platform updates and enterprise AI signals.
            </p>
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
          <div className="border-t border-slate-200/70 px-4 py-4 text-xs text-slate-600 dark:border-slate-800/70 dark:text-slate-300 sm:px-6 lg:px-8">
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
          onClick={(event) => {
            if (!allowBackdropClose) return;
            if (event.currentTarget === event.target) {
              closeSearch();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-search-title"
            ref={searchDialogRef}
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
                    placeholder="Search agents, MCP servers, skills, resources, updates..."
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
                  { label: "Discovery assistant", href: "/assistant" },
                  { label: "Agents catalog", href: "/aixcelerator/agents" },
                  { label: "MCP servers", href: "/aixcelerator/mcp" },
                  { label: "Skills catalog", href: "/aixcelerator/skills" },
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
      {isCatalogWorkspace && discoveryOpen ? (
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
              Jump straight into agents, MCPs, and skills-or explore validated resources and industry playbooks.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                { label: "Discovery assistant", href: "/assistant" },
                { label: "Agents catalog", href: "/aixcelerator/agents" },
                { label: "MCP servers", href: "/aixcelerator/mcp" },
                { label: "Skills catalog", href: "/aixcelerator/skills" },
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
      {isCatalogWorkspace && !mobileMenuOpen && !workspaceMobileRailOpen && !searchOpen ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 lg:inset-x-auto lg:right-8 lg:px-0">
          <form
            action="/search"
            method="get"
            className="pointer-events-auto flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-xl dark:border-slate-700 dark:bg-slate-950/95 lg:w-[36rem]"
          >
            <label htmlFor="workspace-ask" className="sr-only">
              Ask about this page
            </label>
            <input
              id="workspace-ask"
              name="q"
              type="search"
              placeholder="Ask this page: agents, MCP servers, skills, use cases..."
              className="w-full rounded-xl border border-transparent bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-blue/35 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <button type="submit" className="btn btn-primary btn-sm whitespace-nowrap">
              Ask
            </button>
          </form>
        </div>
      ) : null}
      <CookieConsentBanner />
      <DemoRequestWizardModal
        open={demoWizardOpen}
        onClose={() => setDemoWizardOpen(false)}
        sourcePage="header-cta-wizard"
        sourcePath={router.asPath}
      />
    </div>
  );
}

function MobileLink({
  href,
  target,
  active,
  onClick,
  className,
  children,
}: {
  href: string;
  target?: string | null;
  active?: boolean;
  onClick?: () => void;
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
    active ? "bg-brand-blue/10 text-brand-deep dark:bg-brand-blue/15 dark:text-sky-200" : "",
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
      onClick={onClick}
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
  const classes = [
    "footer-link",
    "focus-ring",
    "inline-flex",
    "items-center",
    "gap-1",
    "hover:underline",
    "underline-offset-4",
    className ?? "font-semibold",
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

function ThemeIcon({ isDark }: { isDark: boolean }) {
  if (isDark) {
    return (
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

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5Z" />
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
