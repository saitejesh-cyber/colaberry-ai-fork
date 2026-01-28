type Block = {
  type: string;
  children?: Block[];
  text?: string;
};

export default function RichText({ blocks }: { blocks: Block[] }) {
  if (!blocks) return null;

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return (
            <p key={i} className="mb-4">
              {block.children?.map((child, j) => child.text).join("")}
            </p>
          );
        }

        return null;
      })}
    </>
  );
}
