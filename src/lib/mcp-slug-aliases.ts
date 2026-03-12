/**
 * Reverse mapping: new slug → old slug(s).
 * Built from the MCP slug migration redirects in next.config.ts.
 * Used by the telemetry API to also query events stored under legacy slugs.
 */

const MCP_PREFIX = "/aixcelerator/mcp/";

const REDIRECT_PAIRS: [string, string][] = [
  ["mcp-server", "adadvisor-mcp-server"],
  ["mcp-aktools", "aktools-mcp-server"],
  ["server-1xtqyei", "amazon-ecs-mcp-server"],
  ["server-1xtqyed", "amazon-eks-mcp-server"],
  ["mcp-oc1zi8", "auteng-mcp-markdown-publishing-document-share"],
  ["mcp-datalink", "datalink"],
  ["mcp-oc1zms", "datamerge-mcp"],
  ["mcp-lpl41m", "dock-ai"],
  ["mcp-lpl41n", "dock-ai-1"],
  ["mcp-lpl3rn", "flaim-fantasy-sports-ai-connector"],
  ["mcp-lpl3rw", "flaim-fantasy"],
  ["mcp-gmail", "gmail-1"],
  ["mcp-drive", "google-drive"],
  ["mcp-sheets", "google-sheets"],
  ["mcp-lpl3w4", "himalayas-remote-jobs"],
  ["mcp-lpl3w5", "himalayas-remote-jobs-1"],
  ["mcp-komodo", "komodo-mcp-server-1"],
  ["mcp-learning", "learning-model-context-protocol"],
  ["mcp-factorial", "mcp-factorialhr"],
  ["mcp-openclaw", "mcp-openclaw-extensions"],
  ["mcp-windbg", "mcp-server-for-windbg-crash-analysis"],
  ["mcp-oc1zot", "mailjunky"],
  ["mcp-oc1zlx", "marketcore"],
  ["mcp-oc1zos", "marketcore-mcp-server"],
  ["mcp-oc1zlw", "marketcore-mcp-server-1"],
  ["mcp-notify", "notify-mcp-server"],
  ["mcp-oc1znn", "obris"],
  ["mcp-oc1znm", "obris-1"],
  ["mcp-outline", "outline-mcp-server"],
  ["mcp-outlook", "outlook"],
  ["mcp-redis", "redis-mcp-server"],
  ["mcp-refactoring", "refactoring-mcp-server"],
  ["mcp-relay", "relay"],
  ["mcp-oc1zsd", "scite"],
  ["mcp-stata", "stata-mcp-server"],
  ["mcp-statcan", "statistics-canada-mcp-server"],
  ["server-template", "template-server-1"],
  ["mcp-template", "template-server-2"],
  ["mcp-toleno", "toleno-network"],
  ["mcp-lpl3th", "trade-it"],
  ["mcp-lpl41p", "trilo"],
  ["mcp-youtube", "youtube-data"],
  ["mcp-oc1zoj", "llmse-mcp"],
  ["mcp-bf1do6", "meetlark-mcp-server"],
  ["mcp-1n9ugzb", "meetlark-mcp-server-1"],
  ["mcp-oc1zsa", "rolli-mcp"],
  ["mcp-lpkzw3", "tickettailor-mcp"],
  ["mcp-lpkzvg", "waystation-mcp"],
  ["mcp-lpl3ub", "websitepublisher-mcp"],
  ["mcp-lpl3rk", "zine-mcp"],
  ["mcp-lpl3rr", "zine-mcp-1"],
  ["server-1xtqyga", "certman-server"],
  ["server-1xtqyg9", "certman-server-1"],
  ["mcp-lpl3w6", "himalayas-mcp"],
  ["mcp-ccmpj6", "thoughtspot-mcp-server"],
  ["mcp-1ybkaqo", "thoughtspot-mcp-server-1"],
  ["mcp-1reyfnc", "thoughtspot-mcp-server-2"],
  ["server-1xtqyeh", "trustrails-server"],
  ["mcp-lpl3tr", "biz-icecat-mcp"],
  ["mcp-lpl3qp", "biz-icecat-mcp-1"],
  ["mcp-lpl3qo", "biz-icecat-mcp-2"],
  ["mcp-lpl3qr", "biz-icecat-mcp-3"],
  ["mcp-lpl41l", "axiom-mcp"],
  ["mcp-lpl41k", "contraption-mcp"],
  ["mcp-nspeb4", "flyweel-mcp-server"],
  ["server-1xtqy6n", "heyspark-mcp-server"],
];

/** Map from new slug → old slug */
const newToOld = new Map<string, string>();
for (const [oldSlug, newSlug] of REDIRECT_PAIRS) {
  newToOld.set(newSlug, oldSlug);
}

/**
 * Given a current slug, return all slug variants to query telemetry by.
 * Returns [currentSlug] if no migration happened, or [currentSlug, oldSlug] if migrated.
 */
export function getTelemetrySlugs(slug: string): string[] {
  const oldSlug = newToOld.get(slug);
  return oldSlug ? [slug, oldSlug] : [slug];
}

/**
 * Returns the redirect entries for use in next.config.ts.
 * Each entry has { source, destination, permanent: true }.
 */
export function getMcpRedirects() {
  return REDIRECT_PAIRS.map(([oldSlug, newSlug]) => ({
    source: `${MCP_PREFIX}${oldSlug}`,
    destination: `${MCP_PREFIX}${newSlug}`,
    permanent: true,
  }));
}
