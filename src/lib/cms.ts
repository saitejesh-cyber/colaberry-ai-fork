/* eslint-disable @typescript-eslint/no-explicit-any -- Strapi responses are polymorphic across populate modes and normalized by mapper functions in this module. */
const CMS_URL = (process.env.CMS_URL || process.env.NEXT_PUBLIC_CMS_URL || "").trim().replace(/\/$/, "");
const CMS_API_TOKEN = (process.env.CMS_API_TOKEN || process.env.NEXT_PUBLIC_CMS_API_TOKEN || "").trim();
const CMS_CACHE_TTL_MS = Number(process.env.NEXT_PUBLIC_CMS_CACHE_TTL_MS || 300000);

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

type CMSPagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

type CMSMeta = {
  pagination?: CMSPagination;
};

type CMSCollectionResponse<T = any> = {
  data?: T[];
  meta?: CMSMeta;
};

type CMSSingleResponse<T = any> = {
  data?: T | null;
  meta?: CMSMeta;
};

const cmsCache = new Map<string, CacheEntry<any>>();
const cmsInflight = new Map<string, Promise<any>>();

async function fetchCMSJson<T>(
  url: string,
  options: { cacheMs?: number; allowStaleOnError?: boolean; authMode?: "default" | "none" } = {}
): Promise<T> {
  if (!CMS_URL || !/^https?:\/\//i.test(CMS_URL)) {
    throw new Error("CMS URL is not configured. Set NEXT_PUBLIC_CMS_URL (or CMS_URL) to an absolute URL.");
  }
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`Invalid CMS request URL: ${url}`);
  }
  const authMode = options.authMode ?? "default";
  const cacheKey = `${authMode}:${url}`;
  const cacheMs = Number.isFinite(options.cacheMs) ? Number(options.cacheMs) : CMS_CACHE_TTL_MS;
  const now = Date.now();
  const cached = cmsCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  const inflight = cmsInflight.get(cacheKey);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const useAuthHeader = authMode !== "none";
  const request = fetch(url, {
    cache: "no-store",
    headers: useAuthHeader && CMS_API_TOKEN
      ? {
          Authorization: `Bearer ${CMS_API_TOKEN}`,
        }
      : undefined,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = new Error(`CMS request failed: ${res.status}`);
        throw err;
      }
      return (await res.json()) as T;
    })
    .catch(async (error) => {
      const status = parseCMSStatusCode(error);
      const canRetryWithoutAuth =
        authMode === "default" &&
        useAuthHeader &&
        (status === 401 || status === 403);

      if (!canRetryWithoutAuth) {
        throw error;
      }

      const fallbackRes = await fetch(url, { cache: "no-store" });
      if (!fallbackRes.ok) {
        throw new Error(`CMS request failed: ${fallbackRes.status}`);
      }
      return (await fallbackRes.json()) as T;
    })
    .then((json) => {
      if (cacheMs > 0) {
        cmsCache.set(cacheKey, { data: json, expiresAt: now + cacheMs });
      }
      return json;
    })
    .catch((error) => {
      if (options.allowStaleOnError && cached) {
        return cached.data as T;
      }
      throw error;
    })
    .finally(() => {
      cmsInflight.delete(cacheKey);
    });

  cmsInflight.set(cacheKey, request);
  return request;
}

function parseCMSStatusCode(error: unknown): number | null {
  const message = error instanceof Error ? error.message : "";
  const match = message.match(/CMS request failed:\s*(\d{3})/);
  if (!match) return null;
  const status = Number(match[1]);
  return Number.isFinite(status) ? status : null;
}

export type Tag = {
  name: string;
  slug: string;
};

export type Company = {
  name: string;
  slug: string;
  website?: string;
  logoUrl?: string | null;
};

export type PlatformLink = {
  platform: string;
  url?: string | null;
};

export type GlobalNavLink = {
  label: string;
  href: string;
  target?: string | null;
  icon?: string | null;
  order?: number | null;
  group?: string | null;
  children?: GlobalNavLink[];
};

export type GlobalNavColumn = {
  title: string;
  links: GlobalNavLink[];
};

export type GlobalNavigation = {
  headerLinks: GlobalNavLink[];
  footerColumns: GlobalNavColumn[];
  cta?: GlobalNavLink | null;
  socialLinks: GlobalNavLink[];
  legalLinks: GlobalNavLink[];
};

export type PodcastEpisode = {
  id: number;
  title: string;
  slug: string;
  publishedDate: string | null;
  updatedAt?: string | null;
  podcastType?: string | null;
  description?: any;
  transcript?: any;
  transcriptSegments?: { start: number; end?: number | null; text: string }[] | null;
  transcriptStatus?: string | null;
  transcriptSource?: string | null;
  transcriptGeneratedAt?: string | null;
  transcriptSrt?: string | null;
  transcriptVtt?: string | null;
  episodeNumber?: number | null;
  duration?: string | null;
  audioUrl?: string | null;
  buzzsproutEmbedCode?: string | null;
  useNativePlayer?: boolean | null;
  viewCount?: number | null;
  playCount?: number | null;
  shareCount?: number | null;
  subscribeCount?: number | null;
  clickCount?: number | null;
  tags: Tag[];
  companies: Company[];
  platformLinks: PlatformLink[];
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
};

export type PodcastSortBy = "latest" | "trending";

export type Agent = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  longDescription?: string | null;
  keyBenefits?: string | null;
  useCases?: string | null;
  limitations?: string | null;
  requirements?: string | null;
  exampleWorkflow?: string | null;
  whatItDoes?: string | null;
  outcomes?: string | null;
  coreTasks?: string | null;
  inputs?: string | null;
  outputs?: string | null;
  tools?: string | null;
  executionModes?: string | null;
  orchestration?: string | null;
  securityCompliance?: string | null;
  docsUrl?: string | null;
  demoUrl?: string | null;
  changelogUrl?: string | null;
  usageCount?: number | null;
  rating?: number | null;
  lastUpdated?: string | null;
  status?: string | null;
  visibility?: "public" | "private" | string | null;
  source?: "internal" | "external" | "partner" | string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  verified?: boolean | null;
  industry?: string | null;
  tags?: Tag[];
  companies?: Company[];
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
};

export type MCPServer = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  longDescription?: string | null;
  keyBenefits?: string | null;
  useCases?: string | null;
  limitations?: string | null;
  requirements?: string | null;
  exampleWorkflow?: string | null;
  registryName?: string | null;
  serverType?: string | null;
  primaryFunction?: string | null;
  openSource?: boolean | null;
  language?: string | null;
  capabilities?: string | null;
  tools?: string | null;
  authMethods?: string | null;
  hostingOptions?: string | null;
  compatibility?: string | null;
  pricing?: string | null;
  tryItNowUrl?: string | null;
  usageCount?: number | null;
  rating?: number | null;
  lastUpdated?: string | null;
  status?: string | null;
  visibility?: "public" | "private" | string | null;
  source?: "internal" | "external" | "partner" | string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  verified?: boolean | null;
  industry?: string | null;
  category?: string | null;
  docsUrl?: string | null;
  tags?: Tag[];
  companies?: Company[];
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
};

export type ArticleCategory = {
  name: string;
  slug: string;
};

export type ArticleAuthor = {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export type ArticleMedia = {
  url: string;
  alt?: string | null;
};

export type ArticleBlock = {
  __component: string;
  body?: string | null;
  title?: string | null;
  file?: unknown;
  files?: unknown;
};

export type Article = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  category?: ArticleCategory | null;
  author?: ArticleAuthor | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  blocks: ArticleBlock[];
  publishedAt?: string | null;
  updatedAt?: string | null;
};

export type UseCaseReference = {
  name: string;
  slug: string;
};

export type UseCase = {
  id: number;
  title: string;
  slug: string;
  summary?: string | null;
  longDescription?: string | null;
  status?: string | null;
  visibility?: "public" | "private" | string | null;
  source?: "internal" | "external" | "partner" | string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  verified?: boolean | null;
  industry?: string | null;
  category?: string | null;
  problem?: string | null;
  approach?: string | null;
  outcomes?: string | null;
  metrics?: string | null;
  keyBenefits?: string | null;
  implementationSteps?: string | null;
  requirements?: string | null;
  limitations?: string | null;
  timeline?: string | null;
  docsUrl?: string | null;
  demoUrl?: string | null;
  lastUpdated?: string | null;
  tags: Tag[];
  companies: Company[];
  agents: UseCaseReference[];
  mcpServers: UseCaseReference[];
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
};

export type Skill = {
  id: number;
  name: string;
  slug: string;
  summary?: string | null;
  longDescription?: string | null;
  category?: string | null;
  provider?: string | null;
  status?: string | null;
  visibility?: "public" | "private" | string | null;
  source?: "internal" | "external" | "partner" | string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  verified?: boolean | null;
  industry?: string | null;
  skillType?: string | null;
  inputs?: string | null;
  outputs?: string | null;
  prerequisites?: string | null;
  toolsRequired?: string | null;
  modelsSupported?: string | null;
  securityNotes?: string | null;
  keyBenefits?: string | null;
  limitations?: string | null;
  requirements?: string | null;
  exampleWorkflow?: string | null;
  usageCount?: number | null;
  rating?: number | null;
  lastUpdated?: string | null;
  docsUrl?: string | null;
  demoUrl?: string | null;
  tags: Tag[];
  companies: Company[];
  agents: UseCaseReference[];
  mcpServers: UseCaseReference[];
  useCases: UseCaseReference[];
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
};

function mapNavLink(item: any): GlobalNavLink {
  const attrs = item?.attributes ?? item;
  const rawOrder = attrs?.order;
  const parsedOrder = typeof rawOrder === "number" ? rawOrder : rawOrder ? Number(rawOrder) : null;
  const order = Number.isFinite(parsedOrder) ? parsedOrder : null;
  const children = normalizeNavLinks(attrs?.children ?? []);

  return {
    label: attrs?.label ?? "",
    href: attrs?.href ?? "",
    target: attrs?.target ?? null,
    icon: attrs?.icon ?? null,
    order,
    group: attrs?.group ?? null,
    children,
  };
}

function sortNavLinks(links: GlobalNavLink[]) {
  return links
    .map((link, index) => ({ link, index }))
    .sort((a, b) => {
      const aOrder = typeof a.link.order === "number" ? a.link.order : null;
      const bOrder = typeof b.link.order === "number" ? b.link.order : null;
      if (aOrder !== null && bOrder !== null) {
        return aOrder - bOrder || a.index - b.index;
      }
      if (aOrder !== null) return -1;
      if (bOrder !== null) return 1;
      return a.index - b.index;
    })
    .map(({ link }) => link);
}

function normalizeNavLinks(items: any): GlobalNavLink[] {
  const data = Array.isArray(items?.data)
    ? items.data
    : Array.isArray(items)
    ? items
    : Array.isArray(items?.links)
    ? items.links
    : Array.isArray(items?.links?.data)
    ? items.links.data
    : [];
  if (!Array.isArray(data)) return [];
  const links = data.map(mapNavLink).filter((link) => link.label && link.href);
  return sortNavLinks(links);
}

function normalizeCta(item: any): GlobalNavLink | null {
  if (!item) return null;
  const raw = Array.isArray(item?.data) ? item.data[0] : item?.data ?? item;
  const link = mapNavLink(raw);
  if (!link.label || !link.href) return null;
  return link;
}

function normalizeFooterColumns(items: any): GlobalNavColumn[] {
  const data = Array.isArray(items?.data) ? items.data : items;
  if (!Array.isArray(data)) return [];

  const hasNestedLinks = data.some((entry) => {
    const attrs = entry?.attributes ?? entry;
    return Array.isArray(attrs?.links) || Array.isArray(attrs?.links?.data);
  });

  if (hasNestedLinks) {
    return data
      .map((entry) => {
        const attrs = entry?.attributes ?? entry;
        const title = attrs?.title ?? attrs?.label ?? attrs?.group ?? "";
        const links = normalizeNavLinks(attrs?.links ?? []);
        return { title, links };
      })
      .filter((column) => column.title || column.links.length > 0);
  }

  const links = normalizeNavLinks(data);
  const grouped = new Map<string, GlobalNavLink[]>();
  links.forEach((link) => {
    const key = link.group ?? "Links";
    const bucket = grouped.get(key) ?? [];
    bucket.push(link);
    grouped.set(key, bucket);
  });

  return Array.from(grouped.entries()).map(([title, groupLinks]) => ({
    title,
    links: sortNavLinks(groupLinks),
  }));
}

function normalizeGlobalNavigation(payload: any): GlobalNavigation | null {
  const attrs = payload?.data?.attributes ?? payload?.attributes ?? payload?.data ?? payload;
  if (!attrs) return null;

  return {
    headerLinks: normalizeNavLinks(attrs?.headerLinks ?? []),
    footerColumns: normalizeFooterColumns(attrs?.footerColumns ?? []),
    cta: normalizeCta(attrs?.cta ?? null),
    socialLinks: normalizeNavLinks(attrs?.socialLinks ?? []),
    legalLinks: normalizeNavLinks(attrs?.legalLinks ?? []),
  };
}

function mapTag(item: any): Tag {
  const attrs = item?.attributes ?? item;
  return {
    name: attrs?.name ?? "",
    slug: attrs?.slug ?? "",
  };
}

function mapCompany(item: any): Company {
  const attrs = item?.attributes ?? item;
  const logoUrl = attrs?.logo?.data?.[0]?.attributes?.url ?? null;
  return {
    name: attrs?.name ?? "",
    slug: attrs?.slug ?? "",
    website: attrs?.website ?? null,
    logoUrl,
  };
}

function normalizeMediaUrl(rawUrl?: string | null) {
  if (!rawUrl) return null;
  return rawUrl.startsWith("/") ? `${CMS_URL}${rawUrl}` : rawUrl;
}

function mapArticle(item: any): Article {
  const attrs = item?.attributes ?? item;
  const rawCoverUrl =
    attrs?.cover?.data?.attributes?.url ??
    attrs?.cover?.attributes?.url ??
    attrs?.cover?.url ??
    null;
  const coverImageUrl = normalizeMediaUrl(rawCoverUrl);
  const coverImageAlt =
    attrs?.cover?.data?.attributes?.alternativeText ??
    attrs?.cover?.attributes?.alternativeText ??
    attrs?.cover?.alternativeText ??
    null;
  const categoryAttrs = attrs?.category?.data?.attributes ?? attrs?.category?.attributes ?? attrs?.category ?? null;
  const authorAttrs = attrs?.author?.data?.attributes ?? attrs?.author?.attributes ?? attrs?.author ?? null;
  const rawAvatarUrl =
    authorAttrs?.avatar?.data?.attributes?.url ??
    authorAttrs?.avatar?.attributes?.url ??
    authorAttrs?.avatar?.url ??
    null;

  return {
    id: item?.id ?? attrs?.id ?? 0,
    title: attrs?.title ?? "",
    slug: attrs?.slug ?? "",
    description: attrs?.description ?? null,
    category: categoryAttrs
      ? {
          name: categoryAttrs?.name ?? "",
          slug: categoryAttrs?.slug ?? "",
        }
      : null,
    author: authorAttrs
      ? {
          name: authorAttrs?.name ?? "",
          email: authorAttrs?.email ?? null,
          avatarUrl: normalizeMediaUrl(rawAvatarUrl),
        }
      : null,
    coverImageUrl,
    coverImageAlt,
    blocks: Array.isArray(attrs?.blocks) ? attrs.blocks : [],
    publishedAt: attrs?.publishedAt ?? null,
    updatedAt: attrs?.updatedAt ?? null,
  };
}

function mapUseCaseReference(item: any): UseCaseReference {
  const attrs = item?.attributes ?? item;
  return {
    name: attrs?.name ?? attrs?.title ?? "",
    slug: attrs?.slug ?? "",
  };
}

function mapReferenceList(value: any): UseCaseReference[] {
  const list = Array.isArray(value?.data)
    ? value.data
    : Array.isArray(value)
    ? value
    : [];
  return list
    .map(mapUseCaseReference)
    .filter((entry: UseCaseReference) => Boolean(entry.name || entry.slug));
}

function mapUseCase(item: any): UseCase {
  const attrs = item?.attributes ?? item;
  const tags = attrs?.tags?.data?.map(mapTag) ?? (attrs?.tags ?? []).map(mapTag);
  const companies =
    attrs?.companies?.data?.map(mapCompany) ??
    (attrs?.companies ?? []).map(mapCompany);
  const agents: UseCaseReference[] =
    attrs?.agents?.data?.map(mapUseCaseReference) ??
    (attrs?.agents ?? []).map(mapUseCaseReference);
  const mcpServers: UseCaseReference[] =
    attrs?.mcpServers?.data?.map(mapUseCaseReference) ??
    (attrs?.mcpServers ?? []).map(mapUseCaseReference);
  const rawCoverUrl = attrs?.coverImage?.data?.attributes?.url ?? attrs?.coverImage?.attributes?.url ?? null;
  const coverImageUrl = normalizeMediaUrl(rawCoverUrl);
  const coverImageAlt =
    attrs?.coverImage?.data?.attributes?.alternativeText ??
    attrs?.coverImage?.attributes?.alternativeText ??
    null;

  return {
    id: item?.id ?? attrs?.id ?? 0,
    title: attrs?.title ?? "",
    slug: attrs?.slug ?? "",
    summary: attrs?.summary ?? null,
    longDescription: attrs?.longDescription ?? null,
    status: attrs?.status ?? null,
    visibility: attrs?.visibility ?? null,
    source: attrs?.source ?? null,
    sourceUrl: attrs?.sourceUrl ?? null,
    sourceName: attrs?.sourceName ?? null,
    verified: attrs?.verified ?? null,
    industry: attrs?.industry ?? null,
    category: attrs?.category ?? null,
    problem: attrs?.problem ?? null,
    approach: attrs?.approach ?? null,
    outcomes: attrs?.outcomes ?? null,
    metrics: attrs?.metrics ?? null,
    keyBenefits: attrs?.keyBenefits ?? null,
    implementationSteps: attrs?.implementationSteps ?? null,
    requirements: attrs?.requirements ?? null,
    limitations: attrs?.limitations ?? null,
    timeline: attrs?.timeline ?? null,
    docsUrl: attrs?.docsUrl ?? null,
    demoUrl: attrs?.demoUrl ?? null,
    lastUpdated: attrs?.lastUpdated ?? attrs?.updatedAt ?? null,
    tags,
    companies,
    agents: agents.filter((entry: UseCaseReference) => Boolean(entry.name || entry.slug)),
    mcpServers: mcpServers.filter((entry: UseCaseReference) => Boolean(entry.name || entry.slug)),
    coverImageUrl,
    coverImageAlt,
  };
}

function mapSkill(item: any): Skill {
  const attrs = item?.attributes ?? item;
  const tags = attrs?.tags?.data?.map(mapTag) ?? (attrs?.tags ?? []).map(mapTag);
  const companies =
    attrs?.companies?.data?.map(mapCompany) ??
    (attrs?.companies ?? []).map(mapCompany);
  const agentsPrimary = mapReferenceList(attrs?.agents);
  const agents = agentsPrimary.length
    ? agentsPrimary
    : mapReferenceList(attrs?.relatedAgents);
  const mcpPrimary = mapReferenceList(attrs?.mcpServers);
  const mcpSecondary = mapReferenceList(attrs?.relatedMcpServers);
  const mcpServers = mcpPrimary.length
    ? mcpPrimary
    : mcpSecondary.length
    ? mcpSecondary
    : mapReferenceList(attrs?.relatedMCPServers);
  const useCasesPrimary = mapReferenceList(attrs?.useCases);
  const useCases = useCasesPrimary.length
    ? useCasesPrimary
    : mapReferenceList(attrs?.relatedUseCases);
  const rawCoverUrl =
    attrs?.coverImage?.data?.attributes?.url ??
    attrs?.coverImage?.attributes?.url ??
    null;
  const coverImageUrl = normalizeMediaUrl(rawCoverUrl);
  const coverImageAlt =
    attrs?.coverImage?.data?.attributes?.alternativeText ??
    attrs?.coverImage?.attributes?.alternativeText ??
    null;

  return {
    id: item?.id ?? attrs?.id ?? 0,
    name: attrs?.name ?? "",
    slug: attrs?.slug ?? "",
    summary: attrs?.summary ?? attrs?.description ?? null,
    longDescription: attrs?.longDescription ?? null,
    category: attrs?.category ?? null,
    provider: attrs?.provider ?? null,
    status: attrs?.status ?? null,
    visibility: attrs?.visibility ?? null,
    source: attrs?.source ?? null,
    sourceUrl: attrs?.sourceUrl ?? null,
    sourceName: attrs?.sourceName ?? null,
    verified: attrs?.verified ?? null,
    industry: attrs?.industry ?? null,
    skillType: attrs?.skillType ?? null,
    inputs: attrs?.inputs ?? null,
    outputs: attrs?.outputs ?? null,
    prerequisites: attrs?.prerequisites ?? null,
    toolsRequired: attrs?.toolsRequired ?? attrs?.tools ?? null,
    modelsSupported: attrs?.modelsSupported ?? null,
    securityNotes: attrs?.securityNotes ?? null,
    keyBenefits: attrs?.keyBenefits ?? null,
    limitations: attrs?.limitations ?? null,
    requirements: attrs?.requirements ?? null,
    exampleWorkflow: attrs?.exampleWorkflow ?? null,
    usageCount: typeof attrs?.usageCount === "number" ? attrs.usageCount : null,
    rating: typeof attrs?.rating === "number" ? attrs.rating : null,
    lastUpdated: attrs?.lastUpdated ?? attrs?.updatedAt ?? null,
    docsUrl: attrs?.docsUrl ?? null,
    demoUrl: attrs?.demoUrl ?? null,
    tags,
    companies,
    agents,
    mcpServers,
    useCases,
    coverImageUrl,
    coverImageAlt,
  };
}

function mapEpisode(item: any): PodcastEpisode {
  const attrs = item?.attributes ?? item;
  const tags =
    attrs?.tags?.data?.map(mapTag) ??
    (attrs?.tags ?? []).map(mapTag);
  const companies =
    attrs?.companies?.data?.map(mapCompany) ??
    (attrs?.companies ?? []).map(mapCompany);
  const rawCoverUrl = attrs?.coverImage?.data?.attributes?.url ?? null;
  const coverImageUrl =
    rawCoverUrl && rawCoverUrl.startsWith("/") ? `${CMS_URL}${rawCoverUrl}` : rawCoverUrl;
  const coverImageAlt = attrs?.coverImage?.data?.attributes?.alternativeText ?? null;

  return {
    id: item?.id ?? attrs?.id ?? 0,
    title: attrs?.title ?? "",
    slug: attrs?.slug ?? "",
    publishedDate: attrs?.publishedDate ?? null,
    updatedAt: attrs?.updatedAt ?? null,
    podcastType: attrs?.podcastType ?? null,
    description: attrs?.description ?? null,
    transcript: attrs?.transcript ?? null,
    transcriptSegments: attrs?.transcriptSegments ?? null,
    transcriptStatus: attrs?.transcriptStatus ?? null,
    transcriptSource: attrs?.transcriptSource ?? null,
    transcriptGeneratedAt: attrs?.transcriptGeneratedAt ?? null,
    transcriptSrt: attrs?.transcriptSrt ?? null,
    transcriptVtt: attrs?.transcriptVtt ?? null,
    episodeNumber: attrs?.episodeNumber ?? null,
    duration: attrs?.duration ?? null,
    audioUrl: attrs?.audioUrl ?? null,
    buzzsproutEmbedCode: attrs?.buzzsproutEmbedCode ?? null,
    useNativePlayer: attrs?.useNativePlayer ?? null,
    viewCount: typeof attrs?.viewCount === "number" ? attrs.viewCount : null,
    playCount: typeof attrs?.playCount === "number" ? attrs.playCount : null,
    shareCount: typeof attrs?.shareCount === "number" ? attrs.shareCount : null,
    subscribeCount: typeof attrs?.subscribeCount === "number" ? attrs.subscribeCount : null,
    clickCount: typeof attrs?.clickCount === "number" ? attrs.clickCount : null,
    tags,
    companies,
    platformLinks: attrs?.platformLinks ?? [],
    coverImageUrl,
    coverImageAlt,
  };
}

function mapAgent(item: any): Agent {
  const attrs = item?.attributes ?? item;
  const tags =
    attrs?.tags?.data?.map(mapTag) ??
    (attrs?.tags ?? []).map(mapTag);
  const companies =
    attrs?.companies?.data?.map(mapCompany) ??
    (attrs?.companies ?? []).map(mapCompany);
  const rawCoverUrl = attrs?.coverImage?.data?.attributes?.url ?? null;
  const coverImageUrl =
    rawCoverUrl && rawCoverUrl.startsWith("/") ? `${CMS_URL}${rawCoverUrl}` : rawCoverUrl;
  const coverImageAlt = attrs?.coverImage?.data?.attributes?.alternativeText ?? null;

  return {
    id: item?.id ?? attrs?.id ?? 0,
    name: attrs?.name ?? "",
    slug: attrs?.slug ?? "",
    description: attrs?.description ?? null,
    longDescription: attrs?.longDescription ?? null,
    keyBenefits: attrs?.keyBenefits ?? null,
    useCases: attrs?.useCases ?? null,
    limitations: attrs?.limitations ?? null,
    requirements: attrs?.requirements ?? null,
    exampleWorkflow: attrs?.exampleWorkflow ?? null,
    whatItDoes: attrs?.whatItDoes ?? null,
    outcomes: attrs?.outcomes ?? null,
    coreTasks: attrs?.coreTasks ?? null,
    inputs: attrs?.inputs ?? null,
    outputs: attrs?.outputs ?? null,
    tools: attrs?.tools ?? null,
    executionModes: attrs?.executionModes ?? null,
    orchestration: attrs?.orchestration ?? null,
    securityCompliance: attrs?.securityCompliance ?? null,
    docsUrl: attrs?.docsUrl ?? null,
    demoUrl: attrs?.demoUrl ?? null,
    changelogUrl: attrs?.changelogUrl ?? null,
    usageCount: typeof attrs?.usageCount === "number" ? attrs.usageCount : null,
    rating: typeof attrs?.rating === "number" ? attrs.rating : null,
    lastUpdated: attrs?.lastUpdated ?? attrs?.updatedAt ?? null,
    status: attrs?.status ?? null,
    visibility: attrs?.visibility ?? null,
    source: attrs?.source ?? null,
    sourceUrl: attrs?.sourceUrl ?? null,
    sourceName: attrs?.sourceName ?? null,
    verified: attrs?.verified ?? null,
    industry: attrs?.industry ?? null,
    tags,
    companies,
    coverImageUrl,
    coverImageAlt,
  };
}

function mapMCPServer(item: any): MCPServer {
  const attrs = item?.attributes ?? item;
  const tags =
    attrs?.tags?.data?.map(mapTag) ??
    (attrs?.tags ?? []).map(mapTag);
  const companies =
    attrs?.companies?.data?.map(mapCompany) ??
    (attrs?.companies ?? []).map(mapCompany);
  const rawCoverUrl = attrs?.coverImage?.data?.attributes?.url ?? null;
  const coverImageUrl =
    rawCoverUrl && rawCoverUrl.startsWith("/") ? `${CMS_URL}${rawCoverUrl}` : rawCoverUrl;
  const coverImageAlt = attrs?.coverImage?.data?.attributes?.alternativeText ?? null;

  return {
    id: item?.id ?? attrs?.id ?? 0,
    name: attrs?.name ?? "",
    slug: attrs?.slug ?? "",
    description: attrs?.description ?? null,
    longDescription: attrs?.longDescription ?? null,
    keyBenefits: attrs?.keyBenefits ?? null,
    useCases: attrs?.useCases ?? null,
    limitations: attrs?.limitations ?? null,
    requirements: attrs?.requirements ?? null,
    exampleWorkflow: attrs?.exampleWorkflow ?? null,
    registryName: attrs?.registryName ?? null,
    serverType: attrs?.serverType ?? null,
    primaryFunction: attrs?.primaryFunction ?? null,
    openSource: typeof attrs?.openSource === "boolean" ? attrs.openSource : null,
    language: attrs?.language ?? null,
    capabilities: attrs?.capabilities ?? null,
    tools: attrs?.tools ?? null,
    authMethods: attrs?.authMethods ?? null,
    hostingOptions: attrs?.hostingOptions ?? null,
    compatibility: attrs?.compatibility ?? null,
    pricing: attrs?.pricing ?? null,
    tryItNowUrl: attrs?.tryItNowUrl ?? null,
    usageCount: typeof attrs?.usageCount === "number" ? attrs.usageCount : null,
    rating: typeof attrs?.rating === "number" ? attrs.rating : null,
    lastUpdated: attrs?.lastUpdated ?? attrs?.updatedAt ?? null,
    status: attrs?.status ?? null,
    visibility: attrs?.visibility ?? null,
    source: attrs?.source ?? null,
    sourceUrl: attrs?.sourceUrl ?? null,
    sourceName: attrs?.sourceName ?? null,
    verified: attrs?.verified ?? null,
    industry: attrs?.industry ?? null,
    category: attrs?.category ?? null,
    docsUrl: attrs?.docsUrl ?? null,
    tags,
    companies,
    coverImageUrl,
    coverImageAlt,
  };
}

function getTimestamp(value?: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCount(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function getPodcastTrendingScore(episode: PodcastEpisode, now = Date.now()) {
  const views = getCount(episode.viewCount);
  const plays = getCount(episode.playCount);
  const shares = getCount(episode.shareCount);
  const subscribes = getCount(episode.subscribeCount);
  const clicks = getCount(episode.clickCount);
  const engagement = views + plays * 6 + shares * 4 + subscribes * 5 + clicks * 2;

  const publishedTs = getTimestamp(episode.publishedDate || episode.updatedAt || null);
  if (!publishedTs) return engagement;

  const ageDays = Math.max((now - publishedTs) / 86_400_000, 0);
  const recencyBoost =
    ageDays <= 30 ? 1.35 : ageDays <= 90 ? 1.2 : ageDays <= 180 ? 1.08 : ageDays <= 365 ? 1.02 : 1;
  const freshness = Math.max(0, 24 - ageDays * 0.08);
  return engagement * recencyBoost + freshness;
}

export async function fetchPodcastEpisodes(options: { maxRecords?: number; sortBy?: PodcastSortBy } = {}) {
  const pageSize = 100;
  const sortBy = options.sortBy || "latest";
  const maxRecords =
    typeof options.maxRecords === "number" && options.maxRecords > 0
      ? Math.floor(options.maxRecords)
      : Number.POSITIVE_INFINITY;
  let page = 1;
  const results: PodcastEpisode[] = [];

  while (true) {
    const json = await fetchCMSJson<CMSCollectionResponse>(
      `${CMS_URL}/api/podcast-episodes` +
        `?sort=publishedDate:desc` +
        `&filters[podcastStatus][$eq]=published` +
        `&publicationState=live` +
        `&pagination[page]=${page}` +
        `&pagination[pageSize]=${pageSize}` +
        `&populate[tags][fields][0]=name` +
        `&populate[tags][fields][1]=slug` +
        `&populate[companies][fields][0]=name` +
        `&populate[companies][fields][1]=slug` +
        `&populate[coverImage][fields][0]=url` +
        `&populate[coverImage][fields][1]=alternativeText` +
        `&populate[platformLinks]=*`,
      { cacheMs: CMS_CACHE_TTL_MS }
    );

    const data = json?.data || [];
    if (!data.length) break;

    const remaining = maxRecords - results.length;
    const rows = remaining < data.length ? data.slice(0, remaining) : data;
    results.push(...rows.map(mapEpisode));
    if (results.length >= maxRecords) break;

    const pageCount = json?.meta?.pagination?.pageCount || page;
    if (page >= pageCount) break;
    page += 1;
  }

  if (sortBy === "trending") {
    const now = Date.now();
    results.sort((a, b) => {
      const scoreDiff = getPodcastTrendingScore(b, now) - getPodcastTrendingScore(a, now);
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
      return getTimestamp(b.publishedDate || b.updatedAt || null) - getTimestamp(a.publishedDate || a.updatedAt || null);
    });
  }

  return results;
}

export async function fetchGlobalNavigation(): Promise<GlobalNavigation | null> {
  if (!CMS_URL) return null;
  const json = await fetchCMSJson<CMSSingleResponse>(
    `${CMS_URL}/api/global-navigation` + `?publicationState=live` + `&populate=*`,
    { cacheMs: CMS_CACHE_TTL_MS, allowStaleOnError: true }
  );
  return normalizeGlobalNavigation(json);
}

export async function fetchPodcastBySlug(slug: string) {
  const json = await fetchCMSJson<CMSCollectionResponse>(
    `${CMS_URL}/api/podcast-episodes` +
      `?filters[slug][$eq]=${encodeURIComponent(slug)}` +
      `&filters[podcastStatus][$eq]=published` +
      `&publicationState=live` +
      `&populate[tags][fields][0]=name` +
      `&populate[tags][fields][1]=slug` +
      `&populate[companies][fields][0]=name` +
      `&populate[companies][fields][1]=slug` +
      `&populate[coverImage][fields][0]=url` +
      `&populate[coverImage][fields][1]=alternativeText` +
      `&populate[platformLinks]=*`,
    { cacheMs: CMS_CACHE_TTL_MS }
  );
  return json?.data?.[0] ? mapEpisode(json.data[0]) : null;
}

export async function fetchArticles(options: { maxRecords?: number } = {}) {
  const pageSize = 50;
  const maxRecords =
    typeof options.maxRecords === "number" && options.maxRecords > 0
      ? Math.floor(options.maxRecords)
      : Number.POSITIVE_INFINITY;
  let page = 1;
  const results: Article[] = [];

  while (true) {
    const json = await fetchCMSJson<CMSCollectionResponse>(
      `${CMS_URL}/api/articles` +
        `?sort=publishedAt:desc` +
        `&publicationState=live` +
        `&fields[0]=title` +
        `&fields[1]=slug` +
        `&fields[2]=description` +
        `&fields[3]=publishedAt` +
        `&fields[4]=updatedAt` +
        `&pagination[page]=${page}` +
        `&pagination[pageSize]=${pageSize}` +
        `&populate[cover][fields][0]=url` +
        `&populate[cover][fields][1]=alternativeText` +
        `&populate[author][fields][0]=name` +
        `&populate[author][fields][1]=email` +
        `&populate[author][populate][avatar][fields][0]=url` +
        `&populate[category][fields][0]=name` +
        `&populate[category][fields][1]=slug`,
      { cacheMs: CMS_CACHE_TTL_MS }
    );
    const data = json?.data || [];
    const remaining = Math.max(maxRecords - results.length, 0);
    if (remaining <= 0) {
      break;
    }
    results.push(...data.slice(0, remaining).map(mapArticle));
    if (results.length >= maxRecords) {
      break;
    }

    const pagination = json?.meta?.pagination;
    if (!pagination || page >= pagination.pageCount) {
      break;
    }
    page += 1;
  }

  return results;
}

export async function fetchArticleBySlug(slug: string) {
  const json = await fetchCMSJson<CMSCollectionResponse>(
    `${CMS_URL}/api/articles` +
      `?filters[slug][$eq]=${encodeURIComponent(slug)}` +
      `&publicationState=live` +
      `&populate=*`,
    { cacheMs: CMS_CACHE_TTL_MS }
  );
  return json?.data?.[0] ? mapArticle(json.data[0]) : null;
}

export async function fetchUseCases(
  visibility?: "public" | "private",
  options: { maxRecords?: number; sortBy?: "latest" | "title" } = {}
) {
  const visibilityFilter = visibility ? `&filters[visibility][$eq]=${visibility}` : "";
  const sortBy = options.sortBy === "title" ? "title" : "latest";
  const sortQuery =
    sortBy === "title"
      ? `&sort=title:asc`
      : `&sort[0]=lastUpdated:desc&sort[1]=updatedAt:desc&sort[2]=title:asc`;
  const pageSize = 50;
  const maxRecords =
    typeof options.maxRecords === "number" && options.maxRecords > 0
      ? Math.floor(options.maxRecords)
      : Number.POSITIVE_INFINITY;
  let page = 1;
  const results: UseCase[] = [];

  while (true) {
    const json = await fetchCMSJson<CMSCollectionResponse>(
      `${CMS_URL}/api/use-cases` +
        `?` +
        `${sortQuery.replace(/^&/, "")}` +
        `${visibilityFilter}` +
        `&publicationState=live` +
        `&fields[0]=title` +
        `&fields[1]=slug` +
        `&fields[2]=summary` +
        `&fields[3]=industry` +
        `&fields[4]=category` +
        `&fields[5]=status` +
        `&fields[6]=visibility` +
        `&fields[7]=source` +
        `&fields[8]=sourceName` +
        `&fields[9]=verified` +
        `&fields[10]=lastUpdated` +
        `&pagination[page]=${page}` +
        `&pagination[pageSize]=${pageSize}` +
        `&populate[tags][fields][0]=name` +
        `&populate[tags][fields][1]=slug` +
        `&populate[companies][fields][0]=name` +
        `&populate[companies][fields][1]=slug` +
        `&populate[agents][fields][0]=name` +
        `&populate[agents][fields][1]=slug` +
        `&populate[mcpServers][fields][0]=name` +
        `&populate[mcpServers][fields][1]=slug` +
        `&populate[coverImage][fields][0]=url` +
        `&populate[coverImage][fields][1]=alternativeText`,
      { cacheMs: CMS_CACHE_TTL_MS }
    );
    const data = json?.data || [];
    const remaining = Math.max(maxRecords - results.length, 0);
    if (remaining <= 0) {
      break;
    }
    results.push(...data.slice(0, remaining).map(mapUseCase));
    if (results.length >= maxRecords) {
      break;
    }

    const pagination = json?.meta?.pagination;
    if (!pagination || page >= pagination.pageCount) {
      break;
    }
    page += 1;
  }

  return results;
}

export async function fetchUseCaseBySlug(slug: string) {
  const json = await fetchCMSJson<CMSCollectionResponse>(
    `${CMS_URL}/api/use-cases` +
      `?filters[slug][$eq]=${encodeURIComponent(slug)}` +
      `&publicationState=live` +
      `&populate=*`,
    { cacheMs: CMS_CACHE_TTL_MS }
  );
  return json?.data?.[0] ? mapUseCase(json.data[0]) : null;
}

export async function fetchSkills(
  visibility?: "public" | "private",
  options: { maxRecords?: number; sortBy?: "name" | "latest" } = {}
) {
  const visibilityFilter = visibility ? `&filters[visibility][$eq]=${visibility}` : "";
  const sortBy = options.sortBy === "latest" ? "latest" : "name";
  const sortQuery =
    sortBy === "latest"
      ? `&sort[0]=lastUpdated:desc&sort[1]=updatedAt:desc&sort[2]=name:asc`
      : `&sort=name:asc`;
  const listFields =
    `&fields[0]=name` +
    `&fields[1]=slug` +
    `&fields[2]=summary` +
    `&fields[3]=category` +
    `&fields[4]=provider` +
    `&fields[5]=industry` +
    `&fields[6]=status` +
    `&fields[7]=visibility` +
    `&fields[8]=source` +
    `&fields[9]=sourceName` +
    `&fields[10]=verified` +
    `&fields[11]=usageCount` +
    `&fields[12]=rating` +
    `&fields[13]=lastUpdated`;
  const pageSize = 100;
  const maxRecords =
    typeof options.maxRecords === "number" && options.maxRecords > 0
      ? Math.floor(options.maxRecords)
      : Number.POSITIVE_INFINITY;
  let page = 1;
  const results: Skill[] = [];
  const baseQuery =
    `${CMS_URL}/api/skills` +
    `?` +
    `${sortQuery.replace(/^&/, "")}` +
    `${visibilityFilter}` +
    `&publicationState=live` +
    `${listFields}` +
    `&pagination[pageSize]=${pageSize}`;
  const fullPopulateQuery =
    `&populate[tags][fields][0]=name` +
    `&populate[tags][fields][1]=slug` +
    `&populate[companies][fields][0]=name` +
    `&populate[companies][fields][1]=slug` +
    `&populate[agents][fields][0]=name` +
    `&populate[agents][fields][1]=slug` +
    `&populate[mcpServers][fields][0]=name` +
    `&populate[mcpServers][fields][1]=slug` +
    `&populate[useCases][fields][0]=title` +
    `&populate[useCases][fields][1]=slug` +
    `&populate[relatedUseCases][fields][0]=title` +
    `&populate[relatedUseCases][fields][1]=slug` +
    `&populate[coverImage][fields][0]=url` +
    `&populate[coverImage][fields][1]=alternativeText`;
  const minimalPopulateQuery =
    `&populate[coverImage][fields][0]=url` +
    `&populate[coverImage][fields][1]=alternativeText`;

  while (true) {
    let json: CMSCollectionResponse | null = null;
    try {
      json = await fetchCMSJson<CMSCollectionResponse>(
        `${baseQuery}&pagination[page]=${page}${fullPopulateQuery}`,
        { cacheMs: CMS_CACHE_TTL_MS }
      );
    } catch (error) {
      const status = parseCMSStatusCode(error);
      const shouldTryFallback = page === 1 && results.length === 0;

      if (!shouldTryFallback) {
        throw error;
      }

      if (status === 404) {
        return [];
      }

      if (status === 400) {
        // Fallback when older Strapi schema rejects one of the populate keys.
        json = await fetchCMSJson<CMSCollectionResponse>(
          `${baseQuery}&pagination[page]=${page}${minimalPopulateQuery}`,
          { cacheMs: CMS_CACHE_TTL_MS }
        ).catch(() => null);
        if (json) {
          // recovered with minimal query
        } else {
          return [];
        }
      } else if (status === 401 || status === 403) {
        // Fallback for tokens that don't yet include skills scope.
        json = await fetchCMSJson<CMSCollectionResponse>(
          `${baseQuery}&pagination[page]=${page}${fullPopulateQuery}`,
          { cacheMs: CMS_CACHE_TTL_MS, authMode: "none" }
        ).catch(() => null);

        if (!json) {
          json = await fetchCMSJson<CMSCollectionResponse>(
            `${baseQuery}&pagination[page]=${page}${minimalPopulateQuery}`,
            { cacheMs: CMS_CACHE_TTL_MS, authMode: "none" }
          ).catch(() => null);
        }

        if (!json) {
          return [];
        }
      } else {
        throw error;
      }
    }

    if (!json) break;
    const data = json?.data || [];
    const remaining = Math.max(maxRecords - results.length, 0);
    if (remaining <= 0) {
      break;
    }
    results.push(...data.slice(0, remaining).map(mapSkill));
    if (results.length >= maxRecords) {
      break;
    }

    const pagination = json?.meta?.pagination;
    if (!pagination || page >= pagination.pageCount) {
      break;
    }
    page += 1;
  }

  return results;
}

export async function fetchSkillBySlug(slug: string) {
  const json = await fetchCMSJson<CMSCollectionResponse>(
    `${CMS_URL}/api/skills` +
      `?filters[slug][$eq]=${encodeURIComponent(slug)}` +
      `&publicationState=live` +
      `&populate=*`,
    { cacheMs: CMS_CACHE_TTL_MS }
  );
  return json?.data?.[0] ? mapSkill(json.data[0]) : null;
}

export async function fetchAgents(
  visibility?: "public" | "private",
  options: { maxRecords?: number; sortBy?: "name" | "latest" } = {}
) {
  const visibilityFilter = visibility ? `&filters[visibility][$eq]=${visibility}` : "";
  const sortBy = options.sortBy === "latest" ? "latest" : "name";
  const sortQuery =
    sortBy === "latest"
      ? `&sort[0]=lastUpdated:desc&sort[1]=updatedAt:desc&sort[2]=name:asc`
      : `&sort=name:asc`;
  const listFields =
    `&fields[0]=name` +
    `&fields[1]=slug` +
    `&fields[2]=description` +
    `&fields[3]=industry` +
    `&fields[4]=status` +
    `&fields[5]=visibility` +
    `&fields[6]=source` +
    `&fields[7]=sourceName` +
    `&fields[8]=verified` +
    `&fields[9]=usageCount` +
    `&fields[10]=rating` +
    `&fields[11]=lastUpdated`;
  const pageSize = 100;
  const maxRecords =
    typeof options.maxRecords === "number" && options.maxRecords > 0
      ? Math.floor(options.maxRecords)
      : Number.POSITIVE_INFINITY;
  let page = 1;
  const results: ReturnType<typeof mapAgent>[] = [];

  while (true) {
    const json = await fetchCMSJson<CMSCollectionResponse>(
      `${CMS_URL}/api/agents` +
        `?` +
        `${sortQuery.replace(/^&/, "")}` +
        `${visibilityFilter}` +
        `&publicationState=live` +
        `${listFields}` +
        `&pagination[page]=${page}` +
        `&pagination[pageSize]=${pageSize}` +
        `&populate[tags][fields][0]=name` +
        `&populate[tags][fields][1]=slug` +
        `&populate[companies][fields][0]=name` +
        `&populate[companies][fields][1]=slug` +
        `&populate[coverImage][fields][0]=url` +
        `&populate[coverImage][fields][1]=alternativeText`,
      { cacheMs: CMS_CACHE_TTL_MS }
    );
    const data = json?.data || [];
    const remaining = Math.max(maxRecords - results.length, 0);
    if (remaining <= 0) {
      break;
    }
    results.push(...data.slice(0, remaining).map(mapAgent));
    if (results.length >= maxRecords) {
      break;
    }

    const pagination = json?.meta?.pagination;
    if (!pagination || page >= pagination.pageCount) {
      break;
    }
    page += 1;
  }

  return results;
}

export async function fetchMCPServers(
  visibility?: "public" | "private",
  options: { maxRecords?: number; sortBy?: "name" | "latest" } = {}
) {
  const visibilityFilter = visibility ? `&filters[visibility][$eq]=${visibility}` : "";
  const sortBy = options.sortBy === "latest" ? "latest" : "name";
  const sortQuery =
    sortBy === "latest"
      ? `&sort[0]=lastUpdated:desc&sort[1]=updatedAt:desc&sort[2]=name:asc`
      : `&sort=name:asc`;
  const listFields =
    `&fields[0]=name` +
    `&fields[1]=slug` +
    `&fields[2]=description` +
    `&fields[3]=industry` +
    `&fields[4]=category` +
    `&fields[5]=status` +
    `&fields[6]=visibility` +
    `&fields[7]=source` +
    `&fields[8]=sourceName` +
    `&fields[9]=verified` +
    `&fields[10]=usageCount` +
    `&fields[11]=rating` +
    `&fields[12]=lastUpdated`;
  const pageSize = 100;
  const maxRecords =
    typeof options.maxRecords === "number" && options.maxRecords > 0
      ? Math.floor(options.maxRecords)
      : Number.POSITIVE_INFINITY;
  let page = 1;
  const results: ReturnType<typeof mapMCPServer>[] = [];

  while (true) {
    const json = await fetchCMSJson<CMSCollectionResponse>(
      `${CMS_URL}/api/mcp-servers` +
        `?` +
        `${sortQuery.replace(/^&/, "")}` +
        `${visibilityFilter}` +
        `&publicationState=live` +
        `${listFields}` +
        `&pagination[page]=${page}` +
        `&pagination[pageSize]=${pageSize}` +
        `&populate[tags][fields][0]=name` +
        `&populate[tags][fields][1]=slug` +
        `&populate[companies][fields][0]=name` +
        `&populate[companies][fields][1]=slug` +
        `&populate[coverImage][fields][0]=url` +
        `&populate[coverImage][fields][1]=alternativeText`,
      { cacheMs: CMS_CACHE_TTL_MS }
    );
    const data = json?.data || [];
    const remaining = Math.max(maxRecords - results.length, 0);
    if (remaining <= 0) {
      break;
    }
    results.push(...data.slice(0, remaining).map(mapMCPServer));
    if (results.length >= maxRecords) {
      break;
    }

    const pagination = json?.meta?.pagination;
    if (!pagination || page >= pagination.pageCount) {
      break;
    }
    page += 1;
  }

  return results;
}

export async function fetchAgentBySlug(slug: string) {
  const json = await fetchCMSJson<CMSCollectionResponse>(
    `${CMS_URL}/api/agents` +
      `?filters[slug][$eq]=${encodeURIComponent(slug)}` +
      `&publicationState=live` +
      `&populate[tags][fields][0]=name` +
      `&populate[tags][fields][1]=slug` +
      `&populate[companies][fields][0]=name` +
      `&populate[companies][fields][1]=slug` +
      `&populate[coverImage][fields][0]=url` +
      `&populate[coverImage][fields][1]=alternativeText`,
    { cacheMs: CMS_CACHE_TTL_MS }
  );
  return json?.data?.[0] ? mapAgent(json.data[0]) : null;
}

export async function fetchMCPServerBySlug(slug: string) {
  const json = await fetchCMSJson<CMSCollectionResponse>(
    `${CMS_URL}/api/mcp-servers` +
      `?filters[slug][$eq]=${encodeURIComponent(slug)}` +
      `&publicationState=live` +
      `&populate[tags][fields][0]=name` +
      `&populate[tags][fields][1]=slug` +
      `&populate[companies][fields][0]=name` +
      `&populate[companies][fields][1]=slug` +
      `&populate[coverImage][fields][0]=url` +
      `&populate[coverImage][fields][1]=alternativeText`,
    { cacheMs: CMS_CACHE_TTL_MS }
  );
  return json?.data?.[0] ? mapMCPServer(json.data[0]) : null;
}

function normalizeTagKey(tag?: { name?: string; slug?: string } | null) {
  return (tag?.slug || tag?.name || "").toLowerCase().trim();
}

function rankRelatedAgents(seed: Agent, candidates: Agent[], limit: number) {
  const seedTagSet = new Set((seed.tags || []).map(normalizeTagKey).filter(Boolean));
  return candidates
    .filter((candidate) => candidate.slug && candidate.slug !== seed.slug)
    .map((candidate) => {
      const sharedTags = (candidate.tags || [])
        .map(normalizeTagKey)
        .filter((tag) => tag && seedTagSet.has(tag)).length;
      const sameIndustry = candidate.industry && candidate.industry === seed.industry ? 3 : 0;
      const sameSource = candidate.source && candidate.source === seed.source ? 1 : 0;
      return { candidate, score: sharedTags + sameIndustry + sameSource };
    })
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

function rankRelatedMCPServers(seed: MCPServer, candidates: MCPServer[], limit: number) {
  const seedTagSet = new Set((seed.tags || []).map(normalizeTagKey).filter(Boolean));
  return candidates
    .filter((candidate) => candidate.slug && candidate.slug !== seed.slug)
    .map((candidate) => {
      const sharedTags = (candidate.tags || [])
        .map(normalizeTagKey)
        .filter((tag) => tag && seedTagSet.has(tag)).length;
      const sameIndustry = candidate.industry && candidate.industry === seed.industry ? 3 : 0;
      const sameCategory = candidate.category && candidate.category === seed.category ? 2 : 0;
      return { candidate, score: sharedTags + sameIndustry + sameCategory };
    })
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

function rankRelatedPodcastEpisodes(
  seed: PodcastEpisode,
  candidates: PodcastEpisode[],
  limit: number
) {
  const seedTagSet = new Set((seed.tags || []).map(normalizeTagKey).filter(Boolean));
  const seedCompanySet = new Set(
    (seed.companies || [])
      .map((company) => normalizeTagKey({ name: company.name, slug: company.slug }))
      .filter(Boolean)
  );
  const seedType = (seed.podcastType || "internal").toLowerCase();

  return candidates
    .filter((candidate) => candidate.slug && candidate.slug !== seed.slug)
    .map((candidate) => {
      const candidateType = (candidate.podcastType || "internal").toLowerCase();
      const sharedTags = (candidate.tags || [])
        .map(normalizeTagKey)
        .filter((tag) => tag && seedTagSet.has(tag)).length;
      const sharedCompanies = (candidate.companies || [])
        .map((company) => normalizeTagKey({ name: company.name, slug: company.slug }))
        .filter((company) => company && seedCompanySet.has(company)).length;
      const sameType = candidateType === seedType ? 2 : 0;
      const recency = getTimestamp(candidate.publishedDate || candidate.updatedAt || null) / 1_000_000_000_000;
      return {
        candidate,
        score: sharedTags * 4 + sharedCompanies * 3 + sameType + recency,
      };
    })
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title))
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export async function fetchRelatedPodcastEpisodes(
  episode: PodcastEpisode,
  options: { limit?: number } = {}
): Promise<PodcastEpisode[]> {
  if (!episode.slug) return [];
  const limit = Math.max(options.limit || 4, 1);
  const candidates = await fetchPodcastEpisodes({ maxRecords: 500 });
  return rankRelatedPodcastEpisodes(episode, candidates, limit);
}

export async function fetchRelatedAgents(
  agent: Agent,
  options: { visibility?: "public" | "private"; limit?: number } = {}
): Promise<Agent[]> {
  if (!agent.slug) return [];
  const limit = Math.max(options.limit || 3, 1);
  const pageSize = Math.max(limit * 4, 12);
  const visibilityFilter = options.visibility
    ? `&filters[visibility][$eq]=${options.visibility}`
    : "";
  const basePopulate =
    `&populate[tags][fields][0]=name` +
    `&populate[tags][fields][1]=slug` +
    `&populate[companies][fields][0]=name` +
    `&populate[companies][fields][1]=slug` +
    `&populate[coverImage][fields][0]=url` +
    `&populate[coverImage][fields][1]=alternativeText`;

  const industryFilter = agent.industry
    ? `&filters[industry][$eq]=${encodeURIComponent(agent.industry)}`
    : "";
  const byIndustry = await fetchCMSJson<CMSCollectionResponse>(
    `${CMS_URL}/api/agents` +
      `?sort=updatedAt:desc` +
      `${visibilityFilter}` +
      `${industryFilter}` +
      `&filters[slug][$ne]=${encodeURIComponent(agent.slug)}` +
      `&publicationState=live` +
      `&pagination[pageSize]=${pageSize}` +
      basePopulate,
    { cacheMs: CMS_CACHE_TTL_MS }
  );
  const industryCandidates = (byIndustry?.data || []).map(mapAgent);
  if (industryCandidates.length >= limit) {
    return rankRelatedAgents(agent, industryCandidates, limit);
  }

  const bySource = await fetchCMSJson<CMSCollectionResponse>(
    `${CMS_URL}/api/agents` +
      `?sort=updatedAt:desc` +
      `${visibilityFilter}` +
      `${agent.source ? `&filters[source][$eq]=${encodeURIComponent(agent.source)}` : ""}` +
      `&filters[slug][$ne]=${encodeURIComponent(agent.slug)}` +
      `&publicationState=live` +
      `&pagination[pageSize]=${pageSize}` +
      basePopulate,
    { cacheMs: CMS_CACHE_TTL_MS }
  );

  const merged = new Map<number, Agent>();
  industryCandidates.forEach((candidate) => merged.set(candidate.id, candidate));
  ((bySource?.data || []).map(mapAgent) || []).forEach((candidate) => merged.set(candidate.id, candidate));

  return rankRelatedAgents(agent, Array.from(merged.values()), limit);
}

export async function fetchRelatedMCPServers(
  mcp: MCPServer,
  options: { visibility?: "public" | "private"; limit?: number } = {}
): Promise<MCPServer[]> {
  if (!mcp.slug) return [];
  const limit = Math.max(options.limit || 3, 1);
  const pageSize = Math.max(limit * 4, 12);
  const visibilityFilter = options.visibility
    ? `&filters[visibility][$eq]=${options.visibility}`
    : "";
  const basePopulate =
    `&populate[tags][fields][0]=name` +
    `&populate[tags][fields][1]=slug` +
    `&populate[companies][fields][0]=name` +
    `&populate[companies][fields][1]=slug` +
    `&populate[coverImage][fields][0]=url` +
    `&populate[coverImage][fields][1]=alternativeText`;

  const byCategoryAndIndustry = await fetchCMSJson<CMSCollectionResponse>(
    `${CMS_URL}/api/mcp-servers` +
      `?sort=updatedAt:desc` +
      `${visibilityFilter}` +
      `${mcp.industry ? `&filters[industry][$eq]=${encodeURIComponent(mcp.industry)}` : ""}` +
      `${mcp.category ? `&filters[category][$eq]=${encodeURIComponent(mcp.category)}` : ""}` +
      `&filters[slug][$ne]=${encodeURIComponent(mcp.slug)}` +
      `&publicationState=live` +
      `&pagination[pageSize]=${pageSize}` +
      basePopulate,
    { cacheMs: CMS_CACHE_TTL_MS }
  );
  const primaryCandidates = (byCategoryAndIndustry?.data || []).map(mapMCPServer);
  if (primaryCandidates.length >= limit) {
    return rankRelatedMCPServers(mcp, primaryCandidates, limit);
  }

  const byIndustry = await fetchCMSJson<CMSCollectionResponse>(
    `${CMS_URL}/api/mcp-servers` +
      `?sort=updatedAt:desc` +
      `${visibilityFilter}` +
      `${mcp.industry ? `&filters[industry][$eq]=${encodeURIComponent(mcp.industry)}` : ""}` +
      `&filters[slug][$ne]=${encodeURIComponent(mcp.slug)}` +
      `&publicationState=live` +
      `&pagination[pageSize]=${pageSize}` +
      basePopulate,
    { cacheMs: CMS_CACHE_TTL_MS }
  );

  const merged = new Map<number, MCPServer>();
  primaryCandidates.forEach((candidate) => merged.set(candidate.id, candidate));
  ((byIndustry?.data || []).map(mapMCPServer) || []).forEach((candidate) =>
    merged.set(candidate.id, candidate)
  );

  return rankRelatedMCPServers(mcp, Array.from(merged.values()), limit);
}
