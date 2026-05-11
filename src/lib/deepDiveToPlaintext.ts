/**
 * Helpers for converting a `deepDive` Dynamic Zone into the plaintext +
 * structured fields that schema.org `TechArticle` JSON-LD needs.
 *
 * - `deepDiveToPlaintext()` returns a whitespace-normalized plaintext
 *   serialization suitable for `articleBody` — headings, paragraphs,
 *   callouts, code blocks, tables, lists, and references are all flattened
 *   into readable text. Markdown inline markers (**bold**, *italic*,
 *   `code`) are stripped so AI answer engines see clean prose.
 * - `deepDiveToCitations()` returns the references block mapped to
 *   schema.org `citation` objects (`{@type: 'CreativeWork', name, url}`),
 *   which is the native way to expose the deep-dive's sources to LLM
 *   crawlers.
 * - `deepDiveWordCount()` returns the approximate word count — used by
 *   the `wordCount` JSON-LD property and by the sprint verification
 *   step that each flagship deep dive is ≥ 1,500 words.
 *
 * Sprint: v4 — LLM Architecture Deep Dives (CMS Dynamic Zone)
 */

import type { DeepDiveBlock } from "./cms";

/**
 * Strip the narrow inline-markdown subset that `LLMArchitectureDeepDive`
 * renders: bold (`**x**`), italic (`*x*`), inline code (`` `x` ``), and
 * link text (`[label](url)` → `label`). Returns plain text suitable for
 * JSON-LD `articleBody`.
 */
function stripInlineMarkdown(src: string): string {
  if (!src) return "";
  return src
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Flatten a single block to plaintext. Block-level structures (tables,
 * lists, code blocks, references) are serialized in a schema-friendly way
 * that preserves their semantic grouping without pulling in markup.
 */
function blockToPlaintext(block: DeepDiveBlock): string {
  switch (block.__component) {
    case "deep.heading":
      return stripInlineMarkdown(block.text);

    case "deep.paragraph":
      return stripInlineMarkdown(block.body);

    case "deep.callout": {
      const parts: string[] = [];
      if (block.title) parts.push(stripInlineMarkdown(block.title));
      parts.push(stripInlineMarkdown(block.body));
      return parts.join(". ");
    }

    case "deep.code-block": {
      // Code is kept verbatim but joined onto one line so it contributes
      // to articleBody without breaking the paragraph flow.
      const parts: string[] = [];
      if (block.caption) parts.push(stripInlineMarkdown(block.caption));
      parts.push(block.code.replace(/\s+/g, " ").trim());
      return parts.join(" ");
    }

    case "deep.table": {
      const parts: string[] = [];
      if (block.caption) parts.push(stripInlineMarkdown(block.caption));
      parts.push(block.headers.map((h) => stripInlineMarkdown(h)).join(" | "));
      for (const row of block.rows) {
        parts.push(row.map((c) => stripInlineMarkdown(c)).join(" | "));
      }
      return parts.join(" ");
    }

    case "deep.list":
      return block.items.map((i) => stripInlineMarkdown(i)).join(" ");

    case "deep.image":
      return block.caption ? stripInlineMarkdown(block.caption) : (block.alt ?? "");

    case "deep.references": {
      const parts: string[] = [];
      if (block.heading) parts.push(stripInlineMarkdown(block.heading));
      for (const ref of block.items) {
        parts.push(`${stripInlineMarkdown(ref.label)} (${ref.url})`);
      }
      return parts.join(" ");
    }

    default:
      return "";
  }
}

/**
 * Walk a `DeepDiveBlock[]` and return a single whitespace-normalized
 * plaintext string — suitable for schema.org `articleBody`.
 */
export function deepDiveToPlaintext(
  blocks: DeepDiveBlock[] | null | undefined,
): string {
  if (!blocks || blocks.length === 0) return "";
  return blocks
    .map(blockToPlaintext)
    .filter((s) => s.length > 0)
    .join("\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Extract all `deep.references` blocks and return them as schema.org
 * `CreativeWork` citation objects. Returns an empty array if no
 * references blocks exist.
 */
export function deepDiveToCitations(
  blocks: DeepDiveBlock[] | null | undefined,
): Array<{ "@type": "CreativeWork"; name: string; url: string }> {
  if (!blocks || blocks.length === 0) return [];
  const refs: Array<{ "@type": "CreativeWork"; name: string; url: string }> = [];
  for (const block of blocks) {
    if (block.__component !== "deep.references") continue;
    for (const item of block.items) {
      if (!item?.url || !item?.label) continue;
      refs.push({
        "@type": "CreativeWork",
        name: stripInlineMarkdown(item.label),
        url: item.url,
      });
    }
  }
  return refs;
}

/**
 * Approximate word count of the flattened plaintext. Used both by JSON-LD
 * `wordCount` and by the sprint v4 verification step that each flagship
 * deep dive is ≥ 1,500 words.
 */
export function deepDiveWordCount(
  blocks: DeepDiveBlock[] | null | undefined,
): number {
  const text = deepDiveToPlaintext(blocks);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}
