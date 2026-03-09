import type { TourStep } from "./types";

export const TOUR_STORAGE_KEY = "colaberry_guided_tour_completed";
export const TOUR_VERSION = 1;

export const HOMEPAGE_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    targetSelector: "header[role='banner']",
    title: "Welcome to Colaberry AI",
    description:
      "Your enterprise catalog for AI agents, MCP servers, skills, and research. Let us show you around.",
    placement: "bottom",
  },
  {
    id: "navigation",
    targetSelector: "nav[aria-label='Main navigation']",
    title: "Navigate the platform",
    description:
      "Explore Platform, Industries, Resources, and Updates from the top navigation.",
    placement: "bottom",
  },
  {
    id: "search",
    targetSelector: "button[aria-label='Open global search']",
    title: "Global search",
    description:
      "Search across agents, MCP servers, skills, podcasts, and all resources instantly.",
    placement: "bottom",
  },
  {
    id: "dark-mode",
    targetSelector: "[data-tour='theme-toggle']",
    title: "Dark mode toggle",
    description:
      "Switch between light and dark mode. Your preference is saved automatically.",
    placement: "bottom",
  },
  {
    id: "catalog-cards",
    targetSelector: "[data-tour='catalog-grid']",
    title: "Explore the catalog",
    description:
      "Browse structured catalogs for agents, MCP integrations, skills, solutions, podcasts, and books.",
    placement: "top",
  },
  {
    id: "cta",
    targetSelector: "[data-tour='hero-cta']",
    title: "Book a demo",
    description:
      "Ready to see the platform in action? Book a personalized demo with our team.",
    placement: "bottom",
  },
];
