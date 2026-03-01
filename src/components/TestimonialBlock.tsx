import Image from "next/image";

type TestimonialBlockProps = {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar?: string;
};

export default function TestimonialBlock({
  quote,
  author,
  role,
  company,
  avatar,
}: TestimonialBlockProps) {
  return (
    <blockquote className="card-elevated relative overflow-hidden p-6 sm:p-8">
      {/* Decorative quote mark */}
      <span
        aria-hidden="true"
        className="absolute -top-2 left-4 font-sans text-[5rem] leading-none text-[var(--brand-purple)]/10"
      >
        &ldquo;
      </span>

      <div className="relative">
        <p className="text-body-lg leading-relaxed text-[var(--text-primary)] italic">
          &ldquo;{quote}&rdquo;
        </p>

        <footer className="mt-5 flex items-center gap-3">
          {avatar ? (
            <Image
              src={avatar}
              alt={author}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-purple)]/10 text-sm font-bold text-[var(--brand-purple)]">
              {author.charAt(0)}
            </div>
          )}
          <div>
            <cite className="block text-sm font-semibold not-italic text-[var(--text-primary)]">
              {author}
            </cite>
            <span className="text-xs text-[var(--text-muted)]">
              {role}, {company}
            </span>
          </div>
        </footer>
      </div>
    </blockquote>
  );
}
