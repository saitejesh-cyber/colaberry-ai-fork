import Layout from "../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import { GetStaticProps } from "next";
import SectionHeader from "../../components/SectionHeader";
import MediaPanel from "../../components/MediaPanel";
import StatePanel from "../../components/StatePanel";
import { heroImage } from "../../lib/media";
import {
  fetchGaiInsightsBriefing,
  fetchGaiInsightsRatings,
  GaiBriefing,
  GaiRatingItem,
} from "../../lib/gaiInsights";

type UpdatesProps = {
  ratings: GaiRatingItem[];
  briefing: GaiBriefing;
  fetchError: boolean;
};

export const getStaticProps: GetStaticProps<UpdatesProps> = async () => {
  let fetchError = false;
  let ratings: GaiRatingItem[] = [];
  let briefing: GaiBriefing = { items: [] };

  try {
    ratings = await fetchGaiInsightsRatings();
  } catch {
    fetchError = true;
  }

  try {
    briefing = await fetchGaiInsightsBriefing();
  } catch {
    fetchError = true;
  }

  const safeRatings: GaiRatingItem[] = ratings.map((item) => {
    const safe: GaiRatingItem = { title: item.title };
    if (item.date) safe.date = item.date;
    if (item.rating) safe.rating = item.rating;
    if (item.url) safe.url = item.url;
    if (item.rationale) safe.rationale = item.rationale;
    return safe;
  });

  const safeBriefing: GaiBriefing = { items: briefing.items };
  if (briefing.date) {
    safeBriefing.date = briefing.date;
  }

  return {
    props: {
      ratings: safeRatings,
      briefing: safeBriefing,
      fetchError,
    },
    revalidate: 21600,
  };
};

export default function Updates({ ratings, briefing, fetchError }: UpdatesProps) {
  const updateHighlights = [
    {
      title: "Product releases",
      description: "Feature updates, changelogs, and release notes.",
    },
    {
      title: "Research drops",
      description: "New white papers, POVs, and technical assets.",
    },
    {
      title: "Ecosystem signals",
      description: "Curated headlines and market signals in one feed.",
    },
    {
      title: "Roadmap highlights",
      description: "What is shipping next across the platform layers.",
    },
  ];

  return (
    <Layout>
      <Head>
        <title>Updates | Colaberry AI</title>
      </Head>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <div className="chip chip-brand inline-flex w-fit items-center gap-2 rounded-full border border-brand-blue/20 bg-white py-1 pl-2 pr-3 text-xs text-brand-deep">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-aqua" />
            Modular layer
          </div>
          <SectionHeader
            as="h1"
            size="xl"
            title="News & product"
            description="Announcements, product updates, and curated industry news-combined into a single signal feed."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {updateHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm"
              >
                <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                <div className="mt-1 text-xs text-slate-600">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
        <MediaPanel
          kicker="Signal feed"
          title="Updates and announcements"
          description="Product releases and ecosystem signals in one place."
          image={heroImage("hero-updates.png")}
          alt="City skyline highlighting update signals"
          aspect="wide"
          fit="cover"
        />
      </div>

      {fetchError && (
        <div className="mt-6">
          <StatePanel
            variant="error"
            title="GAI Insights feed is temporarily unavailable"
            description="Showing cached content where available. We will retry on the next refresh window."
            action={
              <a
                href="https://gaiinsights.com/ratings"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                Visit GAI Insights
              </a>
            }
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:mt-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="surface-panel border border-slate-200/80 bg-white/90 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader
              kicker="Curated feed"
              title="Top-Rated AI News"
              description="Daily ratings and rationale from GAI Insights."
              size="md"
            />
            <a
              href="https://gaiinsights.com/ratings"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost mt-3 sm:mt-0"
            >
              View all ratings
            </a>
          </div>

          {ratings.length === 0 ? (
            <div className="mt-4">
              <StatePanel
                variant="empty"
                title="No ratings available"
                description="GAI Insights ratings will appear here after the next refresh."
              />
            </div>
          ) : (
            <ul className="mt-5 grid gap-4">
              {ratings.slice(0, 8).map((item, index) => (
                <li
                  key={`${item.title}-${item.date || index}`}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-500">
                      {item.date || "Latest rating"}
                    </span>
                    {item.rating ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${ratingTone(
                          item.rating
                        )}`}
                      >
                        {item.rating}
                      </span>
                    ) : null}
                  </div>
                  <a
                    href={item.url || "https://gaiinsights.com/ratings"}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-sm font-semibold text-brand-deep hover:text-brand-blue"
                  >
                    {item.title}
                  </a>
                  {item.rationale ? (
                    <p className="mt-2 text-xs text-slate-600 line-clamp-3">{item.rationale}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-panel border border-slate-200/80 bg-white/90 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader
              kicker="Daily briefing"
              title="Daily AI News Briefing"
              description={
                briefing.date
                  ? `Briefing for ${briefing.date}.`
                  : "Daily external headlines curated by GAI Insights."
              }
              size="md"
            />
            <a
              href="https://gaiinsights.com/articles"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost mt-3 whitespace-nowrap sm:mt-0"
            >
              Open briefing
            </a>
          </div>

          {briefing.items.length === 0 ? (
            <div className="mt-4">
              <StatePanel
                variant="empty"
                title="No briefing items yet"
                description="Daily briefing links will appear here as they publish."
              />
            </div>
          ) : (
            <ul className="mt-5 grid gap-3">
              {briefing.items.slice(0, 12).map((item, index) => (
                <li
                  key={`${item.title}-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2"
                >
                  <span className="mt-0.5 text-xs font-semibold text-slate-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-brand-deep hover:text-brand-blue"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/resources"
          className="btn btn-secondary"
        >
          Explore resources
        </Link>
        <Link
          href="/aixcelerator"
          className="btn btn-primary"
        >
          Explore AIXcelerator
        </Link>
      </div>
    </Layout>
  );
}

function ratingTone(rating: string) {
  const normalized = rating.toLowerCase();
  if (normalized.includes("essential")) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";
  }
  if (normalized.includes("important")) {
    return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";
  }
  if (normalized.includes("watch") || normalized.includes("optional")) {
    return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
  }
  return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
}
