export default function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-[0.9375rem] leading-relaxed text-zinc-700 dark:text-zinc-300">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#DC2626] dark:bg-red-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
