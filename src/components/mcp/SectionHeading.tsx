export default function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="border-l-4 border-[#DC2626] pl-4 text-xl font-bold text-zinc-900 dark:border-red-400 dark:text-zinc-100">
      {title}
    </h2>
  );
}
