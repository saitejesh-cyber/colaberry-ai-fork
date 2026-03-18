/**
 * CollectionGraph — Reusable embedded force-graph for skill collections.
 * Shows a mini graph of skills with relationship edges, color-coded by type.
 * Used on: Collection detail page, skill detail sidebar (mini-graph).
 */

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef } from "react";
import {
  CATEGORY_COLORS,
  RELATIONSHIP_TYPE_COLORS,
  RELATIONSHIP_TYPE_LABELS,
  type GraphNode,
  type GraphLink,
} from "../lib/graphUtils";
import type { SkillRelationType } from "../data/skill-taxonomy";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type CollectionGraphProps = {
  nodes: GraphNode[];
  links: GraphLink[];
  /** Height in pixels */
  height?: number;
  /** Whether to show labels on nodes (default: true) */
  showLabels?: boolean;
  /** Highlight a specific node (e.g., the current skill in mini-graph) */
  highlightNodeId?: string;
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
};

export default function CollectionGraph({
  nodes,
  links,
  height = 400,
  showLabels = true,
  highlightNodeId,
  onNodeClick,
}: CollectionGraphProps) {
  const graphRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const graphData = useMemo(
    () => ({ nodes: [...nodes], links: [...links] }),
    [nodes, links],
  );

  const linkTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const link of links) {
      counts[link.type] = (counts[link.type] || 0) + 1;
    }
    return counts;
  }, [links]);

  const handleClick = useCallback(
    (node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (node?.id && onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick],
  );

  if (nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400"
        style={{ height }}
      >
        No skill data available for graph
      </div>
    );
  }

  return (
    <div>
      <div
        className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-950"
        style={{ height }}
      >
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel=""
          nodeColor={(node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (highlightNodeId === node.id) return "#DC2626";
            return node.color || CATEGORY_COLORS[node.category] || "#a1a1aa";
          }}
          nodeRelSize={6}
          nodeVal={(node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (highlightNodeId === node.id) return 4;
            return node.val || 2;
          }}
          linkColor={(link: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            const color = RELATIONSHIP_TYPE_COLORS[link.type as SkillRelationType];
            return color ? color + "88" : "rgba(113,113,122,0.3)";
          }}
          linkWidth={(link: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            link.type === "compose_with" || link.type === "depend_on" ? 1.5 : 0.8
          }
          linkDirectionalParticles={(link: any) => link.type === "depend_on" ? 2 : 0} // eslint-disable-line @typescript-eslint/no-explicit-any
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleColor={(link: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            RELATIONSHIP_TYPE_COLORS[link.type as SkillRelationType] || "#f87171"
          }
          backgroundColor="#09090b"
          onNodeClick={handleClick}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            // Highlight ring
            if (highlightNodeId === node.id) {
              ctx.beginPath();
              ctx.arc(node.x || 0, node.y || 0, 10, 0, 2 * Math.PI);
              ctx.strokeStyle = "#DC2626";
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            }

            if (!showLabels) return;
            const label = node.name || "";
            const fontSize = Math.max(10 / globalScale, 3);
            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillStyle = "#fafafa";
            ctx.fillText(label, node.x || 0, (node.y || 0) + 10 / globalScale);
          }}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            // Show edge label
            if (globalScale < 1.2) return;
            const source = link.source;
            const target = link.target;
            if (!source?.x || !target?.x) return;

            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            const fontSize = Math.max(7 / globalScale, 2.5);

            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillStyle = RELATIONSHIP_TYPE_COLORS[link.type as SkillRelationType] || "#a1a1aa";
            ctx.fillText(link.type, midX, midY - 3 / globalScale);
          }}
        />
      </div>

      {/* Relationship legend below graph */}
      <div className="mt-3 flex flex-wrap gap-3">
        {(Object.keys(RELATIONSHIP_TYPE_COLORS) as SkillRelationType[])
          .filter((type) => (linkTypeCounts[type] || 0) > 0)
          .map((type) => (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4 rounded"
                style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[type] }}
              />
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {RELATIONSHIP_TYPE_LABELS[type]} ({linkTypeCounts[type]})
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
