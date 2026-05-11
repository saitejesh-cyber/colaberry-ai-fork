import Link from "next/link";
import ArchitectureDiagram from "./ArchitectureDiagram";

export interface LLMArchCardProps {
  name: string;
  slug?: string;
  organization: string;
  description?: string | null;
  parameters: string;
  activeParameters?: string | null;
  contextWindow: string;
  releaseDate: string;
  decoderType: string;
  attention: string;
  keyFeatures?: string[];
  vocabSize?: string | null;
  numLayers?: number | null;
  hiddenSize?: number | null;
  configUrl?: string | null;
  paperUrl?: string | null;
  verified?: boolean | null;
}

type ViewMode = "detailed" | "compact";

const DECODER_DOT: Record<string, string> = {
  Dense: "bg-zinc-400 dark:bg-zinc-500",
  MoE: "bg-[#DC2626]",
  Hybrid: "bg-zinc-600 dark:bg-zinc-300",
  Recurrent: "bg-zinc-500 dark:bg-zinc-400",
};

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1.5">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{label}</span>
      <span className="text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">{value}</span>
    </div>
  );
}

export default function LLMArchitectureCard({ arch, viewMode = "detailed" }: { arch: LLMArchCardProps; viewMode?: ViewMode }) {
  const href = arch.slug ? `/aixcelerator/llm-architectures/${arch.slug}` : "/aixcelerator/llm-architectures";
  const dot = DECODER_DOT[arch.decoderType] || DECODER_DOT.Dense;
  const paramDisplay = arch.activeParameters
    ? `${arch.activeParameters} / ${arch.parameters}`
    : arch.parameters;

  if (viewMode === "compact") {
    return (
      <Link href={href} className="group block" aria-label={`View ${arch.name} architecture details`}>
        <div className="catalog-card flex items-center gap-4 px-5 py-3">
          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{arch.name}</h3>
              <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">{arch.organization}</span>
            </div>
          </div>
          <div className="hidden items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 sm:flex">
            <span className="font-mono">{paramDisplay}</span>
            <span>{arch.decoderType}</span>
            <span>{arch.contextWindow}</span>
            <span>{arch.releaseDate}</span>
          </div>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="card-arrow h-3.5 w-3.5 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400">
            <path d="M6.5 3.5 11 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      </Link>
    );
  }

  /* ── Detailed card ─────────────────────────────────────────────────── */
  return (
    <article className="catalog-card flex h-full flex-col overflow-hidden">
      {/* Architecture Diagram — compact, constrained height */}
      <Link href={href} className="block" aria-label={`View ${arch.name} architecture details`}>
        <ArchitectureDiagram
          name={arch.name}
          decoderType={arch.decoderType}
          attention={arch.attention}
          parameters={arch.parameters}
          contextWindow={arch.contextWindow}
          activeParameters={arch.activeParameters}
          vocabSize={arch.vocabSize}
          hiddenSize={arch.hiddenSize}
          numLayers={arch.numLayers}
          keyFeatures={arch.keyFeatures}
          className="rounded-none border-0 border-b border-zinc-200 dark:border-zinc-700"
        />
      </Link>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Model name */}
        <Link href={href} className="group block">
          <h3 className="text-base font-semibold text-zinc-900 transition-colors group-hover:text-[#DC2626] dark:text-zinc-50 dark:group-hover:text-red-400">
            {arch.name}
          </h3>
        </Link>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{arch.organization} · {arch.releaseDate}</p>

        {/* Resource pills — fixed single-row height, no-wrap so optional pills
            (config.json / Tech report) don't shift card layout */}
        <div className="mt-2 flex h-6 items-center gap-1.5 overflow-hidden">
          <Link href={href}
            className="shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
            View details
          </Link>
          {arch.configUrl && (
            <a href={arch.configUrl} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
              config.json
            </a>
          )}
          {arch.paperUrl && (
            <a href={arch.paperUrl} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
              Tech report
            </a>
          )}
        </div>

        {/* Quick specs: Scale + Context */}
        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700">
          <div className="bg-zinc-50 px-3 py-1.5 dark:bg-zinc-900">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Scale</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{paramDisplay}</p>
          </div>
          <div className="bg-zinc-50 px-3 py-1.5 dark:bg-zinc-900">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Context</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{arch.contextWindow}</p>
          </div>
        </div>

        {/* Always-visible fact sheet — fixed 3-row structure for grid alignment.
            Optional fields use "—" fallback so all cards have identical height. */}
        <div className="mt-3 divide-y divide-zinc-100 border-y border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          <SpecRow label="Decoder" value={arch.decoderType} />
          <SpecRow label="Attention" value={arch.attention} />
          <SpecRow label="Layers" value={arch.numLayers ? String(arch.numLayers) : "—"} />
        </div>

        {/* Key features pinned to bottom — fixed min-height reserves space
            even when keyFeatures is empty, so cards stay aligned. */}
        <div className="mt-auto flex min-h-[28px] flex-wrap items-end gap-1 pt-3">
          {arch.keyFeatures?.slice(0, 3).map((f) => (
            <span key={f} className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              {f}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

/* ── Compare Diff Card ───────────────────────────────────────────────── */

export function LLMCompareCard({ arch }: { arch: LLMArchCardProps }) {
  const dot = DECODER_DOT[arch.decoderType] || DECODER_DOT.Dense;
  const paramDisplay = arch.activeParameters
    ? `${arch.activeParameters} / ${arch.parameters}`
    : arch.parameters;

  return (
    <div className="flex-1 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
      <ArchitectureDiagram
        name={arch.name}
        decoderType={arch.decoderType}
        attention={arch.attention}
        parameters={arch.parameters}
        contextWindow={arch.contextWindow}
        activeParameters={arch.activeParameters}
        vocabSize={arch.vocabSize}
        hiddenSize={arch.hiddenSize}
        numLayers={arch.numLayers}
        keyFeatures={arch.keyFeatures}
        className="rounded-none border-0 border-b border-zinc-200 dark:border-zinc-700"
      />
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">{arch.decoderType}</span>
        </div>
        <h3 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">{arch.name}</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{arch.organization} · {arch.releaseDate}</p>
        <div className="mt-3 divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
          <SpecRow label="Parameters" value={paramDisplay} />
          <SpecRow label="Context Window" value={arch.contextWindow} />
          <SpecRow label="Attention" value={arch.attention} />
          {arch.activeParameters && <SpecRow label="Active Params" value={arch.activeParameters} />}
          {arch.numLayers && <SpecRow label="Layers" value={String(arch.numLayers)} />}
          {arch.hiddenSize && <SpecRow label="Hidden Size" value={arch.hiddenSize.toLocaleString()} />}
          {arch.vocabSize && <SpecRow label="Vocab Size" value={arch.vocabSize} />}
        </div>
        {arch.keyFeatures && arch.keyFeatures.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {arch.keyFeatures.map((f) => (
              <span key={f} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
