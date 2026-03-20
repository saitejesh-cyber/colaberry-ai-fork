/**
 * ContentTypeIcon — Premium SVG icons for each content type.
 *
 * Usage:
 *   <ContentTypeIcon type="skill" size={20} className="text-blue-500" />
 *
 * For use inside raw <svg> elements (e.g. platform ontology diagram):
 *   <ContentTypeIconSvg type="skill" x={100} y={80} size={18} fill="#60a5fa" />
 *
 * Icons are clean, monochrome line-art designed for enterprise presentation.
 */

import type { ContentTypeName } from "../lib/ontologyTypes";

/* ── SVG path data per content type ───────────────────────────────── */

const ICON_PATHS: Record<ContentTypeName, { d: string; viewBox: string }> = {
  skill: {
    viewBox: "0 0 24 24",
    // Lightning bolt — clean geometric
    d: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  },
  agent: {
    viewBox: "0 0 24 24",
    // Robot/processor chip — represents AI agents
    d: "M9 2v2H7a2 2 0 00-2 2v2H3v4h2v2a2 2 0 002 2h2v2h2v-2h2v2h2v-2h2a2 2 0 002-2v-2h2V8h-2V6a2 2 0 00-2-2h-2V2h-2v2h-2V2H9zm-2 6h10v8H7V8zm3 2v1h1v-1h-1zm3 0v1h1v-1h-1zm-4 3v1h4v-1H9z",
  },
  mcp: {
    viewBox: "0 0 24 24",
    // Server/connection hub — represents MCP servers
    d: "M4 6a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm14 1.5a1 1 0 10-2 0 1 1 0 002 0zM4 15a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3zm14 1.5a1 1 0 10-2 0 1 1 0 002 0z",
  },
  tool: {
    viewBox: "0 0 24 24",
    // Wrench + gear — represents tools/utilities
    d: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  },
  podcast: {
    viewBox: "0 0 24 24",
    // Microphone — clean studio mic
    d: "M12 1a4 4 0 00-4 4v7a4 4 0 008 0V5a4 4 0 00-4-4zM6 11a1 1 0 10-2 0 8 8 0 0016 0 1 1 0 10-2 0 6 6 0 01-12 0zm5 9.93V23h2v-2.07A9.004 9.004 0 0021 12h-2a7 7 0 01-14 0H3a9.004 9.004 0 008 8.93z",
  },
};

/* ── React component for HTML context ────────────────────────────── */

type ContentTypeIconProps = {
  type: ContentTypeName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

export default function ContentTypeIcon({
  type,
  size = 20,
  className = "",
  style,
}: ContentTypeIconProps) {
  const icon = ICON_PATHS[type];
  return (
    <svg
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={icon.d} />
    </svg>
  );
}

/* ── SVG sub-component for use inside raw <svg> elements ──────────── */

type ContentTypeIconSvgProps = {
  type: ContentTypeName;
  x: number;
  y: number;
  size?: number;
  fill?: string;
};

export function ContentTypeIconSvg({
  type,
  x,
  y,
  size = 18,
  fill = "currentColor",
}: ContentTypeIconSvgProps) {
  const icon = ICON_PATHS[type];
  const half = size / 2;
  return (
    <g transform={`translate(${x - half}, ${y - half})`}>
      <svg
        width={size}
        height={size}
        viewBox={icon.viewBox}
        fill="none"
      >
        <path d={icon.d} fill={fill} />
      </svg>
    </g>
  );
}

/** Export path data for external SVG usage */
export { ICON_PATHS };
