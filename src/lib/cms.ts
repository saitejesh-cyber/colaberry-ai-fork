const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL!;
const CMS_CACHE_TTL_MS = Number(process.env.NEXT_PUBLIC_CMS_CACHE_TTL_MS || 300000);

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const cmsCache = new Map<string, CacheEntry<any>>();
const cmsInflight = new Map<string, Promise<any>>();

async function fetchCMSJson<T>(
  url: string,
  options: { cacheMs?: number; allowStaleOnError?: boolean } = {}
): Promise<T> {
  const cacheMs = Number.isFinite(options.cacheMs) ? Number(options.cacheMs) : CMS_CACHE_TTL_MS;
  const now = Date.now();
  const cached = cmsCache.get(url);

  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  const inflight = cmsInflight.get(url);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const request = fetch(url, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`CMS request failed: ${res.status}`);
      }
      const json = (await res.json()) as T;
      if (cacheMs > 0) {
        cmsCache.set(url, { data: json, expiresAt: now + cacheMs });
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
      cmsInflight.delete(url);
    });

  cmsInflight.set(url, request);
  return request;
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
  tags: Tag[];
  companies: Company[];
  platformLinks: PlatformLink[];
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
};

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

export async function fetchPodcastEpisodes() {
  const json = await fetchCMSJson(
    `${CMS_URL}/api/podcast-episodes` +
      `?sort=publishedDate:desc` +
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
  return json?.data?.map(mapEpisode) || [];
}

export async function fetchGlobalNavigation(): Promise<GlobalNavigation | null> {
  if (!CMS_URL) return null;
  const json = await fetchCMSJson(
    `${CMS_URL}/api/global-navigation` + `?publicationState=live` + `&populate=*`,
    { cacheMs: CMS_CACHE_TTL_MS, allowStaleOnError: true }
  );
  return normalizeGlobalNavigation(json);
}

export async function fetchPodcastBySlug(slug: string) {
  const json = await fetchCMSJson(
    `${CMS_URL}/api/podcast-episodes` +
      `?filters[slug][$eq]=${slug}` +
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

export async function fetchAgents(visibility?: "public" | "private") {
  const visibilityFilter = visibility ? `&filters[visibility][$eq]=${visibility}` : "";
  const pageSize = 100;
  let page = 1;
  const results: ReturnType<typeof mapAgent>[] = [];

  while (true) {
    const json = await fetchCMSJson(
      `${CMS_URL}/api/agents` +
        `?sort=name:asc` +
        `${visibilityFilter}` +
        `&publicationState=live` +
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
    results.push(...data.map(mapAgent));

    const pagination = json?.meta?.pagination;
    if (!pagination || page >= pagination.pageCount) {
      break;
    }
    page += 1;
  }

  return results;
}

export async function fetchMCPServers(visibility?: "public" | "private") {
  const visibilityFilter = visibility ? `&filters[visibility][$eq]=${visibility}` : "";
  const pageSize = 100;
  let page = 1;
  const results: ReturnType<typeof mapMCPServer>[] = [];

  while (true) {
    const json = await fetchCMSJson(
      `${CMS_URL}/api/mcp-servers` +
        `?sort=name:asc` +
        `${visibilityFilter}` +
        `&publicationState=live` +
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
    results.push(...data.map(mapMCPServer));

    const pagination = json?.meta?.pagination;
    if (!pagination || page >= pagination.pageCount) {
      break;
    }
    page += 1;
  }

  return results;
}

export async function fetchAgentBySlug(slug: string) {
  const json = await fetchCMSJson(
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
  const json = await fetchCMSJson(
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
