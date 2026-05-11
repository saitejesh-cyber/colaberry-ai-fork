/**
 * Minimal Mustache-style template engine — scoped to the needs of the
 * Colaberry AI distribution module. Zero dependencies.
 *
 * Supported tokens:
 *   {{title}}               → interpolate a DistributableEntry field
 *   {{summary}}             → interpolate summary
 *   {{url}}                 → interpolate canonical URL
 *   {{#tags}}…{{/tags}}     → iterate tags; inside, `{{.}}` = current tag
 *   {{#isNew}}…{{/isNew}}   → conditional — render when boolean is true
 *   {{^isNew}}…{{/isNew}}   → inverted conditional — render when false
 *   {{#hasTags}}…{{/hasTags}} → convenience — true when tags.length > 0
 *
 * Unknown tokens render as empty string — never `undefined` leaks.
 * When `escapeHtml` is true, {{title}} / {{summary}} / iterated {{.}} are
 * HTML-escaped. The platform-canonical URL is NEVER escaped (it stays a
 * link). Sections ({{#…}}, {{^…}}, {{/…}}) do not require escaping since
 * they control flow, not content.
 *
 * Intentional non-features (for v5):
 *   - Nested sections (e.g. {{#tags}}{{#hasTags}}…)
 *   - Partials / includes
 *   - Lambda functions
 * If a template needs these, author it in JS or push to v6.
 */

import type { DistributableEntry } from "./types";

export interface RenderOptions {
  escapeHtml?: boolean;
  /** Max characters in the rendered output. When set, we truncate with
   * the platform's ellipsis convention (…). Used by the X client which
   * enforces a 280-char hard limit via this option. Default: no limit. */
  maxLength?: number;
}

/** Public entry point. Never throws — returns `""` on malformed input. */
export function renderTemplate(
  template: string,
  entry: DistributableEntry,
  options: RenderOptions = {}
): string {
  if (typeof template !== "string" || !template) return "";
  const escape = options.escapeHtml === true;
  let out: string;
  try {
    out = render(template, entry, escape);
  } catch (err) {
    console.warn(
      `[distribution.template] render failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return "";
  }
  if (options.maxLength && out.length > options.maxLength) {
    const cutoff = Math.max(0, options.maxLength - 1);
    out = `${out.slice(0, cutoff).trimEnd()}…`;
  }
  return out;
}

function render(
  template: string,
  entry: DistributableEntry,
  escape: boolean
): string {
  // We parse in a single pass: find every {{…}} marker, split into
  // chunks, and handle section vs interpolation inline. Sections are
  // recursively rendered on a slice.
  let i = 0;
  const n = template.length;
  let out = "";

  while (i < n) {
    const open = template.indexOf("{{", i);
    if (open === -1) {
      out += template.slice(i);
      break;
    }
    out += template.slice(i, open);

    const close = template.indexOf("}}", open + 2);
    if (close === -1) {
      // Unclosed tag — render the raw text rather than crashing.
      out += template.slice(open);
      break;
    }
    const tag = template.slice(open + 2, close).trim();
    i = close + 2;

    if (!tag) continue;

    const marker = tag[0];

    if (marker === "#" || marker === "^") {
      const sectionKey = tag.slice(1).trim();
      const endTag = `{{/${sectionKey}}}`;
      const endIdx = findSectionEnd(template, i, sectionKey);
      if (endIdx === -1) {
        // Unbalanced — skip this section entirely.
        console.warn(
          `[distribution.template] unclosed section: ${sectionKey}`
        );
        continue;
      }
      const innerStart = i;
      const innerEnd = endIdx;
      i = innerEnd + endTag.length;

      const inner = template.slice(innerStart, innerEnd);
      const inverted = marker === "^";
      out += renderSection(inner, sectionKey, entry, inverted, escape);
      continue;
    }

    if (marker === "/") {
      // A stray closing tag — ignore (parent already consumed its body).
      continue;
    }

    // Plain interpolation.
    out += renderVariable(tag, entry, escape);
  }

  return out;
}

/** Find the index of `{{/key}}` that matches the most-recent `{{#key}}` or
 * `{{^key}}` at or after `from`. Respects nesting for the same key. */
function findSectionEnd(
  template: string,
  from: number,
  key: string
): number {
  const openA = `{{#${key}}}`;
  const openB = `{{^${key}}}`;
  const close = `{{/${key}}}`;
  let depth = 1;
  let cursor = from;
  while (cursor < template.length) {
    const nextClose = template.indexOf(close, cursor);
    if (nextClose === -1) return -1;
    const nextOpenA = template.indexOf(openA, cursor);
    const nextOpenB = template.indexOf(openB, cursor);
    const nextOpen =
      nextOpenA === -1
        ? nextOpenB
        : nextOpenB === -1
          ? nextOpenA
          : Math.min(nextOpenA, nextOpenB);
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + Math.max(openA.length, openB.length);
      continue;
    }
    depth -= 1;
    if (depth === 0) return nextClose;
    cursor = nextClose + close.length;
  }
  return -1;
}

function renderSection(
  inner: string,
  key: string,
  entry: DistributableEntry,
  inverted: boolean,
  escape: boolean
): string {
  if (key === "tags") {
    if (inverted) {
      return entry.tags.length === 0 ? render(inner, entry, escape) : "";
    }
    return entry.tags
      .map((tag) => renderSectionItem(inner, entry, escape, tag))
      .join("");
  }

  const truthy = isTruthyKey(key, entry);
  if (inverted) {
    return truthy ? "" : render(inner, entry, escape);
  }
  return truthy ? render(inner, entry, escape) : "";
}

/** Render a section body with `{{.}}` substituted for the current item. */
function renderSectionItem(
  inner: string,
  entry: DistributableEntry,
  escape: boolean,
  currentItem: string
): string {
  // Substitute `{{.}}` and `{{ . }}` with the current item first, then
  // fall through to normal render for any other tokens inside.
  const withDot = inner.replace(/\{\{\s*\.\s*\}\}/g, () =>
    escape ? escapeHtml(currentItem) : currentItem
  );
  return render(withDot, entry, escape);
}

function renderVariable(
  key: string,
  entry: DistributableEntry,
  escape: boolean
): string {
  switch (key) {
    case "title":
      return escape ? escapeHtml(entry.title) : entry.title;
    case "summary":
      return escape ? escapeHtml(entry.summary) : entry.summary;
    case "url":
      return entry.url;
    case "kind":
      return entry.kind;
    case "updatedAt":
      return entry.updatedAt;
    case "tags":
      // Bare {{tags}} without a section = comma-joined list. Useful shorthand.
      return escape ? escapeHtml(entry.tags.join(", ")) : entry.tags.join(", ");
    default:
      return "";
  }
}

function isTruthyKey(key: string, entry: DistributableEntry): boolean {
  switch (key) {
    case "isNew":
      return entry.isNew === true;
    case "hasTags":
      return entry.tags.length > 0;
    case "hasSummary":
      return entry.summary.trim().length > 0;
    default:
      return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
