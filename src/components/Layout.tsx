import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import dynamic from "next/dynamic";
import {
  CSSProperties,
  FormEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/router";
import { fetchGlobalNavigation, GlobalNavigation } from "../lib/cms";
import { captureUtmContextFromLocation, getTrackingContext } from "../lib/tracking";
import NewsletterSignup from "./NewsletterSignup";
import AnimatedSignalBanner from "./AnimatedSignalBanner";

const CookieConsentBanner = dynamic(() => import("./CookieConsentBanner"), {
  ssr: false,
});
const DemoRequestWizardModal = dynamic(
  () => import("./DemoRequestWizardModal"),
  { ssr: false },
);

const fallbackNavigation: GlobalNavigation = {
  headerLinks: [
    {
      label: "Platform",
      href: "/aixcelerator",
      order: 1,
      group: "header",
      children: [
        { label: "Agents", href: "/aixcelerator/agents", order: 1 },
        { label: "MCP Servers", href: "/aixcelerator/mcp", order: 2 },
        { label: "Skills", href: "/aixcelerator/skills", order: 3 },
        { label: "Use Cases", href: "/use-cases", order: 4 },
      ],
    },
    {
      label: "Industries",
      href: "/industries",
      order: 2,
      group: "header",
      children: [
        { label: "All Industries", href: "/industries", order: 1 },
        { label: "Solutions & Playbooks", href: "/solutions", order: 2 },
      ],
    },
    {
      label: "Resources",
      href: "/resources",
      order: 3,
      group: "header",
      children: [
        { label: "Podcasts", href: "/resources/podcasts", order: 1 },
        { label: "Articles", href: "/resources/articles", order: 2 },
        { label: "Books & White Papers", href: "/resources/books", order: 3 },
        { label: "Case Studies", href: "/resources/case-studies", order: 4 },
      ],
    },
    {
      label: "Updates",
      href: "/updates",
      order: 4,
      group: "header",
      children: [{ label: "News & Product", href: "/updates", order: 1 }],
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
  legalLinks: [
    { label: "Privacy Policy", href: "/privacy-policy", order: 1, group: "legal" },
    { label: "Cookie Policy", href: "/cookie-policy", order: 2, group: "legal" },
  ],
};

const FOOTER_NAV_LINKS = [
  { label: "Platform", href: "/aixcelerator" },
  { label: "Agents", href: "/aixcelerator/agents" },
  { label: "MCP Servers", href: "/aixcelerator/mcp" },
  { label: "Skills", href: "/aixcelerator/skills" },
  { label: "Solutions", href: "/solutions" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Industries", href: "/industries" },
  { label: "Resources", href: "/resources" },
  { label: "Podcasts", href: "/resources/podcasts" },
  { label: "Updates", href: "/updates" },
  { label: "Contact", href: "/request-demo" },
] as const;

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
      <rect x="2" y="4.5" width="20" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <polygon points="10 8.5 16 12 10 15.5" fill="currentColor" />
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

const sidebarIconProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function getSidebarIcon(href: string): ReactNode {
  const p = normalizePath(href);
  if (p === "/aixcelerator") return <svg {...sidebarIconProps}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
  if (p.startsWith("/aixcelerator/agents") || p === "/aixcelerator/agents") return <svg {...sidebarIconProps}><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="3" /><line x1="8" y1="16" x2="8" y2="16.01" /><line x1="16" y1="16" x2="16" y2="16.01" /><line x1="12" y1="16" x2="12" y2="18" /></svg>;
  if (p.startsWith("/aixcelerator/mcp")) return <svg {...sidebarIconProps}><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><circle cx="6" cy="6" r="1" /><circle cx="6" cy="18" r="1" /></svg>;
  if (p.startsWith("/aixcelerator/skills")) return <svg {...sidebarIconProps}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
  if (p.startsWith("/use-cases")) return <svg {...sidebarIconProps}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /></svg>;
  if (p === "/search") return <svg {...sidebarIconProps}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
  if (p === "/assistant") return <svg {...sidebarIconProps}><path d="M12 3l1.912 5.813L20 12l-6.088 3.187L12 21l-1.912-5.813L4 12l6.088-3.187z" /><path d="M20 3l.75 2.25L23 6l-2.25.75L20 9l-.75-2.25L17 6l2.25-.75z" /></svg>;
  if (p.startsWith("/resources/podcasts")) return <svg {...sidebarIconProps}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>;
  if (p.startsWith("/resources/articles")) return <svg {...sidebarIconProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>;
  if (p.startsWith("/resources/case-studies")) return <svg {...sidebarIconProps}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>;
  if (p.startsWith("/resources/white-papers")) return <svg {...sidebarIconProps}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>;
  if (p.startsWith("/resources/books")) return <svg {...sidebarIconProps}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z" /><line x1="10" y1="2" x2="10" y2="10" /><path d="M10 6l3-2 3 2" /></svg>;
  if (p === "/resources") return <svg {...sidebarIconProps}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
  if (p.startsWith("/updates")) return <svg {...sidebarIconProps}><path d="M4 22V4c0-.5.2-1 .6-1.4C5 2.2 5.5 2 6 2h8.5L20 7.5V22z" /><polyline points="14 2 14 8 20 8" /><path d="M8 12h8" /><path d="M8 16h5" /></svg>;
  if (p.startsWith("/industries")) return <svg {...sidebarIconProps}><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="9" y1="22" x2="9" y2="12" /><line x1="15" y1="22" x2="15" y2="12" /><line x1="4" y1="12" x2="20" y2="12" /></svg>;
  if (p.startsWith("/solutions")) return <svg {...sidebarIconProps}><line x1="12" y1="2" x2="12" y2="6" /><circle cx="12" cy="14" r="8" /><path d="M12 6a6 6 0 0 0-4.24 10.24" /><path d="M12 6a6 6 0 0 1 4.24 10.24" /><line x1="12" y1="18" x2="12" y2="22" /></svg>;
  // fallback: use first letters
  return null;
}

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
  // Show sidebar on all inner pages except homepage and static legal pages
  const noSidebarPaths = ["/", "/cookie-policy", "/privacy-policy", "/unsubscribe"];
  if (noSidebarPaths.includes(path)) return false;
  return true;
}

function getSignalBannerConfig(path: string) {
  if (path.startsWith("/resources") || path.startsWith("/updates")) {
    return {
      variant: "resources" as const,
      kicker: "Knowledge Signals",
      title: "Ship content assets with enterprise narrative quality",
      description:
        "Turn podcasts, articles, books, and case studies into governed discovery surfaces for teams and LLM indexing.",
      primaryHref: "/resources",
      primaryLabel: "Explore resources",
      secondaryHref: "/resources/podcasts",
      secondaryLabel: "Open podcasts",
    };
  }

  if (path.startsWith("/solutions") || path.startsWith("/industries") || path.startsWith("/use-cases")) {
    return {
      variant: "solutions" as const,
      kicker: "Execution Layer",
      title: "Connect use cases to measurable enterprise outcomes",
      description:
        "Organize solution blueprints by industry, surface implementation detail, and route teams toward deployment readiness.",
      primaryHref: "/solutions",
      primaryLabel: "View solutions",
      secondaryHref: "/use-cases",
      secondaryLabel: "Browse use cases",
    };
  }

  if (path.startsWith("/aixcelerator") || path.startsWith("/assistant") || path.startsWith("/search")) {
    return {
      variant: "catalog" as const,
      kicker: "Catalog Workspace",
      title: "Discover agents, MCP servers, and skills in one governed surface",
      description:
        "Use structured catalog views to compare readiness, ownership, integrations, and deployment posture before rollout.",
      primaryHref: "/aixcelerator",
      primaryLabel: "Open catalog",
      secondaryHref: "/search",
      secondaryLabel: "Search assets",
    };
  }

  return {
    variant: "platform" as const,
    kicker: "Enterprise Platform",
    title: "Build, govern, and scale AI programs from one operating layer",
    description:
      "Colaberry aligns strategy, catalog discovery, and production workflows across agents, MCP, skills, and evidence-backed resources.",
    primaryHref: "/request-demo",
    primaryLabel: "Request demo",
    secondaryHref: "/aixcelerator",
    secondaryLabel: "Explore platform",
  };
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
  const [headerCompact, setHeaderCompact] = useState(false);
  // Footer newsletter state
  const [footerEmail, setFooterEmail] = useState("");
  const [footerHoneypot, setFooterHoneypot] = useState("");
  const [footerConsent, setFooterConsent] = useState(false);
  const [footerSubState, setFooterSubState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [footerSubMessage, setFooterSubMessage] = useState<string | null>(null);
  const footerTrackingContext = useMemo(() => getTrackingContext(), []);
  const lastScrollY = useRef(0);
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
  const signalBannerConfig = useMemo(() => getSignalBannerConfig(currentPath), [currentPath]);
  const showSignalBanner = !currentPath.startsWith("/internal");

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      const storedTheme = window.localStorage.getItem("theme");
      const resolvedTheme = storedTheme === "dark" ? "dark" : "light";
      setTheme(resolvedTheme);
      captureUtmContextFromLocation();
      setHasMounted(true);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    function handleKeyboard(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setWorkspaceRailCollapsed((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  /* Scroll-collapse header: compact after 100px scroll down, expand on scroll up.
     Uses a 10px delta threshold to avoid shaking from micro-scrolls. */
  useEffect(() => {
    let ticking = false;
    const DELTA = 10;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const diff = y - lastScrollY.current;
        if (y > 100 && diff > DELTA) {
          setHeaderCompact(true);
          lastScrollY.current = y;
        } else if (diff < -DELTA) {
          setHeaderCompact(false);
          lastScrollY.current = y;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
      if (event.key === "Tab") {
        const aside = document.querySelector<HTMLElement>("[data-mobile-menu]");
        if (!aside) return;
        const focusable = Array.from(
          aside.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
          )
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
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

  /* Scroll-triggered reveal: observe `.reveal` elements and add `.revealed` */
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -60px 0px" },
    );
    const targets = document.querySelectorAll(".reveal:not(.revealed)");
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });

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

  async function handleFooterNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (footerSubState === "submitting" || !footerConsent) return;
    setFooterSubState("submitting");
    setFooterSubMessage(null);
    try {
      const response = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: footerEmail,
          website: footerHoneypot,
          consent: footerConsent,
          sourcePath: router.asPath,
          sourcePage: "layout-footer",
          utmSource: footerTrackingContext.utmSource,
          utmMedium: footerTrackingContext.utmMedium,
          utmCampaign: footerTrackingContext.utmCampaign,
          utmTerm: footerTrackingContext.utmTerm,
          utmContent: footerTrackingContext.utmContent,
          referrer: footerTrackingContext.referrer,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload?.ok) {
        setFooterSubState("error");
        setFooterSubMessage(payload?.message || "Unable to subscribe right now.");
        return;
      }
      setFooterSubState("success");
      setFooterSubMessage(payload?.message || "Subscription confirmed.");
      setFooterEmail("");
      setFooterHoneypot("");
      setFooterConsent(false);
    } catch {
      setFooterSubState("error");
      setFooterSubMessage("Unable to subscribe right now.");
    }
  }

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
              className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#DC2626]" : "group-hover:tranzinc-y-[1px]"}`}
              fill="none"
            >
              <path
                d="M5.5 7.5 10 12l4.5-4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </Link>
        {hasChildren ? (
          <div
            className={`absolute left-0 top-full z-50 pt-2.5 transition-all duration-200 ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <div
              className={`mega-menu-panel min-w-[15rem] rounded-xl p-2 transition-all duration-200 ${isOpen ? "tranzinc-y-0" : "tranzinc-y-1.5"}`}
              role="menu"
              aria-label={`${link.label} menu`}
            >
              <div className="px-2.5 pb-2 pt-1 text-label font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                {link.label}
              </div>
              <div className="grid gap-0.5">
                {link.children?.map((child) => {
                  const isChildActive = isActiveNavPath(currentPath, child.href, childNavPaths);
                  return (
                    <Link
                      key={`${child.label}-${child.href}`}
                      href={child.href}
                      target={child.target ?? undefined}
                      rel={getLinkRel(child.target)}
                      className={`nav-dropdown-link focus-ring flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isChildActive ? "nav-dropdown-link-active" : ""}`}
                      role="menuitem"
                    >
                      <span>{child.label}</span>
                      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform group-hover:tranzinc-x-0.5">
                        <path d="M6.5 3.5 11 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
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
    <div className="flex min-h-dvh flex-col bg-transparent text-zinc-900">
      <Head>
        <link rel="preconnect" href="https://www.buzzsprout.com" />
        <link rel="dns-prefetch" href="https://www.buzzsprout.com" />
      </Head>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-deep focus:shadow-lg focus:ring-2 focus:ring-[#DC2626]/40">Skip to content</a>
      <header role="banner" className={`site-header sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${headerCompact ? "site-header--compact border-[var(--stroke)]/60 bg-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:bg-[#18181B]/80" : "border-[var(--stroke)] bg-white shadow-sm dark:bg-[#18181B]"}`}>
        <div className={`flex w-full items-center justify-between gap-3 px-4 transition-[padding] duration-200 sm:px-6 lg:px-8 ${headerCompact ? "py-1.5" : "py-3"}`}>
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
            </Link>
          </div>

          <nav role="navigation" aria-label="Main navigation" className="hidden min-w-0 items-center gap-1.5 text-sm min-[1240px]:flex">
            {isCatalogWorkspace ? (
              <>
                <button
                  type="button"
                  onClick={() => setWorkspaceRailCollapsed((current) => !current)}
                  className="btn btn-secondary btn-sm"
                  aria-expanded={!workspaceRailCollapsed}
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
                  <span className="hidden min-[1700px]:inline">
                    {workspaceRailCollapsed ? "Expand menu" : "Collapse menu"}
                  </span>
                </button>
                <span className="hidden rounded-md border border-zinc-200/80 bg-white/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 min-[1560px]:inline-flex dark:border-zinc-700/80 dark:bg-zinc-900/70 dark:text-zinc-300">
                  Catalog workspace
                </span>
                <div className="hidden h-6 w-px bg-zinc-200/80 min-[1560px]:block dark:bg-zinc-700/80" />
                <div className="hidden items-center gap-1.5 min-[1680px]:flex">{desktopHeaderItems}</div>
              </>
            ) : (
              desktopHeaderItems
            )}

            <div className="ml-2 flex shrink-0 items-center gap-2 border-l border-zinc-200/80 pl-3 dark:border-zinc-700/80">
              <button
                type="button"
                onClick={openSearch}
                className="btn btn-ghost btn-icon"
                aria-expanded={searchOpen}
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
                className="btn btn-primary ml-1 h-10 shrink-0 whitespace-nowrap px-4 text-sm max-[1500px]:h-9 max-[1500px]:px-3 max-[1500px]:text-xs"
                onClick={(event) => handleDemoCtaClick(event, globalNav.cta?.href)}
              >
                <span>{getRequestDemoLabel(globalNav.cta.label)}</span>
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-2 min-[1240px]:hidden">
            {isCatalogWorkspace ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setWorkspaceMobileRailOpen(true);
                }}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200/70 bg-white/85 px-3 text-sm font-semibold text-zinc-700 hover:border-[#DC2626]/35 hover:text-[#18181B] dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                aria-expanded={workspaceMobileRailOpen}
                aria-label="Open catalog sidebar"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span className="hidden min-[420px]:inline">Catalog</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={openSearch}
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200/70 bg-white/85 text-zinc-700 hover:border-[#DC2626]/35 hover:text-[#18181B] dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
              aria-expanded={searchOpen}
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
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200/70 bg-white/85 text-zinc-700 hover:border-[#DC2626]/35 hover:text-[#18181B] dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
              aria-label={themeToggleLabel}
            >
              <span className="sr-only">{themeToggleLabel}</span>
              <ThemeIcon isDark={isDarkMode} />
            </button>
            <button
              type="button"
              onClick={openMobileMenu}
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200/70 bg-white/85 px-3 text-sm font-semibold text-zinc-700 hover:border-[#DC2626]/35 hover:text-[#18181B] dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
              aria-expanded={mobileMenuOpen}
              aria-label="Open navigation menu"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span className="hidden min-[420px]:inline">Menu</span>
            </button>
          </div>
        </div>
      </header>
      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-[55] bg-zinc-950/45 backdrop-blur-sm min-[1240px]:hidden animate-fade-in"
          onClick={closeMobileMenu}
        >
          <aside
            data-mobile-menu
            className="absolute right-0 top-0 flex h-full w-[min(92vw,380px)] flex-col border-l border-zinc-200/70 bg-white/95 p-4 shadow-2xl dark:border-[#3F3F46] dark:bg-[#18181B]/95 animate-slide-in-right"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(e) => {
              const startX = e.touches[0].clientX;
              const aside = e.currentTarget;
              const onMove = (ev: TouchEvent) => {
                const dx = ev.touches[0].clientX - startX;
                if (dx > 80) {
                  closeMobileMenu();
                  aside.removeEventListener("touchmove", onMove);
                }
              };
              aside.addEventListener("touchmove", onMove, { passive: true });
              aside.addEventListener("touchend", () => aside.removeEventListener("touchmove", onMove), { once: true });
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
                  Navigation
                </div>
                <div className="mt-1 text-base font-semibold text-zinc-900 dark:text-white">
                  Explore Colaberry AI
                </div>
              </div>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200/70 bg-white/85 text-zinc-700 hover:text-[#18181B] dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
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
                      className="rounded-lg border border-zinc-200/80 bg-white/90 p-1 dark:border-zinc-700/80 dark:bg-zinc-900/70"
                    >
                      <MobileLink
                        href={link.href}
                        target={link.target}
                        active={isParentActive}
                        onClick={closeMobileMenu}
                        className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold"
                      >
                        <span>{link.label}</span>
                        {hasChildren ? <span className="text-zinc-400">→</span> : null}
                      </MobileLink>
                      {hasChildren ? (
                        <div className="mx-3 mb-2 mt-1 grid gap-1 border-l border-zinc-200/80 pl-3 dark:border-zinc-700/80">
                          {link.children?.map((child) => (
                            <MobileLink
                              key={`${child.label}-${child.href}`}
                              href={child.href}
                              target={child.target}
                              active={isActiveNavPath(currentPath, child.href, childNavPaths)}
                              onClick={closeMobileMenu}
                              className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
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

            <div className="mt-3 rounded-lg border border-zinc-200/80 bg-white/90 p-3 dark:border-zinc-700/80 dark:bg-zinc-900/70">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
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
          className="fixed inset-0 z-[58] bg-zinc-950/45 backdrop-blur-sm min-[1240px]:hidden"
          onClick={() => setWorkspaceMobileRailOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 flex h-full w-[min(88vw,340px)] flex-col border-r border-zinc-200/70 bg-white/95 p-4 shadow-2xl dark:border-[#3F3F46] dark:bg-[#18181B]/95"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-300">
                  Catalog menu
                </div>
                <div className="mt-1 text-base font-semibold text-zinc-900 dark:text-white">
                  Aixcelerator workspace
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWorkspaceMobileRailOpen(false)}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200/70 bg-white/85 text-zinc-700 hover:text-[#18181B] dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
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
                  <div className="px-1 text-label font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-300">
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
        <div className="w-full flex-1 min-[1240px]:grid min-[1240px]:grid-cols-[var(--workspace-rail-width)_minmax(0,1fr)] min-[1240px]:gap-6 min-[1240px]:px-8" style={workspaceGridStyle}>
          <aside className="hidden min-[1240px]:block" aria-label="Catalog navigation">
            <div className="sticky pb-6" style={{ top: "var(--site-header-height)", height: "calc(100dvh - var(--site-header-height))" }}>
              <div className="surface-panel h-full overflow-y-auto p-3" style={{ maskImage: "linear-gradient(to bottom, black 85%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 85%, transparent 100%)" }}>
                {workspaceSections.map((section) => (
                  <div key={section.title} className="mb-4">
                    <div className={`px-2 text-label font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-300 ${workspaceRailCollapsed ? "text-center" : ""}`}>
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
                                ? "border-[#DC2626]/40 bg-[#DC2626]/10 text-[#18181B] dark:border-[#F87171]/55 dark:bg-[#F87171]/25 dark:text-[#FAFAFA]"
                                : "border-zinc-200/70 bg-white/80 text-zinc-700 hover:border-[#DC2626]/35 hover:text-[#18181B] dark:border-zinc-700 dark:bg-zinc-900/75 dark:text-zinc-200 dark:hover:border-[#F87171]/45 dark:hover:text-[#FAFAFA]"
                            } ${workspaceRailCollapsed ? "justify-center" : ""}`}
                          >
                            <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${isActive ? "border-[#DC2626]/45 bg-white/90 text-[#18181B] dark:border-[#F87171]/60 dark:bg-[#3F3F46]/85 dark:text-[#FAFAFA]" : "border-zinc-200/80 bg-white/90 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300"}`}>
                              {getSidebarIcon(link.href) ?? <span className="text-label font-semibold">{link.label.split(" ").map((t) => t[0]).join("").slice(0, 2).toUpperCase()}</span>}
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
          <main id="main-content" className="main-offset relative min-w-0 px-4 sm:px-6 min-[1240px]:px-0">
            {children}
          </main>
        </div>
      ) : (
        <main id="main-content" className="main-offset relative w-full flex-1 px-4 sm:px-6 xl:px-8">
          {children}
        </main>
      )}

      {showSignalBanner ? (
        <div className="px-4 sm:px-6 lg:px-8">
          <AnimatedSignalBanner {...signalBannerConfig} />
        </div>
      ) : null}

      <footer role="contentinfo" className="footer-surface mt-6">
        {/* ── Main 3-column grid ── */}
        <div className="mx-auto grid max-w-7xl gap-8 px-6 pt-12 pb-8 lg:grid-cols-[1fr_auto_auto] lg:gap-10 lg:pt-16 lg:pb-10">
          {/* LEFT — Newsletter */}
          <div className="max-w-md">
            <h2 className="text-xl font-semibold text-[#18181B] dark:text-[#FAFAFA]">
              Subscribe to newsletter
            </h2>
            <form onSubmit={handleFooterNewsletterSubmit} className="mt-6">
              {/* Honeypot */}
              <input
                type="text"
                name="website"
                value={footerHoneypot}
                onChange={(e) => setFooterHoneypot(e.target.value)}
                autoComplete="off"
                tabIndex={-1}
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                aria-hidden="true"
              />
              <div className="flex items-center gap-3">
                <input
                  type="email"
                  required
                  placeholder="Email address"
                  value={footerEmail}
                  onChange={(e) => setFooterEmail(e.target.value)}
                  disabled={footerSubState === "submitting"}
                  className="footer-input-underline flex-1 text-sm"
                />
                <button
                  type="submit"
                  disabled={footerSubState === "submitting" || !footerConsent}
                  aria-label="Subscribe"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#18181B] text-white transition-transform hover:scale-105 disabled:opacity-40 dark:bg-[#FAFAFA] dark:text-[#18181B]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-[#71717A] dark:text-[#A1A1AA]">
                <input
                  type="checkbox"
                  checked={footerConsent}
                  onChange={(e) => setFooterConsent(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-300 accent-[#DC2626] dark:border-zinc-600"
                />
                <span>
                  By subscribing you agree to with our{" "}
                  <Link href="/privacy-policy" className="underline hover:text-[#18181B] dark:hover:text-white">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {footerSubMessage ? (
                <p className={`mt-3 text-xs ${footerSubState === "error" ? "text-red-600" : "text-emerald-600"}`}>
                  {footerSubMessage}
                </p>
              ) : null}
            </form>
          </div>

          {/* MIDDLE — Nav links */}
          <nav aria-label="Footer navigation" className="lg:border-r lg:border-[#D4D1CA] lg:pr-12 dark:lg:border-[#4A473F]">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-1 lg:gap-y-2">
              {FOOTER_NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* RIGHT — Social icons */}
          <div className="flex flex-row flex-wrap gap-3 lg:flex-col">
            {globalNav.socialLinks.map((link) => (
              <a
                key={`footer-social-${link.label}`}
                href={link.href}
                target={link.target ?? "_blank"}
                rel="noopener noreferrer"
                aria-label={link.label}
                className="social-icon-circle"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  {resolveSocialIcon(link.icon, link.label)}
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-[#D4D1CA] dark:border-[#4A473F]">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-6 sm:flex-row sm:justify-between">
            {/* Logo */}
            <span className="flex items-center">
              <Image
                src="/brand/colaberry-ai-logo.svg"
                alt="Colaberry AI"
                width={130}
                height={28}
                priority
                className="brand-logo-light h-7 w-auto"
              />
              <Image
                src="/brand/colaberry-ai-logo-dark.svg"
                alt="Colaberry AI"
                width={130}
                height={28}
                priority
                className="brand-logo-dark h-7 w-auto"
              />
            </span>

            {/* Legal links */}
            <div className="flex flex-wrap items-center gap-4">
              {globalNav.legalLinks.map((link) => (
                <FooterLink
                  key={`footer-legal-${link.label}`}
                  href={link.href}
                  target={link.target}
                  className="text-xs font-medium"
                >
                  {link.label}
                </FooterLink>
              ))}
            </div>

            {/* Copyright */}
            <span className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
              &copy; {new Date().getFullYear()} Colaberry, Inc.
            </span>
          </div>
        </div>
      </footer>
      {searchOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-zinc-950/40 px-4 py-6 backdrop-blur-sm"
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
            className="w-full max-w-2xl rounded-xl border border-zinc-200/70 bg-white p-6 shadow-2xl dark:border-[#3F3F46] dark:bg-[#18181B]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-[#A1A1AA]">
                  Global search
                </div>
                <h2 id="global-search-title" className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
                  Search the Colaberry catalog
                </h2>
              </div>
              <button
                type="button"
                onClick={closeSearch}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200/70 bg-white/85 text-zinc-700 hover:text-[#18181B] dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
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
                    className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 pr-12 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-[#DC2626]/40 focus:outline-none focus:ring-2 focus:ring-[#DC2626]/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                  <span className="absolute right-4 top-1/2 -tranzinc-y-1/2 text-zinc-400 dark:text-[#A1A1AA]">
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
                  className="focus-ring rounded-lg border border-zinc-200/80 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 hover:border-[#DC2626]/30 hover:text-[#DC2626] dark:border-[#3F3F46] dark:bg-[#27272A]/70 dark:text-zinc-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {isCatalogWorkspace && discoveryOpen ? (
        <div className="hidden sm:block fixed bottom-4 right-6 left-auto z-40 max-w-md">
          <div className="surface-panel border border-zinc-200/70 bg-white/95 p-4 shadow-xl dark:border-[#3F3F46] dark:bg-[#18181B]/90">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-[#A1A1AA]">
                  Quick start
                </div>
                <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
                  Explore the enterprise catalog
                </div>
              </div>
              <button
                type="button"
                onClick={dismissDiscovery}
                className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200/70 bg-white/85 text-zinc-700 hover:text-[#18181B] dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                aria-label="Dismiss"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                  <path
                    d="M6 6 18 18M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
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
                  className="focus-ring rounded-xl border border-zinc-200/70 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-[#DC2626]/30 hover:text-[#DC2626] dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {isCatalogWorkspace && !mobileMenuOpen && !workspaceMobileRailOpen && !searchOpen ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 min-[1240px]:inset-x-auto min-[1240px]:right-8 min-[1240px]:px-0">
          <form
            action="/search"
            method="get"
            className="pointer-events-auto flex w-full max-w-2xl items-center gap-2 rounded-lg border border-zinc-200/80 bg-white/95 p-2 shadow-xl dark:border-[#3F3F46] dark:bg-[#18181B]/95 lg:w-[36rem]"
          >
            <label htmlFor="workspace-ask" className="sr-only">
              Ask about this page
            </label>
            <input
              id="workspace-ask"
              name="q"
              type="search"
              placeholder="Ask this page: agents, MCP servers, skills, use cases..."
              className="w-full rounded-xl border border-transparent bg-transparent px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#DC2626]/35 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
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
      {/* Back-to-top floating button */}
      <button
        type="button"
        aria-label="Back to top"
        className={`back-to-top btn-icon${headerCompact ? " visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 15V5M10 5l-4 4M10 5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
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
    "text-zinc-700",
    "hover:bg-zinc-50",
    "dark:text-zinc-200",
    "dark:hover:bg-zinc-800/70",
    active ? "bg-[#DC2626]/10 text-[#18181B] dark:bg-[#F87171]/15 dark:text-[#FAFAFA]" : "",
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
    "text-[#18181B]",
    "dark:text-[#E4E4E7]",
    "hover:text-zinc-900",
    "dark:hover:text-zinc-50",
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
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none">
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
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
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
      className="social-button focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200/70 bg-white/80 text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-white"
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        {iconMarkup}
      </svg>
      <span className="sr-only">{label}</span>
    </a>
  );
}
