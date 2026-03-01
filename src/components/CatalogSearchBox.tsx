import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";

type CatalogSearchBoxProps = {
  placeholder?: string;
};

export default function CatalogSearchBox({ placeholder = "Ask about agents, MCPs, or skills..." }: CatalogSearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="sticky bottom-0 z-20 mt-8 border-t border-zinc-200/80 bg-white/95 py-3 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-[#0B1020]/95">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl gap-2 px-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#4F2AA3] focus:outline-none focus:ring-2 focus:ring-[#4F2AA3]/20 dark:border-zinc-600 dark:bg-[#11182A] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#7B5CE0] dark:focus:ring-[#7B5CE0]/20"
        />
        <button type="submit" className="btn btn-primary whitespace-nowrap px-5 py-2.5 text-sm">
          Search
        </button>
      </form>
    </div>
  );
}
