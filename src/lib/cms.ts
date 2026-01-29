const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL!;

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

export type PodcastEpisode = {
  id: number;
  title: string;
  slug: string;
  publishedDate: string | null;
  description?: any;
  transcript?: any;
  episodeNumber?: number | null;
  duration?: string | null;
  audioUrl?: string | null;
  buzzsproutEmbedCode?: string | null;
  tags: Tag[];
  companies: Company[];
  platformLinks: PlatformLink[];
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
};

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
    description: attrs?.description ?? null,
    transcript: attrs?.transcript ?? null,
    episodeNumber: attrs?.episodeNumber ?? null,
    duration: attrs?.duration ?? null,
    audioUrl: attrs?.audioUrl ?? null,
    buzzsproutEmbedCode: attrs?.buzzsproutEmbedCode ?? null,
    tags,
    companies,
    platformLinks: attrs?.platformLinks ?? [],
    coverImageUrl,
    coverImageAlt,
  };
}

export async function fetchPodcastEpisodes() {
  const res = await fetch(
    `${CMS_URL}/api/podcast-episodes` +
      `?sort=publishedDate:desc` +
      `&populate[tags][fields][0]=name` +
      `&populate[tags][fields][1]=slug` +
      `&populate[companies][fields][0]=name` +
      `&populate[companies][fields][1]=slug` +
      `&populate[coverImage][fields][0]=url` +
      `&populate[coverImage][fields][1]=alternativeText` +
      `&populate[platformLinks]=*`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch podcast episodes");
  }

  const json = await res.json();
  return json?.data?.map(mapEpisode) || [];
}

export async function fetchPodcastBySlug(slug: string) {
  const res = await fetch(
    `${CMS_URL}/api/podcast-episodes` +
      `?filters[slug][$eq]=${slug}` +
      `&populate[tags][fields][0]=name` +
      `&populate[tags][fields][1]=slug` +
      `&populate[companies][fields][0]=name` +
      `&populate[companies][fields][1]=slug` +
      `&populate[coverImage][fields][0]=url` +
      `&populate[coverImage][fields][1]=alternativeText` +
      `&populate[platformLinks]=*`,
    { cache: "no-store" }
  );

  const json = await res.json();
  return json?.data?.[0] ? mapEpisode(json.data[0]) : null;
}
