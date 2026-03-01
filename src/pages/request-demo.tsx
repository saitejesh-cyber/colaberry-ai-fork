import Head from "next/head";
import Layout from "../components/Layout";
import Link from "next/link";
import SectionHeader from "../components/SectionHeader";
import MediaPanel from "../components/MediaPanel";
import DemoRequestForm from "../components/DemoRequestForm";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../lib/seo";

export default function RequestDemo() {
  const seoMeta: SeoMeta = {
    title: "Book a Demo | Colaberry AI",
    description: "Request a tailored walkthrough of AIXcelerator, Agents, MCP servers, and modular capability layers.",
    canonical: buildCanonical("/request-demo"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              "name": "Book a Demo | Colaberry AI",
              "description": "Request a tailored walkthrough of AIXcelerator, Agents, MCP servers, and modular capability layers.",
              "url": `${process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai"}/request-demo`,
            }),
          }}
        />
      </Head>
      <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
        <div className="lg:col-span-7">
        <div className="chip chip-brand inline-flex w-fit items-center gap-2 rounded-md border border-[#4F2AA3]/15 bg-[#F3EEFF] py-1 pl-2 pr-3 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[#2B0F63] dark:border-[#7B5CE0]/20 dark:bg-[#18233A] dark:text-[#C4B3FF]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#008EA8]" />
            Demo request
          </div>

          <div className="mt-5">
            <SectionHeader
              as="h1"
              size="xl"
              title="Book a demo"
              description="Tell us what you’re trying to launch and we’ll tailor a walkthrough across AIXcelerator, Agents, MCP, and the modular capability layers."
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="submit" form="demo-request-form" className="btn btn-cta">
              Submit demo request
            </button>
            <Link href="/aixcelerator" className="btn btn-secondary">
              Explore AIXcelerator
            </Link>
          </div>

          <DemoRequestForm sourcePage="request-demo" sourcePath="/request-demo" />

          <div className="detail-section mt-8">
            <SectionHeader
              kicker="What we can cover"
              title="Demo agenda highlights"
              description="Key topics we can tailor to your workflows and stakeholders."
              size="md"
            />
            <div className="mt-4 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
              <Bullet>Agent catalog + rollout readiness</Bullet>
              <Bullet>MCP server library + integrations</Bullet>
              <Bullet>Industry workspaces + case studies</Bullet>
              <Bullet>Governance, controls, and audit trails</Bullet>
              <Bullet>Modular layers: resources, playbooks, aggregation</Bullet>
              <Bullet>Roadmap and next-step implementation</Bullet>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <MediaPanel
            kicker="Demo preview"
            title="Walkthrough highlights"
            description="See how agents, MCP, and modular layers connect end to end."
            image="/media/hero/hero-platform-cinematic.webp"
            alt="Enterprise platform walkthrough preview"
            aspect="wide"
            fit="cover"
            className="mb-6"
          />
          <div className="detail-section">
            <div className="text-base font-semibold text-zinc-900">Suggested demo flow</div>
            <div className="mt-1 text-sm text-zinc-600">A clean, consistent walkthrough for stakeholders.</div>
            <div className="mt-5 grid gap-3 text-sm text-zinc-700">
              <Step n="1" title="Core platform" body="AIXcelerator + Agents + MCP" />
              <Step n="2" title="Industry workspace" body="Case studies and domain context" />
              <Step n="3" title="Modular layers" body="Resources, playbooks, news/product" />
              <Step n="4" title="Deployment" body="Governance, audit, reliability" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <div className="flex gap-2">
      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#008EA8]" />
      <span>{children}</span>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="card-elevated flex items-start gap-3 p-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#4F2AA3]/5 text-xs font-semibold text-[#2B0F63] ring-1 ring-[#4F2AA3]/20 dark:bg-[#7B5CE0]/10 dark:text-[#C4B3FF] dark:ring-[#7B5CE0]/25">
        {n}
      </div>
      <div>
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        <div className="mt-0.5 text-sm text-zinc-600">{body}</div>
      </div>
    </div>
  );
}
