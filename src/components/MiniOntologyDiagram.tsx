/**
 * MiniOntologyDiagram — Clean enterprise taxonomy diagram for listing page heroes.
 * Flat card with solid connection lines, crisp nodes, and zinc-monochrome palette.
 * Links to the full 3-layer ontology page.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { ContentOntologyConfig } from "../lib/ontologyTypes";

/* ── Dark mode detection ─────────────────────────────────────────────── */

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains("dark")));
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/* ── Props ────────────────────────────────────────────────────────────── */

type MiniOntologyDiagramProps = {
  config: ContentOntologyConfig;
  categoryCounts: Record<string, number>;
  totalItems: number;
};

/* ── Component ───────────────────────────────────────────────────────── */

export default function MiniOntologyDiagram({
  config,
  categoryCounts,
  totalItems,
}: MiniOntologyDiagramProps) {
  const router = useRouter();
  const isDark = useIsDark();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const categories = config.categories.filter((c) => c.slug !== "other").slice(0, 6);

  /* ── SVG layout constants ── */
  const hubY = 58;
  const hubW = 110;
  const hubH = 40;
  const catHeight = 26;
  const nodeGapX = 6;
  const nodeGapY = 8;
  const catStartY = 130;
  const charWidth = 5.6;
  const nodePadX = 28; // dot (10) + gap (4) + left pad (6) + right pad (8)
  const svgMargin = 16;

  const catWidths = categories.map((cat) => {
    const textW = cat.label.length * charWidth;
    return Math.max(textW + nodePadX, 80);
  });

  const cols = Math.min(categories.length, 3);
  const totalRows = Math.ceil(categories.length / cols);

  /* Compute row widths to derive dynamic SVG width */
  const rowWidths: number[] = [];
  for (let r = 0; r < totalRows; r++) {
    const rs = r * cols;
    const re = Math.min(rs + cols, categories.length);
    let w = 0;
    for (let j = rs; j < re; j++) w += catWidths[j];
    w += (re - rs - 1) * nodeGapX;
    rowWidths.push(w);
  }
  const maxRowWidth = Math.max(...rowWidths, 0);
  const svgWidth = Math.max(maxRowWidth + svgMargin * 2, hubW + svgMargin * 2, 340);
  const centerX = svgWidth / 2;

  const catPositions = categories.map((_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const rowStart = row * cols;
    const rowEnd = Math.min(rowStart + cols, categories.length);
    const rowItems = rowEnd - rowStart;
    let rowTotalWidth = 0;
    for (let j = rowStart; j < rowEnd; j++) rowTotalWidth += catWidths[j];
    rowTotalWidth += (rowItems - 1) * nodeGapX;
    let x = (svgWidth - rowTotalWidth) / 2;
    for (let j = rowStart; j < rowStart + col; j++) x += catWidths[j] + nodeGapX;
    const y = catStartY + row * (catHeight + nodeGapY);
    return { x, y };
  });

  const svgHeight = catStartY + totalRows * (catHeight + nodeGapY) + 6;

  /* ── Colors ── */
  const bg = isDark ? "#18181b" : "#ffffff";
  const surfaceFill = isDark ? "#3f3f46" : "#f4f4f5";
  const stroke = isDark ? "#52525b" : "#e4e4e7";
  const textPrimary = isDark ? "#fafafa" : "#18181b";
  const textSecondary = isDark ? "#a1a1aa" : "#71717a";
  const textTertiary = isDark ? "#71717a" : "#a1a1aa";
  const lineStroke = isDark ? "#52525b" : "#d4d4d8";

  const handleCategoryClick = useCallback(
    (slug: string) => router.push(`${config.catalogPath}?category=${slug}`),
    [router, config.catalogPath],
  );

  return (
    <div className="mini-ontology-card group relative">
      {/* "Explore ontology" link */}
      <Link
        href={`${config.basePath}/ontology`}
        className="mini-ontology-explore-link"
      >
        <span>Explore ontology</span>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
        </svg>
      </Link>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{ fontFamily: "var(--font-inter), Inter, system-ui, sans-serif" }}
      >
        {/* ── Header label ── */}
        <text x={svgMargin} y="22" fontSize="9" fontWeight="600" letterSpacing="0.08em"
          fill={textSecondary}>
          {config.label.toUpperCase()} TAXONOMY
        </text>
        <line x1={svgMargin} y1="30" x2={svgWidth - svgMargin} y2="30" stroke={stroke} strokeWidth="0.5" />

        {/* ── Connection lines — clean solid curves ── */}
        {catPositions.map((pos, i) => {
          const cat = categories[i];
          const w = catWidths[i];
          const isHovered = hoveredCategory === cat.slug;
          const catColor = config.categoryColors[cat.slug] || textTertiary;
          const endX = pos.x + w / 2;
          const endY = pos.y;
          const lineStartY = hubY + hubH / 2 + 4;
          const cp1Y = lineStartY + (endY - lineStartY) * 0.35;
          const cp2Y = lineStartY + (endY - lineStartY) * 0.65;

          return (
            <path
              key={`line-${cat.slug}`}
              d={`M${centerX},${lineStartY} C${centerX},${cp1Y} ${endX},${cp2Y} ${endX},${endY}`}
              fill="none"
              stroke={isHovered ? catColor : lineStroke}
              strokeWidth={isHovered ? 1.5 : 0.75}
              style={{ transition: "stroke 0.15s, stroke-width 0.15s" }}
            />
          );
        })}

        {/* ── Central hub ── */}
        <rect
          x={centerX - hubW / 2} y={hubY - hubH / 2}
          width={hubW} height={hubH} rx={hubH / 2}
          fill={bg}
          stroke={stroke}
          strokeWidth="1"
        />
        <text x={centerX} y={hubY - 3} textAnchor="middle" dominantBaseline="middle"
          fontSize="12" fontWeight="700" letterSpacing="-0.02em"
          fill={textPrimary}>
          {config.label}
        </text>
        <text x={centerX} y={hubY + 10} textAnchor="middle" dominantBaseline="middle"
          fontSize="9" fontWeight="500"
          fill={textSecondary}>
          {totalItems.toLocaleString()} cataloged
        </text>

        {/* ── Category nodes ── */}
        {catPositions.map((pos, i) => {
          const cat = categories[i];
          const w = catWidths[i];
          const isHovered = hoveredCategory === cat.slug;
          const catColor = config.categoryColors[cat.slug] || textTertiary;

          return (
            <g
              key={cat.slug}
              onClick={() => handleCategoryClick(cat.slug)}
              onMouseEnter={() => setHoveredCategory(cat.slug)}
              onMouseLeave={() => setHoveredCategory(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={pos.x} y={pos.y}
                width={w} height={catHeight} rx="6"
                /* Hover tint bumped from 8.3% → 20% (dark) and 3.9% → 10%
                 * (light) so the category color is clearly readable
                 * against the pill background. Previous alphas were so
                 * faint in dark mode that hovered pills were visually
                 * indistinguishable from non-hovered ones, breaking the
                 * color-contrast affordance for all 4 taxonomy graphs
                 * (Agents, MCP, Skills, LLM Architectures). */
                fill={isHovered
                  ? (isDark ? `${catColor}33` : `${catColor}1A`)
                  : surfaceFill
                }
                stroke={isHovered ? catColor : stroke}
                strokeWidth={isHovered ? 1.25 : 0.5}
                style={{ transition: "stroke 0.15s, fill 0.15s, stroke-width 0.15s" }}
              />
              {/* Category color accent dot — slightly larger + full
               * opacity in default state so it reads cleanly in dark
               * mode without hover. */}
              <circle
                cx={pos.x + 10} cy={pos.y + catHeight / 2}
                r="2.75"
                fill={catColor}
                opacity={isHovered ? 1 : 0.85}
                style={{ transition: "opacity 0.15s, r 0.15s" }}
              />
              {/* Label — always textPrimary (#fafafa dark / #18181b light)
               * for WCAG-compliant contrast against both the plain pill
               * surface and the 20%-tinted hover state. fontWeight bumped
               * to 600 for better legibility at 10px. */}
              <text
                x={pos.x + 19} y={pos.y + catHeight / 2 + 0.5}
                dominantBaseline="middle"
                fontSize="10" fontWeight="600"
                fill={textPrimary}
                style={{ transition: "fill 0.15s" }}
              >
                {cat.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
