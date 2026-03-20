/**
 * CollectionDetailTemplate — Generic collection detail page with embedded graph.
 * Shows metadata, embedded CollectionGraph, item cards, pipeline flow, CTA.
 * Used by: skills/collections/[slug], mcp/collections/[slug], agents/collections/[slug], etc.
 */

import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback } from "react";
import EnterprisePageHero from "./EnterprisePageHero";
import EnterpriseCtaBand from "./EnterpriseCtaBand";
import CollectionGraph from "./CollectionGraph";
import type { ContentOntologyConfig, ContentCollection, OntologyItem } from "../lib/ontologyTypes";
import type { GraphNode, GraphLink } from "../lib/graphUtils";

/* ── Props ────────────────────────────────────────────────────────────── */

export type CollectionDetailTemplateProps = {
  config: ContentOntologyConfig;
  collection: ContentCollection;
  /** Fetched items (may be fewer than collection.itemSlugs if some not found in CMS) */
  items: OntologyItem[];
  graphNodes: GraphNode[];
  graphLinks: GraphLink[];
  /** Custom item card renderer. Falls back to a simple default card. */
  renderItemCard?: (item: OntologyItem, index: number) => React.ReactNode;
};

/* ── Default Item Card ────────────────────────────────────────────────── */

function DefaultItemCard({
  item,
  index,
  config,
}: {
  item: OntologyItem;
  index: number;
  config: ContentOntologyConfig;
}) {
  return (
    <div className="relative">
      <div className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900 z-10">
        {index + 1}
      </div>
      <Link
        href={`${config.basePath}/${item.slug}`}
        className="block catalog-card p-5 h-full"
      >
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{item.name}</h3>
        {item.tags && item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.slice(0, 4).map((tag) => (
              <span
                key={tag.slug || tag.name}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {tag.name || tag.slug}
              </span>
            ))}
          </div>
        )}
      </Link>
    </div>
  );
}

/* ── Main Template Component ──────────────────────────────────────────── */

export default function CollectionDetailTemplate({
  config,
  collection,
  items,
  graphNodes,
  graphLinks,
  renderItemCard,
}: CollectionDetailTemplateProps) {
  const router = useRouter();
  const category = config.categories.find((c) => c.slug === collection.category);
  const difficultyLabel = collection.difficulty.charAt(0).toUpperCase() + collection.difficulty.slice(1);

  const handleGraphNodeClick = useCallback(
    (nodeId: string) => {
      router.push(`${config.basePath}/${nodeId}`);
    },
    [router, config.basePath],
  );

  return (
    <>
      <EnterprisePageHero
        kicker={`${config.labelSingular} collection`}
        title={collection.name}
        description={collection.description}
      />

      {/* Collection metadata */}
      <div className="reveal mt-6 flex flex-wrap items-center gap-3">
        {category && (
          <span className="chip chip-neutral rounded-full px-3 py-1.5 text-xs font-semibold">
            {category.label}
          </span>
        )}
        <span className="chip chip-neutral rounded-full px-3 py-1.5 text-xs font-semibold">
          {difficultyLabel}
        </span>
        {collection.keywordTags.length > 0 && (
          <>
            {collection.keywordTags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </>
        )}
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {collection.itemSlugs.length} {config.label.toLowerCase()} in this collection
          {items.length < collection.itemSlugs.length && ` · ${items.length} available in catalog`}
        </span>
      </div>

      {/* Embedded Relationship Graph */}
      {graphNodes.length > 1 && (
        <section className="reveal mt-8">
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {config.labelSingular} Relationship Graph
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Visualize how {config.label.toLowerCase()} in this collection relate to each other. Click a node to view the {config.labelSingular.toLowerCase()}.
          </p>
          <div className="mt-3">
            <CollectionGraph
              nodes={graphNodes}
              links={graphLinks}
              height={380}
              showLabels
              onNodeClick={handleGraphNodeClick}
            />
          </div>
        </section>
      )}

      {/* Items grid */}
      {items.length > 0 ? (
        <section className="reveal mt-8">
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {config.label} in this collection
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) =>
              renderItemCard ? (
                renderItemCard(item, index)
              ) : (
                <DefaultItemCard key={item.slug} item={item} index={index} config={config} />
              ),
            )}
          </div>
        </section>
      ) : (
        <section className="reveal mt-8 surface-panel p-8 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {config.label} in this collection are being populated. Check back as the catalog grows.
          </p>
          <Link
            href={config.catalogPath}
            className="mt-4 inline-block text-sm font-semibold text-[#DC2626] hover:underline"
          >
            Browse all {config.label.toLowerCase()} →
          </Link>
        </section>
      )}

      {/* Pipeline Flow */}
      {items.length > 1 && (
        <section className="reveal mt-8 surface-panel p-6">
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {config.labelSingular} Pipeline Flow
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            How {config.label.toLowerCase()} compose together in this collection — output of one feeds into the next.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {items.map((item, index) => (
              <div key={item.slug} className="flex items-center gap-2">
                <Link
                  href={`${config.basePath}/${item.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[8px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {index + 1}
                  </span>
                  {item.name}
                </Link>
                {index < items.length - 1 && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden="true">
                    <path d="M5 12h14m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <EnterpriseCtaBand
        kicker={`${config.labelSingular} collections`}
        title={`Explore more ${config.labelSingular.toLowerCase()} bundles`}
        description={`Browse curated collections of ${config.label.toLowerCase()} designed to work together.`}
        primaryHref={`${config.basePath}/collections`}
        primaryLabel="All collections"
        secondaryHref={config.catalogPath}
        secondaryLabel={`Browse all ${config.label.toLowerCase()}`}
        className="mt-16"
      />
    </>
  );
}
