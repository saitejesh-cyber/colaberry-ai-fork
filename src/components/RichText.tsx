type Block = {
  type: string;
  children?: Block[];
  text?: string;
  level?: number;
  format?: "ordered" | "unordered";
};

const renderText = (block: Block) => block.children?.map((child) => child.text).join("") ?? "";

export default function RichText({ blocks }: { blocks: Block[] }) {
  if (!blocks) return null;

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return (
            <p key={i} className="mb-4">
              {renderText(block)}
            </p>
          );
        }

        if (block.type === "heading") {
          const level = block.level ?? 2;
          const Heading = level === 3 ? "h3" : level === 4 ? "h4" : "h2";
          return (
            <Heading key={i} className="mb-3 mt-6 text-lg font-semibold text-slate-900">
              {renderText(block)}
            </Heading>
          );
        }

        if (block.type === "list") {
          const ListTag = block.format === "ordered" ? "ol" : "ul";
          return (
            <ListTag key={i} className="mb-4 ml-5 list-disc text-slate-700">
              {block.children?.map((item, j) => (
                <li key={j} className="mb-1">
                  {item.children?.map((child) => child.text).join("")}
                </li>
              ))}
            </ListTag>
          );
        }

        return null;
      })}
    </>
  );
}
