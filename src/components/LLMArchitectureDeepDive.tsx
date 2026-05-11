import Image from "next/image";
import type {
  DeepDiveBlock,
  DeepDiveCalloutBlock,
  DeepDiveCodeBlock,
  DeepDiveHeadingBlock,
  DeepDiveImageBlock,
  DeepDiveListBlock,
  DeepDiveParagraphBlock,
  DeepDiveReferencesBlock,
  DeepDiveTableBlock,
} from "../lib/cms";

/**
 * Renderer for the LLM Architecture `deepDive` Strapi Dynamic Zone.
 *
 * Each block variant maps to semantic HTML inside a `.prose` container.
 * The parent page (`[slug].tsx`) is responsible for wrapping this in
 * `<div className="prose prose-zinc dark:prose-invert max-w-none">` so
 * Tailwind Typography styles headings, paragraphs, lists, and tables
 * automatically.
 *
 * Design intent (Sprint v4): rich, Raschka-style technical depth without
 * adding any new dependencies. Every block is static semantic HTML —
 * no runtime JS, no syntax highlighter, no markdown parser. Content
 * editors compose the zone in Strapi admin using the 8 reusable
 * components under `deep.*`.
 */

type Props = {
  blocks: DeepDiveBlock[] | null | undefined;
  className?: string;
};

export default function LLMArchitectureDeepDive({ blocks, className }: Props) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div
      className={
        `prose prose-zinc dark:prose-invert max-w-none ` +
        `prose-headings:scroll-mt-24 prose-a:text-[#DC2626] hover:prose-a:underline ` +
        `prose-code:font-mono prose-code:text-[0.9em] ` +
        (className ?? "")
      }
    >
      {blocks.map((block, index) => {
        switch (block.__component) {
          case "deep.heading":
            return <HeadingBlock key={block.id ?? index} block={block} />;
          case "deep.paragraph":
            return <ParagraphBlock key={block.id ?? index} block={block} />;
          case "deep.callout":
            return <CalloutBlock key={block.id ?? index} block={block} />;
          case "deep.code-block":
            return <CodeBlockBlock key={block.id ?? index} block={block} />;
          case "deep.table":
            return <TableBlock key={block.id ?? index} block={block} />;
          case "deep.list":
            return <ListBlock key={block.id ?? index} block={block} />;
          case "deep.image":
            return <ImageBlock key={block.id ?? index} block={block} />;
          case "deep.references":
            return <ReferencesBlock key={block.id ?? index} block={block} />;
          default:
            // Unknown component — fail quietly in production but log in dev
            if (process.env.NODE_ENV !== "production") {
              // eslint-disable-next-line no-console
              console.warn("[LLMArchitectureDeepDive] unknown block", block);
            }
            return null;
        }
      })}
    </div>
  );
}

/* ── Block renderers ─────────────────────────────────────────────── */

function HeadingBlock({ block }: { block: DeepDiveHeadingBlock }) {
  const anchor = block.anchor || slugify(block.text);
  const content = block.text;

  switch (block.level) {
    case "h2":
      return <h2 id={anchor}>{content}</h2>;
    case "h3":
      return <h3 id={anchor}>{content}</h3>;
    case "h4":
      return <h4 id={anchor}>{content}</h4>;
    default:
      return <h2 id={anchor}>{content}</h2>;
  }
}

function ParagraphBlock({ block }: { block: DeepDiveParagraphBlock }) {
  // Strapi richtext field returns markdown-flavored text. For v4 we
  // render the minimal subset inline — bold (**), italic (*), code (`).
  // Anything fancier (links, nested lists) should live in dedicated
  // block types (list, references, callout).
  return <p dangerouslySetInnerHTML={{ __html: inlineMarkdownToHtml(block.body) }} />;
}

function CalloutBlock({ block }: { block: DeepDiveCalloutBlock }) {
  const variantStyles: Record<DeepDiveCalloutBlock["variant"], string> = {
    note: "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900",
    insight: "border-zinc-400 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900",
    warning: "border-red-400 bg-red-50 dark:border-red-700 dark:bg-zinc-900",
    quote: "border-zinc-500 bg-zinc-50 italic dark:border-zinc-500 dark:bg-zinc-900",
  };
  const labelMap: Record<DeepDiveCalloutBlock["variant"], string> = {
    note: "Note",
    insight: "Insight",
    warning: "Warning",
    quote: "Quote",
  };
  return (
    <blockquote
      className={`not-prose my-6 rounded-xl border-l-4 p-5 ${variantStyles[block.variant]}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {labelMap[block.variant]}
      </div>
      {block.title && (
        <div className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {block.title}
        </div>
      )}
      <p
        className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
        dangerouslySetInnerHTML={{ __html: inlineMarkdownToHtml(block.body) }}
      />
    </blockquote>
  );
}

function CodeBlockBlock({ block }: { block: DeepDiveCodeBlock }) {
  return (
    <figure className="not-prose my-6">
      <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
        <code className={block.language ? `language-${block.language}` : undefined}>
          {block.code}
        </code>
      </pre>
      {block.caption && (
        <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

function TableBlock({ block }: { block: DeepDiveTableBlock }) {
  return (
    <figure className="not-prose my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {block.headers.map((h, i) => (
              <th
                key={i}
                className="border-b-2 border-zinc-300 px-3 py-2 text-left font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-zinc-200 dark:border-zinc-800">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 text-zinc-700 dark:text-zinc-300"
                  dangerouslySetInnerHTML={{ __html: inlineMarkdownToHtml(cell) }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {block.caption && (
        <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

function ListBlock({ block }: { block: DeepDiveListBlock }) {
  const items = block.items.map((item, i) => (
    <li key={i} dangerouslySetInnerHTML={{ __html: inlineMarkdownToHtml(item) }} />
  ));
  return block.style === "number" ? <ol>{items}</ol> : <ul>{items}</ul>;
}

function ImageBlock({ block }: { block: DeepDiveImageBlock }) {
  const url = block.media?.url;
  if (!url) return null;
  return (
    <figure className="not-prose my-8">
      <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <Image
          src={url}
          alt={block.alt}
          width={1600}
          height={900}
          className="h-auto w-full"
          unoptimized
        />
      </div>
      {block.caption && (
        <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

function ReferencesBlock({ block }: { block: DeepDiveReferencesBlock }) {
  return (
    <section className="mt-10">
      <h3>{block.heading || "References"}</h3>
      <ul>
        {block.items.map((ref, i) => (
          <li key={i}>
            <a href={ref.url} target="_blank" rel="noopener noreferrer">
              {ref.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

/**
 * Minimal inline-markdown converter for paragraph/list/callout/table
 * cell text. Intentionally narrow: bold, italic, inline code, and
 * autolinked URLs. Block-level structures (headings, lists, tables,
 * images) belong in their own block types, not inline text.
 *
 * Escapes HTML special chars first so editor content is safe under
 * `dangerouslySetInnerHTML`.
 */
function inlineMarkdownToHtml(src: string): string {
  if (!src) return "";
  const escaped = src
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
