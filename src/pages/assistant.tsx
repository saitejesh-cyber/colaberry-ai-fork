import Head from "next/head";
import Layout from "../components/Layout";
import EnterprisePageHero from "../components/EnterprisePageHero";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../lib/seo";

export default function AssistantPage() {
  const seoMeta: SeoMeta = {
    title: "Discovery Assistant | Colaberry AI",
    description: "Start from guided prompts to discover agents, MCP servers, use cases, and updates.",
    canonical: buildCanonical("/assistant"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Discovery Assistant",
          "description": "Start from guided prompts to discover agents, MCP servers, use cases, and updates.",
          "url": buildCanonical("/assistant"),
          "publisher": { "@type": "Organization", "name": "Colaberry AI" },
        }) }} />
      </Head>

      <EnterprisePageHero
        kicker="Discovery assistant"
        title="Start with guided discovery"
        description="A single entry point for people and LLM workflows to find agents, MCP servers, use cases, and updates."
        chips={["Prompt-first", "Catalog-linked", "LLM-readable", "Enterprise ready"]}
        primaryAction={{ label: "Search catalog", href: "/search" }}
        secondaryAction={{ label: "Book a demo", href: "/request-demo", variant: "secondary" }}
      />

    </Layout>
  );
}
