/**
 * CollectionGraph — Premium embedded force-graph for collections and detail sidebars.
 * Shows a mini graph with relationship edges, color-coded by type.
 * Used on: Collection detail page, skill detail sidebar (mini-graph).
 *
 * Premium features:
 * - Node outer glow for depth
 * - Curved edges with particles
 * - Text shadow labels for readability
 * - Bottom gradient overlay
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

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type CollectionGraphProps = {
  nodes: GraphNode[];
  links: GraphLink[];
  height?: number;
  showLabels?: boolean;
  highlightNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
        No data available for graph
      </div>
    );
  }

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
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
            const color = RELATIONSHIP_TYPE_COLORS[link.type];
            return color ? hexToRgba(color, 0.5) : "rgba(113,113,122,0.25)";
          }}
          linkWidth={(link: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            link.type === "compose_with" || link.type === "depend_on" ? 1.8 : 1.0
          }
          linkCurvature={0.12}
          linkDirectionalParticles={(link: any) => link.type === "depend_on" ? 2 : 0} // eslint-disable-line @typescript-eslint/no-explicit-any
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={(link: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            RELATIONSHIP_TYPE_COLORS[link.type] || "#f87171"
          }
          backgroundColor="#09090b"
          onNodeClick={handleClick}
          cooldownTicks={60}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            const x = node.x || 0;
            const y = node.y || 0;
            const nodeColor = node.color || CATEGORY_COLORS[node.category] || "#a1a1aa";
            const isHighlighted = highlightNodeId === node.id;
            const r = Math.sqrt(Math.max(node.val || 2, 0.5)) * 6;

            // Outer glow
            ctx.save();
            ctx.shadowColor = isHighlighted ? "#DC2626" : nodeColor;
            ctx.shadowBlur = isHighlighted ? 16 : 6;
            ctx.beginPath();
            ctx.arc(x, y, r / globalScale, 0, 2 * Math.PI);
            ctx.fillStyle = isHighlighted ? "#DC2626" : nodeColor;
            ctx.fill();
            ctx.restore();

            // Highlight ring
            if (isHighlighted) {
              ctx.beginPath();
              ctx.arc(x, y, (r + 4) / globalScale, 0, 2 * Math.PI);
              ctx.strokeStyle = "#DC2626";
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            }

            if (!showLabels) return;
            const label = node.name || "";
            const fontSize = Math.max(10 / globalScale, 3);
            ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            // Text shadow
            ctx.fillStyle = "rgba(9,9,11,0.7)";
            ctx.fillText(label, x + 0.3, y + (r + 3) / globalScale + 0.3);
            ctx.fillStyle = "#e4e4e7";
            ctx.fillText(label, x, y + (r + 3) / globalScale);
          }}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (globalScale < 1.2) return;
            const source = link.source;
            const target = link.target;
            if (!source?.x || !target?.x) return;

            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            const fontSize = Math.max(7 / globalScale, 2.5);

            ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillStyle = RELATIONSHIP_TYPE_COLORS[link.type] || "#a1a1aa";
            ctx.fillText(RELATIONSHIP_TYPE_LABELS[link.type] || link.type, midX, midY - 3 / globalScale);
          }}
        />

        {/* Bottom gradient for depth */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-zinc-950/40 to-transparent" />
      </div>

      {/* Relationship legend below graph */}
      <div className="mt-2.5 flex flex-wrap gap-3">
        {Object.keys(RELATIONSHIP_TYPE_COLORS)
          .filter((type) => (linkTypeCounts[type] || 0) > 0)
          .map((type) => (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4 rounded-full"
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
