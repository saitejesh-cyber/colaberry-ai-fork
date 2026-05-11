"use client";

import { useMemo } from "react";
import { m, useReducedMotion } from "framer-motion";

/**
 * HeroGraphBloom
 * --------------
 * Sprint v5 kinetic-pacing. SVG "coded motion" graph constellation that sits
 * behind the hero as a visual anchor — replacing the `.hero-orb` gradient-blur
 * stack with a tangible, brand-relevant artifact (a knowledge graph is literally
 * what Colaberry AI is).
 *
 * Design rules:
 *   - Zinc + coral only. No blues, greens, ambers. Coral `#DC2626` on the
 *     center node + a small subset of pulse rings (< 20% of the graph).
 *   - Deterministic node positions (seeded pseudo-random) — SSR and client
 *     render identical SVG, no hydration mismatch.
 *   - Edges draw in via `pathLength` (0 → 1), nodes stagger-fade after.
 *   - Respects `prefers-reduced-motion` — collapses to the final drawn state.
 *   - Purely decorative — `aria-hidden="true"`, no content impact on AEO.
 *   - viewBox 400×400 but with `preserveAspectRatio="xMidYMid slice"` so it
 *     fills whatever container it's given without distorting.
 */

type Node = { id: number; x: number; y: number; r: number; kind: "center" | "primary" | "secondary" };
type Edge = { from: number; to: number };

// Linear congruential generator — deterministic across SSR and client.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 0x100000000;
    return s / 0x100000000;
  };
}

/* Round to 2 decimals so SSR and client serialize identically.
 * Without this, Math.cos/sin produces full-precision floats (e.g.
 * 142.44070994596987) and React's SSR vs client paths emit different
 * string forms (15 vs 16 digits), triggering a hydration mismatch on
 * every <line>/<circle> and a visible flash of the SVG on mount. */
const r2 = (n: number) => Math.round(n * 100) / 100;

function buildGraph() {
  const rand = seeded(0xc01a_be77);
  const cx = 200;
  const cy = 200;
  const nodes: Node[] = [];

  // Center node
  nodes.push({ id: 0, x: cx, y: cy, r: 6, kind: "center" });

  // Inner ring — 8 primary nodes (radius 70)
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 + 0.18;
    nodes.push({
      id: nodes.length,
      x: r2(cx + Math.cos(angle) * 70),
      y: r2(cy + Math.sin(angle) * 70),
      r: 3.2,
      kind: "primary",
    });
  }

  // Outer ring — 16 secondary nodes on a loose ring (radius 140 ± jitter)
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2 + 0.05;
    const rad = 138 + (rand() - 0.5) * 18;
    nodes.push({
      id: nodes.length,
      x: r2(cx + Math.cos(angle) * rad),
      y: r2(cy + Math.sin(angle) * rad),
      r: r2(2.2 + rand() * 0.8),
      kind: "secondary",
    });
  }

  // Edges: center → each primary
  const edges: Edge[] = [];
  for (let i = 1; i <= 8; i += 1) edges.push({ from: 0, to: i });

  // Each primary → 2 nearest secondaries (greedy by angle)
  for (let i = 1; i <= 8; i += 1) {
    const p = nodes[i];
    const scored = nodes
      .slice(9) // secondaries start at id 9
      .map((s) => ({ id: s.id, d: Math.hypot(s.x - p.x, s.y - p.y) }))
      .sort((a, b) => a.d - b.d);
    edges.push({ from: i, to: scored[0].id });
    edges.push({ from: i, to: scored[1].id });
  }

  // A handful of cross-ring edges for visual density
  edges.push({ from: 1, to: 5 });
  edges.push({ from: 3, to: 7 });
  edges.push({ from: 2, to: 6 });

  return { nodes, edges };
}

export default function HeroGraphBloom() {
  const reduceMotion = useReducedMotion();
  const { nodes, edges } = useMemo(() => buildGraph(), []);

  // Total sequence timing. Edges first (0 - 1200ms), then nodes (900 - 1700ms).
  // Under reduced-motion, collapse everything to a single-frame fade.
  const edgeDuration = reduceMotion ? 0.01 : 1.2;
  const edgeStagger = reduceMotion ? 0 : 0.025;
  const nodeDuration = reduceMotion ? 0.01 : 0.45;
  const nodeStaggerDelay = reduceMotion ? 0 : 0.9;
  const nodeStagger = reduceMotion ? 0 : 0.025;

  return (
    <svg
      aria-hidden="true"
      role="presentation"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      className="hero-graph-bloom"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <defs>
        {/* Soft radial glow behind the center node — coral-tinted. */}
        <radialGradient id="heroBloomCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#DC2626" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#DC2626" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
        </radialGradient>

        {/* Subtle gradient for the concentric rings. */}
        <radialGradient id="heroBloomRing" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="95%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Atmospheric coral glow — single warm focal point. */}
      <circle cx="200" cy="200" r="180" fill="url(#heroBloomCoreGlow)" />

      {/* Concentric reference rings — very faint, hand-drawn feel. */}
      <circle cx="200" cy="200" r="70" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="140" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

      {/* Edges (drawn first — pathLength stroke-trace). */}
      <g stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" fill="none" strokeLinecap="round">
        {edges.map((edge, idx) => {
          const from = nodes[edge.from];
          const to = nodes[edge.to];
          return (
            <m.line
              key={`edge-${edge.from}-${edge.to}-${idx}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: {
                  duration: edgeDuration,
                  delay: idx * edgeStagger,
                  ease: [0.22, 1, 0.36, 1],
                },
                opacity: {
                  duration: 0.3,
                  delay: idx * edgeStagger,
                },
              }}
            />
          );
        })}
      </g>

      {/* Nodes (fade + subtle scale after edges have drawn). */}
      <g>
        {nodes.map((node, idx) => {
          const isCenter = node.kind === "center";
          const fill = isCenter ? "#DC2626" : node.kind === "primary" ? "#FAFAFA" : "rgba(250,250,250,0.65)";
          const strokeColor = isCenter ? "rgba(220,38,38,0.45)" : "rgba(255,255,255,0.20)";
          return (
            <m.circle
              key={`node-${node.id}`}
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={fill}
              stroke={strokeColor}
              strokeWidth={isCenter ? 1.5 : 0.6}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: nodeDuration,
                delay: nodeStaggerDelay + idx * nodeStagger,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ transformOrigin: `${node.x}px ${node.y}px` }}
            />
          );
        })}
      </g>

      {/* Center-node pulse — coral breathing ring, ~4s loop. Skipped under reduced-motion. */}
      {!reduceMotion && (
        <m.circle
          cx="200"
          cy="200"
          r="6"
          fill="none"
          stroke="#DC2626"
          strokeWidth="1"
          initial={{ opacity: 0.55, scale: 1 }}
          animate={{ opacity: 0, scale: 3.5 }}
          transition={{
            duration: 4,
            ease: "easeOut",
            repeat: Infinity,
            repeatDelay: 0,
          }}
          style={{ transformOrigin: "200px 200px" }}
        />
      )}
    </svg>
  );
}
