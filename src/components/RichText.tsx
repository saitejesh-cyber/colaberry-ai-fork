import { type ReactNode } from "react";

type TextChild = {
  type?: string;
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  url?: string;
  children?: TextChild[];
};

type Block = {
  type: string;
  children?: TextChild[];
  text?: string;
  level?: number;
  format?: "ordered" | "unordered";
  language?: string;
  image?: { url?: string; alternativeText?: string };
};

function renderInlineChild(child: TextChild, i: number): ReactNode {
  // Link
  if (child.type === "link" && child.url) {
    return (
      <a
        key={i}
        href={child.url}
        className="link-underline text-[var(--pivot-fill)] hover:text-[var(--pivot-fill)]"
        target={child.url.startsWith("http") ? "_blank" : undefined}
        rel={child.url.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {child.children?.map((c, j) => renderInlineChild(c, j)) ?? child.text}
      </a>
    );
  }

  let node: ReactNode = child.text ?? "";

  if (child.bold) node = <strong key={`b-${i}`}>{node}</strong>;
  if (child.italic) node = <em key={`i-${i}`}>{node}</em>;
  if (child.underline) node = <u key={`u-${i}`}>{node}</u>;
  if (child.strikethrough) node = <s key={`s-${i}`}>{node}</s>;
  if (child.code)
    node = (
      <code key={`c-${i}`} className="rounded bg-[var(--neutral-fill)] px-1.5 py-0.5 text-sm font-mono">
        {node}
      </code>
    );

  return <span key={i}>{node}</span>;
}

function renderChildren(children?: TextChild[]): ReactNode {
  if (!children) return null;
  return children.map((child, i) => renderInlineChild(child, i));
}

export default function RichText({ blocks, className }: { blocks: Block[]; className?: string }) {
  if (!blocks) return null;

  return (
    <div className={className || "prose"}>
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return (
            <p key={i} className="mb-4 leading-relaxed">
              {renderChildren(block.children)}
            </p>
          );
        }

        if (block.type === "heading") {
          const level = block.level ?? 2;
          const sizes: Record<number, string> = {
            1: "text-display-sm font-bold",
            2: "text-display-xs font-bold",
            3: "text-lg font-semibold",
            4: "text-base font-semibold",
            5: "text-sm font-semibold",
            6: "text-sm font-semibold",
          };
          const cls = `mb-3 mt-6 text-[var(--text-heading)] ${sizes[level] || sizes[3]}`;
          const content = renderChildren(block.children);
          if (level === 1) return <h1 key={i} className={cls}>{content}</h1>;
          if (level === 3) return <h3 key={i} className={cls}>{content}</h3>;
          if (level === 4) return <h4 key={i} className={cls}>{content}</h4>;
          if (level === 5) return <h5 key={i} className={cls}>{content}</h5>;
          if (level === 6) return <h6 key={i} className={cls}>{content}</h6>;
          return <h2 key={i} className={cls}>{content}</h2>;
        }

        if (block.type === "list") {
          const ListTag = block.format === "ordered" ? "ol" : "ul";
          const listClass = block.format === "ordered" ? "list-decimal" : "list-disc";
          return (
            <ListTag key={i} className={`mb-4 ml-5 ${listClass} text-[var(--text-body-light)]`}>
              {block.children?.map((item, j) => (
                <li key={j} className="mb-1">
                  {renderChildren(item.children)}
                </li>
              ))}
            </ListTag>
          );
        }

        if (block.type === "code") {
          return (
            <pre key={i} className="mb-4 overflow-x-auto rounded-lg bg-[var(--neutral-fill)] p-4 text-sm font-mono text-[var(--text-heading)]">
              <code>{block.children?.map((c) => c.text).join("") ?? ""}</code>
            </pre>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote key={i} className="mb-4 border-l-4 border-[var(--pivot-fill)] pl-4 italic text-[var(--text-body-light)]">
              {renderChildren(block.children)}
            </blockquote>
          );
        }

        if (block.type === "image" && block.image?.url) {
          return (
            <figure key={i} className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.image.url}
                alt={block.image.alternativeText || ""}
                className="w-full rounded-lg"
                loading="lazy"
              />
              {block.image.alternativeText && (
                <figcaption className="mt-2 text-center text-sm text-[var(--text-muted)]">
                  {block.image.alternativeText}
                </figcaption>
              )}
            </figure>
          );
        }

        return null;
      })}
    </div>
  );
}
