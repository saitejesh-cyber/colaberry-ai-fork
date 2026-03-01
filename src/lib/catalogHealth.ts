import {
  Agent,
  MCPServer,
  PodcastEpisode,
  Skill,
  UseCase,
  fetchAgents,
  fetchMCPServers,
  fetchPodcastEpisodes,
  fetchSkills,
  fetchUseCases,
} from "./cms";

export const CATALOG_HEALTH_ENTITIES = [
  "agents",
  "mcpServers",
  "useCases",
  "skills",
  "podcasts",
] as const;

export type CatalogHealthEntity = (typeof CATALOG_HEALTH_ENTITIES)[number];

export type CatalogHealthRow = {
  entity: CatalogHealthEntity;
  id: number;
  name: string;
  slug: string;
  href: string;
  status: string;
  visibility: string;
  source: string;
  updatedAt: string;
  isFresh: boolean;
  completenessScore: number;
  requiredChecks: number;
  missingChecks: number;
  missingFields: string[];
};

export type CatalogHealthSummary = {
  total: number;
  fresh: number;
  stale: number;
  complete: number;
  incomplete: number;
  averageCompleteness: number;
};

export type CatalogHealthReport = {
  generatedAt: string;
  freshnessDays: number;
  maxRecordsPerEntity: number;
  totals: {
    rows: number;
    warnings: number;
  };
  summaryByEntity: Record<CatalogHealthEntity, CatalogHealthSummary>;
  warnings: Array<{ entity: CatalogHealthEntity; message: string }>;
  rows: CatalogHealthRow[];
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasList(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatIsoDate(value: string | null | undefined) {
  const parsed = normalizeDate(value);
  return parsed ? parsed.toISOString() : "";
}

function isFreshDate(value: string | null | undefined, freshnessDays: number) {
  const parsed = normalizeDate(value);
  if (!parsed) return false;
  const ageMs = Date.now() - parsed.getTime();
  const maxAgeMs = freshnessDays * 24 * 60 * 60 * 1000;
  return ageMs <= maxAgeMs;
}

function toScore(requiredChecks: number, missingChecks: number) {
  if (requiredChecks <= 0) return 100;
  const passed = Math.max(requiredChecks - missingChecks, 0);
  return Math.round((passed / requiredChecks) * 100);
}

function pickSource(value: string | null | undefined, fallback = "unknown") {
  if (!hasText(value)) return fallback;
  return String(value).trim().toLowerCase();
}

function evaluateAgent(agent: Agent, freshnessDays: number): CatalogHealthRow {
  const checks: Array<[string, boolean]> = [
    ["description", hasText(agent.description) || hasText(agent.longDescription)],
    ["industry", hasText(agent.industry)],
    ["status", hasText(agent.status)],
    ["visibility", hasText(agent.visibility)],
    ["source", hasText(agent.source) || hasText(agent.sourceName)],
    ["outcomes", hasText(agent.outcomes)],
    ["useCases", hasText(agent.useCases)],
    ["requirements", hasText(agent.requirements)],
    ["link", hasText(agent.docsUrl) || hasText(agent.demoUrl) || hasText(agent.sourceUrl)],
    ["tags", hasList(agent.tags)],
    ["lastUpdated", hasText(agent.lastUpdated)],
  ];
  const missingFields = checks.filter(([, ok]) => !ok).map(([field]) => field);
  const requiredChecks = checks.length;
  const missingChecks = missingFields.length;
  const updatedAt = formatIsoDate(agent.lastUpdated);
  return {
    entity: "agents",
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
    href: `/aixcelerator/agents/${agent.slug || agent.id}`,
    status: agent.status || "unknown",
    visibility: agent.visibility || "unknown",
    source: pickSource(agent.source || agent.sourceName),
    updatedAt,
    isFresh: isFreshDate(agent.lastUpdated, freshnessDays),
    requiredChecks,
    missingChecks,
    missingFields,
    completenessScore: toScore(requiredChecks, missingChecks),
  };
}

function evaluateMCPServer(server: MCPServer, freshnessDays: number): CatalogHealthRow {
  const checks: Array<[string, boolean]> = [
    ["description", hasText(server.description) || hasText(server.longDescription)],
    ["industry", hasText(server.industry)],
    ["status", hasText(server.status)],
    ["visibility", hasText(server.visibility)],
    ["source", hasText(server.source) || hasText(server.sourceName)],
    ["capabilities", hasText(server.capabilities)],
    ["tools", hasText(server.tools)],
    ["authMethods", hasText(server.authMethods)],
    ["requirements", hasText(server.requirements)],
    ["link", hasText(server.docsUrl) || hasText(server.tryItNowUrl) || hasText(server.sourceUrl)],
    ["tags", hasList(server.tags)],
    ["lastUpdated", hasText(server.lastUpdated)],
  ];
  const missingFields = checks.filter(([, ok]) => !ok).map(([field]) => field);
  const requiredChecks = checks.length;
  const missingChecks = missingFields.length;
  const updatedAt = formatIsoDate(server.lastUpdated);
  return {
    entity: "mcpServers",
    id: server.id,
    name: server.name,
    slug: server.slug,
    href: `/aixcelerator/mcp/${server.slug || server.id}`,
    status: server.status || "unknown",
    visibility: server.visibility || "unknown",
    source: pickSource(server.source || server.sourceName),
    updatedAt,
    isFresh: isFreshDate(server.lastUpdated, freshnessDays),
    requiredChecks,
    missingChecks,
    missingFields,
    completenessScore: toScore(requiredChecks, missingChecks),
  };
}

function evaluateUseCase(useCase: UseCase, freshnessDays: number): CatalogHealthRow {
  const checks: Array<[string, boolean]> = [
    ["summary", hasText(useCase.summary) || hasText(useCase.longDescription)],
    ["industry", hasText(useCase.industry)],
    ["status", hasText(useCase.status)],
    ["visibility", hasText(useCase.visibility)],
    ["source", hasText(useCase.source) || hasText(useCase.sourceName)],
    ["problem", hasText(useCase.problem)],
    ["approach", hasText(useCase.approach)],
    ["outcomes", hasText(useCase.outcomes)],
    ["requirements", hasText(useCase.requirements)],
    ["linkedAgentsOrMcp", hasList(useCase.agents) || hasList(useCase.mcpServers)],
    ["tags", hasList(useCase.tags)],
    ["lastUpdated", hasText(useCase.lastUpdated)],
  ];
  const missingFields = checks.filter(([, ok]) => !ok).map(([field]) => field);
  const requiredChecks = checks.length;
  const missingChecks = missingFields.length;
  const updatedAt = formatIsoDate(useCase.lastUpdated);
  return {
    entity: "useCases",
    id: useCase.id,
    name: useCase.title,
    slug: useCase.slug,
    href: `/use-cases/${useCase.slug || useCase.id}`,
    status: useCase.status || "unknown",
    visibility: useCase.visibility || "unknown",
    source: pickSource(useCase.source || useCase.sourceName),
    updatedAt,
    isFresh: isFreshDate(useCase.lastUpdated, freshnessDays),
    requiredChecks,
    missingChecks,
    missingFields,
    completenessScore: toScore(requiredChecks, missingChecks),
  };
}

function evaluateSkill(skill: Skill, freshnessDays: number): CatalogHealthRow {
  const checks: Array<[string, boolean]> = [
    ["summary", hasText(skill.summary) || hasText(skill.longDescription)],
    ["category", hasText(skill.category)],
    ["provider", hasText(skill.provider) || hasText(skill.sourceName)],
    ["status", hasText(skill.status)],
    ["visibility", hasText(skill.visibility)],
    ["source", hasText(skill.source) || hasText(skill.sourceName)],
    ["inputs", hasText(skill.inputs)],
    ["outputs", hasText(skill.outputs)],
    ["requirements", hasText(skill.requirements) || hasText(skill.prerequisites)],
    ["toolsRequired", hasText(skill.toolsRequired)],
    ["link", hasText(skill.docsUrl) || hasText(skill.demoUrl) || hasText(skill.sourceUrl)],
    ["lastUpdated", hasText(skill.lastUpdated)],
  ];
  const missingFields = checks.filter(([, ok]) => !ok).map(([field]) => field);
  const requiredChecks = checks.length;
  const missingChecks = missingFields.length;
  const updatedAt = formatIsoDate(skill.lastUpdated);
  return {
    entity: "skills",
    id: skill.id,
    name: skill.name,
    slug: skill.slug,
    href: `/aixcelerator/skills/${skill.slug || skill.id}`,
    status: skill.status || "unknown",
    visibility: skill.visibility || "unknown",
    source: pickSource(skill.source || skill.sourceName),
    updatedAt,
    isFresh: isFreshDate(skill.lastUpdated, freshnessDays),
    requiredChecks,
    missingChecks,
    missingFields,
    completenessScore: toScore(requiredChecks, missingChecks),
  };
}

function evaluatePodcast(episode: PodcastEpisode, freshnessDays: number): CatalogHealthRow {
  const checks: Array<[string, boolean]> = [
    ["title", hasText(episode.title)],
    ["publishedDate", hasText(episode.publishedDate)],
    ["description", hasText(typeof episode.description === "string" ? episode.description : "")],
    ["audio", hasText(episode.audioUrl) || hasText(episode.buzzsproutEmbedCode)],
    ["transcript", hasText(typeof episode.transcript === "string" ? episode.transcript : "")],
    ["coverImage", hasText(episode.coverImageUrl)],
    ["tags", hasList(episode.tags)],
  ];
  const missingFields = checks.filter(([, ok]) => !ok).map(([field]) => field);
  const requiredChecks = checks.length;
  const missingChecks = missingFields.length;
  const updatedAt = formatIsoDate(episode.updatedAt || episode.publishedDate);
  return {
    entity: "podcasts",
    id: episode.id,
    name: episode.title,
    slug: episode.slug,
    href: `/resources/podcasts/${episode.slug || episode.id}`,
    status: "published",
    visibility: "public",
    source: pickSource(episode.podcastType, "internal"),
    updatedAt,
    isFresh: isFreshDate(episode.publishedDate, freshnessDays),
    requiredChecks,
    missingChecks,
    missingFields,
    completenessScore: toScore(requiredChecks, missingChecks),
  };
}

function summarize(rows: CatalogHealthRow[]): CatalogHealthSummary {
  const total = rows.length;
  const fresh = rows.filter((row) => row.isFresh).length;
  const complete = rows.filter((row) => row.missingChecks === 0).length;
  const averageCompleteness = total
    ? Math.round(rows.reduce((acc, row) => acc + row.completenessScore, 0) / total)
    : 0;
  return {
    total,
    fresh,
    stale: total - fresh,
    complete,
    incomplete: total - complete,
    averageCompleteness,
  };
}

async function tryFetch<T>(
  entity: CatalogHealthEntity,
  fetcher: () => Promise<T[]>,
  warnings: CatalogHealthReport["warnings"]
) {
  try {
    return await fetcher();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    warnings.push({ entity, message });
    return [];
  }
}

export async function buildCatalogHealthReport(options: {
  allowPrivate?: boolean;
  freshnessDays?: number;
  maxRecordsPerEntity?: number;
} = {}): Promise<CatalogHealthReport> {
  const allowPrivate = Boolean(options.allowPrivate);
  const freshnessDays =
    typeof options.freshnessDays === "number" && options.freshnessDays > 0
      ? Math.floor(options.freshnessDays)
      : Number(process.env.CATALOG_HEALTH_FRESH_DAYS || 90);
  const maxRecordsPerEntity =
    typeof options.maxRecordsPerEntity === "number" && options.maxRecordsPerEntity > 0
      ? Math.floor(options.maxRecordsPerEntity)
      : Number(process.env.CATALOG_HEALTH_MAX_RECORDS || 1000);
  const visibilityFilter = allowPrivate ? undefined : "public";
  const warnings: CatalogHealthReport["warnings"] = [];

  const [agents, mcpServers, useCases, skills, podcasts] = await Promise.all([
    tryFetch("agents", () => fetchAgents(visibilityFilter, { maxRecords: maxRecordsPerEntity }), warnings),
    tryFetch("mcpServers", () => fetchMCPServers(visibilityFilter, { maxRecords: maxRecordsPerEntity }), warnings),
    tryFetch("useCases", () => fetchUseCases(visibilityFilter, { maxRecords: maxRecordsPerEntity }), warnings),
    tryFetch("skills", () => fetchSkills(visibilityFilter, { maxRecords: maxRecordsPerEntity }), warnings),
    tryFetch("podcasts", () => fetchPodcastEpisodes({ maxRecords: maxRecordsPerEntity, sortBy: "latest" }), warnings),
  ]);

  const rows: CatalogHealthRow[] = [
    ...agents.map((item) => evaluateAgent(item, freshnessDays)),
    ...mcpServers.map((item) => evaluateMCPServer(item, freshnessDays)),
    ...useCases.map((item) => evaluateUseCase(item, freshnessDays)),
    ...skills.map((item) => evaluateSkill(item, freshnessDays)),
    ...podcasts.map((item) => evaluatePodcast(item, freshnessDays)),
  ];

  rows.sort((a, b) => {
    if (a.completenessScore !== b.completenessScore) {
      return a.completenessScore - b.completenessScore;
    }
    return a.name.localeCompare(b.name);
  });

  const summaryByEntity = {
    agents: summarize(rows.filter((row) => row.entity === "agents")),
    mcpServers: summarize(rows.filter((row) => row.entity === "mcpServers")),
    useCases: summarize(rows.filter((row) => row.entity === "useCases")),
    skills: summarize(rows.filter((row) => row.entity === "skills")),
    podcasts: summarize(rows.filter((row) => row.entity === "podcasts")),
  };

  return {
    generatedAt: new Date().toISOString(),
    freshnessDays,
    maxRecordsPerEntity,
    totals: {
      rows: rows.length,
      warnings: warnings.length,
    },
    summaryByEntity,
    warnings,
    rows,
  };
}

export function catalogHealthRowsToCsv(rows: CatalogHealthRow[]) {
  const headers = [
    "entity",
    "id",
    "name",
    "slug",
    "href",
    "status",
    "visibility",
    "source",
    "updatedAt",
    "isFresh",
    "completenessScore",
    "requiredChecks",
    "missingChecks",
    "missingFields",
  ] as const;

  const escape = (value: string) => {
    const needsQuotes = /[",\n]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((header) => {
      if (header === "missingFields") {
        return escape(row.missingFields.join("|"));
      }
      return escape(String(row[header]));
    });
    lines.push(values.join(","));
  }
  return lines.join("\n");
}
