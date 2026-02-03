export type CapabilityLayer = "core" | "layer";

export type CapabilityStatus = "available" | "planned";

export type PlatformCapability = {
  layer: CapabilityLayer;
  title: string;
  description: string;
  href: string;
  status: CapabilityStatus;
};

export const coreCapabilities: PlatformCapability[] = [
  {
    layer: "core",
    title: "AIXcelerator",
    description:
      "Core platform for governed delivery-bringing agents, MCP servers, and industry intelligence together.",
    href: "/aixcelerator",
    status: "available",
  },
  {
    layer: "core",
    title: "Agents",
    description: "Catalog agents and assistants by ownership, workflow alignment, and operational status.",
    href: "/aixcelerator/agents",
    status: "available",
  },
  {
    layer: "core",
    title: "MCP",
    description: "Standardize tool access via MCP with integration-ready server patterns and endpoints.",
    href: "/aixcelerator/mcp",
    status: "available",
  },
];

export const modularLayers: PlatformCapability[] = [
  {
    layer: "layer",
    title: "Podcasts",
    description: "Internal publishing plus curated external ai podcast.",
    href: "/resources/podcasts",
    status: "available",
  },
  {
    layer: "layer",
    title: "Books & artifacts",
    description: "Books plus templates, worksheets, and companion assets.",
    href: "/resources/books",
    status: "available",
  },
  {
    layer: "layer",
    title: "Case studies",
    description: "Delivery outcomes organized by industry.",
    href: "/resources/case-studies",
    status: "available",
  },
  {
    layer: "layer",
    title: "White papers",
    description: "Technical deep-dives, POVs, and reference architectures.",
    href: "/resources/white-papers",
    status: "available",
  },
  {
    layer: "layer",
    title: "Industries",
    description: "Industry pages with context and case studies.",
    href: "/industries",
    status: "available",
  },
  {
    layer: "layer",
    title: "Solution playbooks",
    description: "Packaged offerings, reusable patterns, and repeatable rollouts.",
    href: "/solutions",
    status: "available",
  },
  {
    layer: "layer",
    title: "News & product aggregation",
    description: "A combined feed for announcements, product updates, and relevant signals.",
    href: "/updates",
    status: "available",
  },
  {
    layer: "layer",
    title: "Resources hub",
    description: "A single home for research, artifacts, and updates.",
    href: "/resources",
    status: "available",
  },
];
