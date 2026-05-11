/**
 * Programmatic SVG architecture diagram for LLM decoder blocks.
 * Premium enterprise design — strict zinc monochrome + coral #DC2626 accent.
 *
 * Design principles (matches colaberry.ai theme):
 *   • Zinc scale fills only — coral reserved for the single MoE highlight
 *   • Differentiation through SHAPE/LAYOUT, not rainbow colors
 *   • Flat enterprise — no shadows, gradients, blur, or animation
 *   • WCAG AA contrast in both light and dark modes
 *   • Inter typography with strict weight hierarchy
 *
 * Each model looks visually distinct based on its actual architecture specs
 * (sourced from public HuggingFace config.json and ArXiv papers).
 */

import type { ReactNode } from "react";

interface ArchDiagramProps {
  name: string;
  decoderType: string;
  attention: string;
  parameters: string;
  contextWindow: string;
  activeParameters?: string | null;
  vocabSize?: string | null;
  hiddenSize?: number | null;
  numLayers?: number | null;
  keyFeatures?: string[];
  className?: string;
}

/* ── Parse model metadata into visual features ─────────────────────── */

type AttnType = "MHA" | "GQA" | "MQA" | "MLA" | "SWA" | "Mamba" | "DeltaNet" | "Lightning";
type NormType = "RMSNorm" | "LayerNorm";
type FFNType = "SwiGLU" | "GeGLU" | "GELU" | "Standard";
type PosEnc = "RoPE" | "Learned" | "NoPE" | "ALiBi" | "YaRN" | "";

interface ParsedArch {
  attnType: AttnType;
  hasQKNorm: boolean;
  hasSWA: boolean;
  hasSparse: boolean;
  posEnc: PosEnc;
  normType: NormType;
  ffnType: FFNType;
  isMoE: boolean;
  isHybrid: boolean;
  isRecurrent: boolean;
  layerCount: number;
}

function parseArch(props: ArchDiagramProps): ParsedArch {
  const a = props.attention.toUpperCase();
  const feats = (props.keyFeatures || []).join(" ").toLowerCase();

  let attnType: AttnType = "MHA";
  if (a.includes("MLA")) attnType = "MLA";
  else if (a.includes("MAMBA") || a.includes("MLSTM")) attnType = "Mamba";
  else if (a.includes("DELTANET")) attnType = "DeltaNet";
  else if (a.includes("LIGHTNING")) attnType = "Lightning";
  else if (a.includes("MQA")) attnType = "MQA";
  else if (a.includes("GQA")) attnType = "GQA";
  else if (a.includes("SWA") && !a.includes("GQA") && !a.includes("MHA") && !a.includes("MQA")) attnType = "SWA";

  let posEnc: PosEnc = "";
  if (a.includes("ROPE") || feats.includes("rope")) posEnc = "RoPE";
  else if (a.includes("NOPE")) posEnc = "NoPE";
  else if (a.includes("LEARNED") || feats.includes("learned")) posEnc = "Learned";
  else if (feats.includes("alibi")) posEnc = "ALiBi";
  else if (feats.includes("yarn")) posEnc = "YaRN";
  else posEnc = attnType === "MHA" ? "Learned" : "RoPE";

  const normType: NormType = feats.includes("layernorm") || feats.includes("layer norm") ? "LayerNorm" : "RMSNorm";

  let ffnType: FFNType = "SwiGLU";
  if (feats.includes("geglu")) ffnType = "GeGLU";
  else if (feats.includes("gelu") && !feats.includes("swiglu")) ffnType = "GELU";
  else if (feats.includes("standard") || feats.includes("classic")) ffnType = "Standard";

  // Old models (MHA without RoPE) likely use GELU
  if (attnType === "MHA" && posEnc === "Learned" && ffnType === "SwiGLU") ffnType = "GELU";

  // Prefer real layer count from HuggingFace config.json; fall back to estimate from param size
  let layerCount: number;
  if (props.numLayers && props.numLayers > 0) {
    layerCount = props.numLayers;
  } else {
    const p = parseParamNum(props.parameters);
    if (p >= 200) layerCount = 128;
    else if (p >= 60) layerCount = 96;
    else if (p >= 30) layerCount = 64;
    else if (p >= 13) layerCount = 40;
    else if (p >= 6) layerCount = 32;
    else if (p >= 2) layerCount = 24;
    else layerCount = 16;
  }

  return {
    attnType,
    hasQKNorm: a.includes("QK-NORM") || a.includes("QK NORM"),
    hasSWA: a.includes("SWA"),
    hasSparse: a.includes("SPARSE") || feats.includes("sparse attention"),
    posEnc,
    normType,
    ffnType,
    isMoE: props.decoderType === "MoE",
    isHybrid: props.decoderType === "Hybrid" || a.includes("MAMBA"),
    isRecurrent: props.decoderType === "Recurrent" || a.includes("MLSTM"),
    layerCount,
  };
}

function parseParamNum(s: string): number {
  const m = s.match(/([\d.]+)\s*(T|B|M)/i);
  if (!m) return 1;
  const n = parseFloat(m[1]);
  const u = m[2].toUpperCase();
  if (u === "T") return n * 1000;
  if (u === "M") return n / 1000;
  return n;
}

/* ── Constants ──────────────────────────────────────────────────────── */

const FONT = "var(--font-inter), Inter, system-ui, sans-serif";
const W = 360;
const H = 310;
const CORAL = "#DC2626";

/* ── Sub-components ─────────────────────────────────────────────────── */

function NormBlock({ x, y, w, label }: { x: number; y: number; w: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={16} rx={3}
        className="fill-zinc-200 stroke-zinc-400 dark:fill-zinc-700 dark:stroke-zinc-500"
        strokeWidth={1} />
      <text x={x + w / 2} y={y + 9} textAnchor="middle" dominantBaseline="middle"
        className="fill-zinc-700 dark:fill-zinc-100" fontSize={8} fontWeight={700} fontFamily={FONT}>
        {label}
      </text>
    </g>
  );
}

function ResidualLine({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  const r = 4;
  return (
    <path
      d={`M${x},${y1} L${x},${y1 + r} Q${x},${y1} ${x - r},${y1} L${x - 14},${y1} L${x - 14},${y2} L${x - r},${y2} Q${x},${y2} ${x},${y2 - r}`}
      className="stroke-zinc-400 dark:stroke-zinc-500" strokeWidth={1.25} fill="none" strokeDasharray="3 2" />
  );
}

function AddCircle({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={6.5}
        className="fill-white stroke-zinc-400 dark:fill-zinc-950 dark:stroke-zinc-500"
        strokeWidth={1.25} />
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
        className="fill-zinc-700 dark:fill-zinc-300" fontSize={9} fontWeight={700} fontFamily={FONT}>
        +
      </text>
    </g>
  );
}

function SmallArrow({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return (
    <line x1={x} y1={y1} x2={x} y2={y2}
      className="stroke-zinc-500 dark:stroke-zinc-400" strokeWidth={1.25}
      markerEnd="url(#sm-arrow)" />
  );
}

/* ── Block container — unified panel style for all attention/FFN blocks ── */

interface BlockContainerProps {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  /** Optional second title line (e.g. "+ DeepSeek Sparse Attention") */
  subtitle?: string;
  children?: ReactNode;
  primary?: boolean;
}

function BlockContainer({ x, y, w, h, title, subtitle, children, primary = false }: BlockContainerProps) {
  const hasSubtitle = !!subtitle;
  const titleY = hasSubtitle ? y + 8 : y + 9;
  const subtitleY = y + 16;
  const dividerY = hasSubtitle ? y + 21 : y + 14;
  return (
    <g>
      {/* Outer panel — slightly elevated above card surface.
          `primary` inverts the fill to make Attention the visually heaviest element. */}
      <rect x={x} y={y} width={w} height={h} rx={5}
        className={primary
          ? "fill-zinc-900 stroke-zinc-700 dark:fill-zinc-100 dark:stroke-zinc-300"
          : "fill-white stroke-zinc-300 dark:fill-zinc-950 dark:stroke-zinc-700"}
        strokeWidth={1.25} />
      {/* Title */}
      <text x={x + w / 2} y={titleY} textAnchor="middle" dominantBaseline="middle"
        className={primary
          ? "fill-white dark:fill-zinc-900"
          : "fill-zinc-900 dark:fill-zinc-50"}
        fontSize={8} fontWeight={700} fontFamily={FONT}>
        {title}
      </text>
      {/* Optional subtitle — used for attention variants like "+ DeepSeek Sparse Attention". */}
      {hasSubtitle && (
        <text x={x + w / 2} y={subtitleY} textAnchor="middle" dominantBaseline="middle"
          fill={CORAL}
          fontSize={6.5} fontWeight={700} fontFamily={FONT}
          style={{ letterSpacing: "0.02em" }}>
          {subtitle}
        </text>
      )}
      {/* Subtle divider between title and content */}
      <line x1={x + 4} y1={dividerY} x2={x + w - 4} y2={dividerY}
        className={primary
          ? "stroke-zinc-700 dark:stroke-zinc-300"
          : "stroke-zinc-200 dark:stroke-zinc-800"}
        strokeWidth={0.75} />
      {children}
    </g>
  );
}

interface SubBlockProps {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  fontSize?: number;
  variant?: "default" | "emphasized";
  primary?: boolean;
}

function SubBlock({ x, y, w, h, label, fontSize = 7, variant = "default", primary = false }: SubBlockProps) {
  let fillCls: string;
  let textCls: string;
  if (primary) {
    // Inverted: these sit on top of a dark/inverted BlockContainer (Attention block)
    fillCls = variant === "emphasized"
      ? "fill-zinc-600 stroke-zinc-400 dark:fill-zinc-200 dark:stroke-zinc-400"
      : "fill-zinc-700 stroke-zinc-500 dark:fill-zinc-300 dark:stroke-zinc-500";
    textCls = "fill-white dark:fill-zinc-900";
  } else {
    fillCls = variant === "emphasized"
      ? "fill-zinc-300 stroke-zinc-500 dark:fill-zinc-700 dark:stroke-zinc-500"
      : "fill-zinc-200 stroke-zinc-400 dark:fill-zinc-800 dark:stroke-zinc-600";
    textCls = variant === "emphasized"
      ? "fill-zinc-900 dark:fill-zinc-50"
      : "fill-zinc-800 dark:fill-zinc-200";
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2}
        className={fillCls} strokeWidth={0.75} />
      <text x={x + w / 2} y={y + h / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        className={textCls} fontSize={fontSize} fontWeight={700} fontFamily={FONT}>
        {label}
      </text>
    </g>
  );
}

/* ── Attention mechanism visuals (the main differentiator) ─────────── */

function MHABlock({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const innerY = y + 18;
  const innerH = h - 22;
  const headW = (w - 14) / 3;
  return (
    <BlockContainer x={x} y={y} w={w} h={h} title="Multi-Head Attention" primary>
      {/* 3 equal-width sub-blocks: full attention, all heads share dimensionality */}
      {["Q", "K", "V"].map((label, i) => (
        <SubBlock key={label}
          x={x + 4 + i * (headW + 2)} y={innerY}
          w={headW} h={innerH} label={label} fontSize={9} primary />
      ))}
    </BlockContainer>
  );
}

function GQABlock({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const innerY = y + 18;
  const innerH = h - 22;
  // Asymmetric: Q wide (many query heads), K/V narrow (few groups)
  const qW = (w - 14) * 0.55;
  const kvW = (w - 14) * 0.225;
  return (
    <BlockContainer x={x} y={y} w={w} h={h} title="Grouped Query Attention" primary>
      <SubBlock x={x + 4} y={innerY} w={qW} h={innerH} label="Q" fontSize={9} variant="emphasized" primary />
      <SubBlock x={x + 6 + qW} y={innerY} w={kvW} h={innerH} label="K" fontSize={7} primary />
      <SubBlock x={x + 8 + qW + kvW} y={innerY} w={kvW} h={innerH} label="V" fontSize={7} primary />
    </BlockContainer>
  );
}

function MQABlock({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const innerY = y + 18;
  const innerH = h - 22;
  // Most asymmetric: Q very wide (all heads), single shared K and V
  const qW = (w - 14) * 0.66;
  const kvW = (w - 14) * 0.17;
  return (
    <BlockContainer x={x} y={y} w={w} h={h} title="Multi-Query Attention" primary>
      <SubBlock x={x + 4} y={innerY} w={qW} h={innerH} label="Q · H heads" fontSize={6.5} variant="emphasized" primary />
      <SubBlock x={x + 6 + qW} y={innerY} w={kvW} h={innerH} label="K" fontSize={6.5} primary />
      <SubBlock x={x + 8 + qW + kvW} y={innerY} w={kvW} h={innerH} label="V" fontSize={6.5} primary />
    </BlockContainer>
  );
}

function MLABlock({ x, y, w, h, hasSparse }: { x: number; y: number; w: number; h: number; hasSparse?: boolean }) {
  // When sparse subtitle is visible, shift the inner content down so it doesn't overlap.
  const innerY = y + (hasSparse ? 25 : 18);
  const innerH = h - (hasSparse ? 29 : 22);
  // Latent compression in center, Q/K/V projections fan out below
  const cW = (w - 14) * 0.34;
  const projW = (w - 18) * 0.18;
  return (
    <BlockContainer
      x={x} y={y} w={w} h={h}
      title="Multi-head Latent Attention"
      subtitle={hasSparse ? "+ DeepSeek Sparse Attention" : undefined}
      primary
    >
      {/* Latent core — emphasized lighter fill on dark container */}
      <SubBlock x={x + (w - cW) / 2} y={innerY} w={cW} h={innerH - 14} label="Latent" fontSize={7} variant="emphasized" primary />
      {/* Fan-out projections below the latent core */}
      {["Q", "K", "V"].map((label, i) => {
        const px = x + 6 + i * (projW + 2);
        return (
          <SubBlock key={label} x={px} y={y + h - 12} w={projW} h={9} label={label} fontSize={6} primary />
        );
      })}
    </BlockContainer>
  );
}

function SSMBlock({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <BlockContainer x={x} y={y} w={w} h={h} title="State Space Model" primary>
      {/* Recurrent loop arrow — visual signature of SSM/Mamba.
          On a primary (inverted) container the loop + text invert to white/zinc-900. */}
      <path d={`M${x + w / 2 - 22},${y + h / 2 + 8} C${x + w / 2 - 22},${y + h / 2 + 18} ${x + w / 2 + 22},${y + h / 2 + 18} ${x + w / 2 + 22},${y + h / 2 + 8}`}
        className="stroke-zinc-200 dark:stroke-zinc-700" strokeWidth={1.5} fill="none" markerEnd="url(#sm-arrow-light)" />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" dominantBaseline="middle"
        className="fill-white dark:fill-zinc-900" fontSize={7.5} fontWeight={700} fontFamily={FONT}>
        Selective scan
      </text>
    </BlockContainer>
  );
}

/* ── FFN block — coral accent reserved for MoE router ──────────────── */

function FFNBlock({ x, y, w, h, ffnType, isMoE }: { x: number; y: number; w: number; h: number; ffnType: FFNType; isMoE: boolean }) {
  if (isMoE) {
    const innerY = y + 18;
    const innerH = h - 22;
    const routerW = w * 0.22;
    const expertsAreaW = w - routerW - 14;
    const expertW = (expertsAreaW - 6) / 4 - 2;
    return (
      <BlockContainer x={x} y={y} w={w} h={h} title="MoE Feed-Forward">
        {/* Router — CORAL accent (the single colored fill in the entire diagram) */}
        <rect x={x + 4} y={innerY} width={routerW} height={innerH} rx={2}
          fill={CORAL} stroke={CORAL} strokeWidth={0.75} />
        <text x={x + 4 + routerW / 2} y={innerY + innerH / 2 + 1}
          textAnchor="middle" dominantBaseline="middle"
          className="fill-white" fontSize={6.5} fontWeight={700} fontFamily={FONT}>
          Router
        </text>
        {/* Experts — zinc, with first 2 marked active (top-k=2 routing pattern) */}
        {Array.from({ length: 4 }).map((_, i) => {
          const ex = x + routerW + 8 + i * (expertW + 2);
          return (
            <g key={i}>
              <rect x={ex} y={innerY} width={expertW} height={innerH} rx={2}
                className="fill-zinc-200 stroke-zinc-400 dark:fill-zinc-800 dark:stroke-zinc-600"
                strokeWidth={0.75} />
              {i < 2 && (
                <circle cx={ex + expertW / 2} cy={innerY + innerH - 3} r={1.5} fill={CORAL} />
              )}
            </g>
          );
        })}
      </BlockContainer>
    );
  }

  // Dense FFN
  const innerY = y + 18;
  const innerH = h - 22;
  const halfW = (w - 14) / 2;
  return (
    <BlockContainer x={x} y={y} w={w} h={h} title={`Feed-Forward · ${ffnType}`}>
      {ffnType === "SwiGLU" || ffnType === "GeGLU" ? (
        <>
          <SubBlock x={x + 4} y={innerY} w={halfW} h={innerH} label="Gate" fontSize={7} />
          <SubBlock x={x + 8 + halfW} y={innerY} w={halfW} h={innerH} label="Up" fontSize={7} />
        </>
      ) : (
        <SubBlock x={x + 4} y={innerY} w={w - 8} h={innerH}
          label={`Linear → ${ffnType} → Linear`} fontSize={6.5} />
      )}
    </BlockContainer>
  );
}

/* ── Main diagram ──────────────────────────────────────────────────── */

export default function ArchitectureDiagram(props: ArchDiagramProps) {
  const { decoderType, parameters, contextWindow, vocabSize, hiddenSize, className = "" } = props;
  const arch = parseArch(props);

  // Layout dimensions — wider than before to leave a right-side annotation column
  // for vocab / embed-dim / RoPE callouts in the Raschka style.
  const padL = 40;
  const padR = 56;
  const blockW = W - padL - padR;
  const blockX = padL;
  const annX = blockX + blockW + 6;  // right-side annotation column start

  // Vertical positions (top-to-bottom flow) — order on screen:
  //   Linear output layer  →  Final RMSNorm  →  middle container {addB → FFN → NormB → addA → Attn → NormA}  →  Token embedding
  const outputY = 10;         // Linear output layer block
  const outputH = 18;
  const finalNormY = 36;      // Final RMSNorm block
  const finalNormH = 16;

  // Inside middle container — keep original relative spacing, just shifted down
  const addBY = 68;
  const ffnY = 78;
  const ffnH = arch.isMoE ? 48 : 44;
  const ffnBottom = ffnY + ffnH;
  const normBY = ffnBottom + 2;
  const addAY = normBY + 44;             // 16 (norm h) + 28 (gap) → center of + circle
  const attnY = addAY + 10;
  const attnH = arch.hasSparse ? 66 : 56; // taller when sparse subtitle needs room
  const normAY = attnY + attnH + 10;
  const embedY = normAY + 26;            // Token embedding layer (outside container)

  // Build LLM-indexable architecture description
  const indexableText = [
    `${props.name} decoder block architecture:`,
    `Attention: ${props.attention}${arch.hasQKNorm ? " with QK-Norm" : ""}${arch.hasSWA ? " with Sliding Window Attention" : ""}.`,
    `Normalization: ${arch.normType}.`,
    `FFN: ${arch.isMoE ? "Mixture of Experts" : arch.ffnType}${arch.isMoE && props.activeParameters ? ` (${props.activeParameters} active parameters)` : ""}.`,
    `Position encoding: ${arch.posEnc || "unknown"}.`,
    `Scale: ${parameters}, ${contextWindow} context, ${arch.layerCount} layers.`,
    `Decoder type: ${decoderType}.`,
  ].join(" ");

  return (
    <div className={`relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 ${className}`}>
      {/* Visually hidden but LLM-indexable architecture description for AEO */}
      <p className="sr-only">{indexableText}</p>
      {/* Inner padding only — width/max-width controlled by parent via className.
          On listing cards the parent caps it (~360px). On the detail page the
          parent lets it grow to fill the column for clarity. */}
      <div className="mx-auto w-full px-3 py-4 sm:px-4 sm:py-6">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <marker id="sm-arrow" markerWidth="5" markerHeight="4" refX="3" refY="2" orient="auto">
              <polygon points="0 0, 5 2, 0 4" className="fill-zinc-600 dark:fill-zinc-300" />
            </marker>
            {/* Light arrow — used on primary (inverted) containers */}
            <marker id="sm-arrow-light" markerWidth="5" markerHeight="4" refX="3" refY="2" orient="auto">
              <polygon points="0 0, 5 2, 0 4" className="fill-zinc-200 dark:fill-zinc-700" />
            </marker>
          </defs>

          {/* ── Linear output layer block (Raschka: "Linear output layer") ── */}
          <rect x={blockX} y={outputY} width={blockW} height={outputH} rx={3}
            className="fill-zinc-900 stroke-zinc-900 dark:fill-zinc-100 dark:stroke-zinc-100"
            strokeWidth={1.25} />
          <text x={blockX + blockW / 2} y={outputY + 10} textAnchor="middle" dominantBaseline="middle"
            className="fill-white dark:fill-zinc-900" fontSize={8} fontWeight={700} fontFamily={FONT}>
            Linear output layer
          </text>
          {/* Vocab size annotation on the right side */}
          {vocabSize && (
            <text x={annX} y={outputY + 11} textAnchor="start" dominantBaseline="middle"
              className="fill-zinc-500 dark:fill-zinc-400"
              fontSize={6.5} fontWeight={600} fontFamily={FONT}>
              Vocab: {vocabSize}
            </text>
          )}

          <SmallArrow x={W / 2} y1={outputY + outputH + 1} y2={finalNormY} />

          {/* ── Final RMSNorm block (Raschka: "Final RMSNorm") ── */}
          <NormBlock x={blockX + 8} y={finalNormY} w={blockW - 16} label={`Final ${arch.normType}`} />
          <SmallArrow x={W / 2} y1={finalNormY + finalNormH + 1} y2={addBY - 6} />

          {/* ── Middle container (level 2 of 3-level nesting) ──────
              Concentric container that visually groups addB → FFN → NormB → addA → Attention → NormA
              as "one decoder layer". Repeated ×N by the left-side bracket + coral label. */}
          {(() => {
            const mcX = blockX - 4;
            const mcW = blockW + 8;
            const mcY = addBY - 8;
            const mcBottom = normAY + 16 + 8;
            const mcH = mcBottom - mcY;
            const midY = mcY + mcH / 2;
            return (
              <>
                <rect x={mcX} y={mcY} width={mcW} height={mcH} rx={6}
                  className="fill-zinc-100 stroke-zinc-200 dark:fill-zinc-800 dark:stroke-zinc-700"
                  strokeWidth={1} />
                {/* Left-side { bracket — points to the coral layer-count label */}
                <path
                  d={`M32,${mcY} Q22,${mcY} 22,${mcY + 8} L22,${midY - 5} Q18,${midY} 22,${midY + 5} L22,${mcY + mcH - 8} Q22,${mcY + mcH} 32,${mcY + mcH}`}
                  className="stroke-zinc-400 dark:stroke-zinc-500"
                  strokeWidth={1.5} fill="none" strokeLinecap="round" />
                {/* Rotated coral layer count label */}
                <text x={12} y={midY}
                  textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(-90, 12, ${midY})`}
                  fill={CORAL} fontSize={8.5} fontWeight={700} fontFamily={FONT}
                  style={{ letterSpacing: "0.08em" }}>
                  × {arch.layerCount} LAYERS
                </text>
              </>
            );
          })()}

          {/* ── Residual connection B (around FFN) ────────────────── */}
          <ResidualLine x={blockX + 2} y1={addBY} y2={normBY + 8} />
          <AddCircle x={blockX + 14} y={addBY} />

          {/* ── FFN Block ─────────────────────────────────────────── */}
          <FFNBlock x={blockX + 8} y={ffnY} w={blockW - 16} h={ffnH} ffnType={arch.ffnType} isMoE={arch.isMoE} />
          {/* Active-params annotation on the right side (MoE only) */}
          {arch.isMoE && props.activeParameters && (
            <text x={annX} y={ffnY + ffnH / 2 + 1} textAnchor="start" dominantBaseline="middle"
              className="fill-zinc-500 dark:fill-zinc-400"
              fontSize={6.5} fontWeight={600} fontFamily={FONT}>
              {props.activeParameters} active
            </text>
          )}
          <SmallArrow x={W / 2} y1={ffnY + ffnH + 2} y2={normBY} />

          {/* ── Norm B ────────────────────────────────────────────── */}
          <NormBlock x={blockX + 8} y={normBY} w={blockW - 16} label={`${arch.normType} 2`} />
          <SmallArrow x={W / 2} y1={normBY + 18} y2={addAY} />

          {/* ── Residual connection A (around Attention) ──────────── */}
          <ResidualLine x={blockX + 2} y1={addAY} y2={normAY + 8} />
          <AddCircle x={blockX + 14} y={addAY} />

          {/* ── Attention Block ───────────────────────────────────── */}
          {arch.isRecurrent || arch.attnType === "Mamba" ? (
            <SSMBlock x={blockX + 8} y={attnY} w={blockW - 16} h={attnH} />
          ) : arch.attnType === "MLA" || arch.attnType === "Lightning" ? (
            <MLABlock x={blockX + 8} y={attnY} w={blockW - 16} h={attnH} hasSparse={arch.hasSparse} />
          ) : arch.attnType === "MQA" ? (
            <MQABlock x={blockX + 8} y={attnY} w={blockW - 16} h={attnH} />
          ) : arch.attnType === "GQA" || arch.attnType === "SWA" ? (
            <GQABlock x={blockX + 8} y={attnY} w={blockW - 16} h={attnH} />
          ) : (
            <MHABlock x={blockX + 8} y={attnY} w={blockW - 16} h={attnH} />
          )}

          {/* QK-Norm badge */}
          {arch.hasQKNorm && (
            <g>
              <rect x={blockX + blockW - 50} y={attnY + attnH - 14} width={42} height={11} rx={5.5}
                className="fill-zinc-100 stroke-zinc-300 dark:fill-zinc-800 dark:stroke-zinc-600" strokeWidth={0.75} />
              <text x={blockX + blockW - 29} y={attnY + attnH - 8} textAnchor="middle" dominantBaseline="middle"
                className="fill-zinc-700 dark:fill-zinc-200" fontSize={6} fontWeight={700} fontFamily={FONT}>
                QK-Norm
              </text>
            </g>
          )}

          {/* SWA badge */}
          {arch.hasSWA && (
            <g>
              <rect x={blockX + blockW - 50} y={attnY + 2} width={42} height={11} rx={5.5}
                className="fill-zinc-100 stroke-zinc-300 dark:fill-zinc-800 dark:stroke-zinc-600" strokeWidth={0.75} />
              <text x={blockX + blockW - 29} y={attnY + 8} textAnchor="middle" dominantBaseline="middle"
                className="fill-zinc-700 dark:fill-zinc-200" fontSize={6} fontWeight={700} fontFamily={FONT}>
                SWA
              </text>
            </g>
          )}

          {/* RoPE / YaRN side callout — positional encoding is applied inside attention
              (matches Raschka: a small RoPE box pointing into the attention block). */}
          {(arch.posEnc === "RoPE" || arch.posEnc === "YaRN") && (() => {
            const midY = attnY + attnH / 2;
            const rX = annX;
            const rW = 48;
            const rH = 16;
            const rY = midY - rH / 2;
            return (
              <g>
                <line x1={blockX + blockW} y1={midY} x2={rX} y2={midY}
                  className="stroke-zinc-400 dark:stroke-zinc-500"
                  strokeWidth={0.9} strokeDasharray="2 2" />
                <rect x={rX} y={rY} width={rW} height={rH} rx={5}
                  className="fill-white stroke-zinc-300 dark:fill-zinc-950 dark:stroke-zinc-600"
                  strokeWidth={0.9} />
                <text x={rX + rW / 2} y={midY + 0.5} textAnchor="middle" dominantBaseline="middle"
                  className="fill-zinc-700 dark:fill-zinc-200"
                  fontSize={7} fontWeight={700} fontFamily={FONT}>
                  {arch.posEnc}
                </text>
              </g>
            );
          })()}

          <SmallArrow x={W / 2} y1={attnY + attnH + 2} y2={normAY} />

          {/* ── Norm A ────────────────────────────────────────────── */}
          <NormBlock x={blockX + 8} y={normAY} w={blockW - 16} label={`${arch.normType} 1`} />
          <SmallArrow x={W / 2} y1={normAY + 18} y2={embedY} />

          {/* ── Token embedding layer — primary block (zinc-900 inverted) ── */}
          <rect x={blockX} y={embedY} width={blockW} height={18} rx={3}
            className="fill-zinc-900 stroke-zinc-900 dark:fill-zinc-100 dark:stroke-zinc-100"
            strokeWidth={1.25} />
          <text x={blockX + blockW / 2} y={embedY + 10} textAnchor="middle" dominantBaseline="middle"
            className="fill-white dark:fill-zinc-900" fontSize={8} fontWeight={700} fontFamily={FONT}>
            Token embedding layer
          </text>
          {/* Embedding dimension annotation on the right side */}
          {hiddenSize && (
            <text x={annX} y={embedY + 11} textAnchor="start" dominantBaseline="middle"
              className="fill-zinc-500 dark:fill-zinc-400"
              fontSize={6.5} fontWeight={600} fontFamily={FONT}>
              Dim: {hiddenSize.toLocaleString()}
            </text>
          )}

        </svg>
      </div>
      {/* Bottom legend — coral dot only when MoE */}
      <div className="flex items-center justify-center gap-2 border-t border-zinc-200 px-3 py-2.5 text-[10px] font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
        <span className="inline-block h-2 w-2 rounded-sm bg-zinc-700 dark:bg-zinc-300" />
        <span>{props.attention}</span>
        <span className="text-zinc-300 dark:text-zinc-600">·</span>
        {arch.isMoE ? (
          <>
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: CORAL }} />
            <span>MoE · {props.activeParameters || ""} active</span>
          </>
        ) : (
          <>
            <span className="inline-block h-2 w-2 rounded-sm bg-zinc-500 dark:bg-zinc-400" />
            <span>{arch.ffnType}</span>
          </>
        )}
      </div>
    </div>
  );
}
