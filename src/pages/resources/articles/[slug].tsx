import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import Layout from "../../../components/Layout";
import EnterprisePageHero from "../../../components/EnterprisePageHero";
import StatePanel from "../../../components/StatePanel";
import { Article, ArticleMedia, fetchArticleBySlug } from "../../../lib/cms";
import { heroImage } from "../../../lib/media";

type ArticleDetailProps = {
  article: Article;
};

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<ArticleDetailProps> = async ({ params }) => {
  const slug = String(params?.slug || "");
  if (!slug) {
    return { notFound: true, revalidate: 120 };
  }

  try {
    const article = await fetchArticleBySlug(slug);
    if (!article) {
      return { notFound: true, revalidate: 120 };
    }

    return {
      props: { article },
      revalidate: 600,
    };
  } catch {
    return { notFound: true, revalidate: 120 };
  }
};

export default function ArticleDetailPage({ article }: ArticleDetailProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const canonicalUrl = `${siteUrl}/resources/articles/${article.slug}`;
  const publishedLabel = formatDateLabel(article.publishedAt || article.updatedAt);
  const blocks = Array.isArray(article.blocks) ? article.blocks : [];

  return (
    <Layout>
      <Head>
        <title>{`${article.title} | Articles | Colaberry AI`}</title>
        <meta
          name="description"
          content={article.description || "Enterprise AI article from Colaberry AI resources."}
        />
        <link rel="canonical" href={canonicalUrl} />
      </Head>

      <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/resources" className="hover:text-slate-700">
          Resources
        </Link>
        <span>/</span>
        <Link href="/resources/articles" className="hover:text-slate-700">
          Articles
        </Link>
        <span>/</span>
        <span className="text-slate-700" aria-current="page">
          {article.title}
        </span>
      </nav>

      <div className="mt-4">
        <EnterprisePageHero
          kicker={article.category?.name || "Article"}
          title={article.title}
          description={
            article.description ||
            "Structured CMS article for discoverability, indexing, and enterprise AI delivery."
          }
          image={heroImage("hero-updates-cinematic.webp")}
          alt="Editorial analysis surface"
          imageKicker="Editorial"
          imageTitle="Article narrative"
          imageDescription="Long-form analysis with structured blocks and LLM-ready context."
          chips={[
            article.category?.name || "Article",
            article.author?.name ? `By ${article.author.name}` : "Colaberry editorial",
            `${blocks.length} content block${blocks.length === 1 ? "" : "s"}`,
          ]}
          primaryAction={{ label: "Back to articles", href: "/resources/articles" }}
          secondaryAction={{ label: "Explore resources", href: "/resources", variant: "secondary" }}
          metrics={[
            {
              label: "Category",
              value: article.category?.name || "Article",
              note: "Primary taxonomy classification.",
            },
            {
              label: "Author",
              value: article.author?.name || "Colaberry editorial",
              note: "Article ownership and provenance.",
            },
            {
              label: "Published",
              value: publishedLabel || "Pending",
              note: "UTC normalized publication date.",
            },
          ]}
        />
      </div>

      {article.coverImageUrl ? (
        <div className="surface-panel section-shell section-spacing overflow-hidden p-0">
          <div className="relative aspect-[16/7] w-full">
            <Image
              src={article.coverImageUrl}
              alt={article.coverImageAlt || article.title}
              fill
              className="h-full w-full object-cover"
              unoptimized
              loading="lazy"
            />
          </div>
        </div>
      ) : null}

      {blocks.length === 0 ? (
        <div className="section-spacing">
          <StatePanel
            variant="empty"
            title="Article body is not available yet"
            description="Publish rich text or media blocks in CMS to display full article content."
          />
        </div>
      ) : (
        <article className="surface-panel section-shell section-spacing p-6 sm:p-8">
          <div className="prose max-w-none text-slate-700 dark:text-slate-200">
            {blocks.map((block, index) => {
              const component = block.__component || "";
              if (component === "shared.rich-text") {
                const body = typeof block.body === "string" ? block.body : "";
                if (!body) return null;
                const safeHtml = sanitizeHtml(body, {
                  allowedTags: [
                    "p",
                    "br",
                    "strong",
                    "em",
                    "b",
                    "i",
                    "u",
                    "ul",
                    "ol",
                    "li",
                    "h2",
                    "h3",
                    "h4",
                    "a",
                    "blockquote",
                    "code",
                    "pre",
                  ],
                  allowedAttributes: {
                    a: ["href", "target", "rel"],
                  },
                  allowedSchemes: ["http", "https", "mailto"],
                });
                return <div key={`rich-${index}`} dangerouslySetInnerHTML={{ __html: safeHtml }} />;
              }

              if (component === "shared.quote") {
                const quoteBody = typeof block.body === "string" ? block.body : "";
                const quoteTitle = typeof block.title === "string" ? block.title : "";
                if (!quoteBody && !quoteTitle) return null;
                return (
                  <blockquote key={`quote-${index}`} className="section-card my-6 rounded-2xl p-5">
                    {quoteTitle ? <div className="mb-2 text-sm font-semibold text-slate-900">{quoteTitle}</div> : null}
                    {quoteBody ? <p className="m-0 text-slate-700">{quoteBody}</p> : null}
                  </blockquote>
                );
              }

              if (component === "shared.media") {
                const [media] = extractMediaList(block.file);
                if (!media) return null;
                return (
                  <figure key={`media-${index}`} className="my-6">
                    <Image
                      src={media.url}
                      alt={media.alt || article.title}
                      width={1400}
                      height={840}
                      className="h-auto w-full rounded-2xl border border-slate-200/80 object-cover"
                      unoptimized
                      loading="lazy"
                    />
                  </figure>
                );
              }

              if (component === "shared.slider") {
                const mediaItems = extractMediaList(block.files);
                if (mediaItems.length === 0) return null;
                return (
                  <div key={`slider-${index}`} className="my-6 grid gap-3 sm:grid-cols-2">
                    {mediaItems.map((media, mediaIndex) => (
                      <Image
                        key={`${media.url}-${mediaIndex}`}
                        src={media.url}
                        alt={media.alt || `${article.title} media ${mediaIndex + 1}`}
                        width={1200}
                        height={720}
                        className="h-auto w-full rounded-2xl border border-slate-200/80 object-cover"
                        unoptimized
                        loading="lazy"
                      />
                    ))}
                  </div>
                );
              }

              return null;
            })}
          </div>
        </article>
      )}

      <div className="section-spacing flex flex-col gap-3 sm:flex-row">
        <Link href="/resources/articles" className="btn btn-secondary">
          Back to Articles
        </Link>
        <Link href="/resources" className="btn btn-primary">
          Explore Resources
        </Link>
      </div>
    </Layout>
  );
}

function formatDateLabel(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function toAbsoluteMediaUrl(rawUrl?: string | null) {
  if (!rawUrl) return null;
  const base = process.env.NEXT_PUBLIC_CMS_URL || "";
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
  if (rawUrl.startsWith("/") && base) return `${base}${rawUrl}`;
  return rawUrl;
}

function extractMediaEntry(value: unknown): ArticleMedia | null {
  const root = toRecord(value);
  if (!root) return null;
  const attrs = toRecord(root.attributes);
  const rawUrl =
    (typeof root.url === "string" ? root.url : null) ??
    (typeof attrs?.url === "string" ? attrs.url : null) ??
    null;
  const rawAlt =
    (typeof root.alternativeText === "string" ? root.alternativeText : null) ??
    (typeof attrs?.alternativeText === "string" ? attrs.alternativeText : null) ??
    null;
  const url = toAbsoluteMediaUrl(rawUrl);
  if (!url) return null;
  return { url, alt: rawAlt };
}

function extractMediaList(value: unknown): ArticleMedia[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(extractMediaEntry).filter((item): item is ArticleMedia => Boolean(item));
  }
  const root = toRecord(value);
  if (!root) return [];
  const data = root.data;
  if (Array.isArray(data)) {
    return data.map(extractMediaEntry).filter((item): item is ArticleMedia => Boolean(item));
  }
  if (data) {
    const one = extractMediaEntry(data);
    return one ? [one] : [];
  }
  const one = extractMediaEntry(root);
  return one ? [one] : [];
}
