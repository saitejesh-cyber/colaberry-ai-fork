const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL!;

export type PodcastEpisode = {
  id: number;
  title: string;
  slug: string;
  publishedDate: string;
  transcript?: any;
  tags: string[];
};

export async function fetchPodcastEpisodes() {
    const res = await fetch(
        `${CMS_URL}/api/podcast-episodes
      ?sort=publishedDate:desc
      &populate[tags][fields][0]=name
      &populate[tags][fields][1]=slug`,
        { cache: "no-store" }
    );

  if (!res.ok) {
    throw new Error("Failed to fetch podcast episodes");
  }

  const json = await res.json();

  return (
    json?.data?.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      slug: item.slug,
      publishedDate: item.publishedDate,
      transcript: item.transcript,
      tags: item.tags || [],
    })) || []
  );
}

export async function fetchPodcastBySlug(slug: string) {
    const res = await fetch(
        `${CMS_URL}/api/podcast-episodes
      ?filters[slug][$eq]=${slug}
      &populate[tags][fields][0]=name
      &populate[tags][fields][1]=slug
      &populate[companies][fields][0]=name
      &populate[companies][fields][1]=slug`,
        { cache: "no-store" }
    );

  const json = await res.json();
  return json?.data?.[0] || null;
}
