import sanitizeHtml from "sanitize-html";
import type { ReactNode } from "react";
import { createElement } from "react";
import type { MCPToolSchema, MCPToolParameter } from "./cms";

export type ParsedTool = { name: string; description: string | null };

export function parseList(value?: string | null): string[] {
  if (!value) return [];
  const parts = value
    .split(/\r?\n|•|\u2022/)
    .map((item) => item.replace(/^[-•\u2022]\s*/, "").trim())
    .filter(Boolean);
  if (parts.length > 1) return parts;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseToolsStructured(value?: string | null): ParsedTool[] {
  if (!value) return [];
  const lines = value
    .split(/\r?\n|•|\u2022/)
    .map((l) => l.replace(/^[-•\u2022\d.)\]]+\s*/, "").trim())
    .filter(Boolean);
  return lines.map((line) => {
    const match = line.match(/^([a-zA-Z0-9_.-]+(?:\s*[a-zA-Z0-9_.-]+){0,3})\s*[:\u2013\u2014]+\s*(.+)$/);
    if (match) return { name: match[1].trim(), description: match[2].trim() };
    const dashMatch = line.match(/^([a-zA-Z0-9_.-]+)\s+-\s+(.+)$/);
    if (dashMatch) return { name: dashMatch[1].trim(), description: dashMatch[2].trim() };
    return { name: line, description: null };
  });
}

export function parseToolsJson(value?: string | null): MCPToolSchema[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t: any) => t && typeof t.name === "string")
      .map((t: any) => ({
        name: t.name,
        description: t.description ?? null,
        parameters: Array.isArray(t.parameters)
          ? t.parameters.map((p: any) => ({
              name: String(p.name ?? ""),
              type: String(p.type ?? "string"),
              required: Boolean(p.required),
              description: p.description ?? null,
            }))
          : [],
      }));
  } catch {
    return [];
  }
}

export function renderRichText(value?: string | null): ReactNode {
  if (!value) return null;
  const clean = sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
  });
  if (!clean.trim()) return null;
  return createElement("div", {
    className: "text-[0.9375rem] leading-relaxed text-zinc-700 dark:text-zinc-300 [&_p]:mt-4 first:[&_p]:mt-0 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#DC2626] [&_a]:underline dark:[&_a]:text-red-400",
    dangerouslySetInnerHTML: { __html: clean },
  });
}

export function renderParagraphs(value: string): ReactNode[] {
  return value
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => createElement("p", { key: index }, line));
}
