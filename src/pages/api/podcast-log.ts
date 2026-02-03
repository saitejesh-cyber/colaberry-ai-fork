import type { NextApiRequest, NextApiResponse } from "next";

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL;
const CMS_TOKEN = process.env.CMS_API_TOKEN;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  if (!CMS_URL || !CMS_TOKEN) {
    return res.status(200).json({ ok: false, reason: "logging_disabled" });
  }

  const { eventType, platform, episodeSlug, episodeTitle } = req.body || {};

  if (!eventType || !episodeSlug) {
    return res.status(400).json({ ok: false, reason: "missing_fields" });
  }

  try {
    let episodeId: number | null = null;
    let episodeCounts: Record<string, number | null | undefined> | null = null;

    if (episodeSlug) {
      const episodeRes = await fetch(
        `${CMS_URL}/api/podcast-episodes?filters[slug][$eq]=${encodeURIComponent(
          episodeSlug
        )}&fields[0]=id&fields[1]=viewCount&fields[2]=playCount&fields[3]=shareCount&fields[4]=subscribeCount&fields[5]=clickCount`,
        {
          headers: {
            Authorization: `Bearer ${CMS_TOKEN}`,
          },
        }
      );
      if (episodeRes.ok) {
        const json = await episodeRes.json();
        const entry = json?.data?.[0];
        episodeId = entry?.id ?? null;
        episodeCounts = entry?.attributes ?? null;
      }
    }

    await fetch(`${CMS_URL}/api/podcast-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CMS_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          eventType,
          platform: platform || null,
          episodeSlug,
          episodeTitle: episodeTitle || null,
          episode: episodeId,
          url: req.headers.referer || null,
          referrer: req.headers.referer || null,
          userAgent: req.headers["user-agent"] || null,
          occurredAt: new Date().toISOString(),
        },
      }),
    });

    if (episodeId && episodeCounts) {
      const fieldMap: Record<string, string> = {
        view: "viewCount",
        play: "playCount",
        share: "shareCount",
        subscribe: "subscribeCount",
        click: "clickCount",
      };
      const field = fieldMap[eventType];
      if (field) {
        const currentValue = Number(episodeCounts[field] ?? 0);
        await fetch(`${CMS_URL}/api/podcast-episodes/${episodeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CMS_TOKEN}`,
          },
          body: JSON.stringify({
            data: {
              [field]: currentValue + 1,
            },
          }),
        });
      }
    }
  } catch {
    return res.status(200).json({ ok: false, reason: "log_failed" });
  }

  return res.status(200).json({ ok: true });
}
