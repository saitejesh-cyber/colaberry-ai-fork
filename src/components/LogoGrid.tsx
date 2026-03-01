import Image from "next/image";

type Logo = {
  name: string;
  src: string;
  href?: string;
};

type LogoGridProps = {
  logos: Logo[];
  columns?: 4 | 6 | 8;
  title?: string;
};

const colClasses: Record<number, string> = {
  4: "grid-cols-2 sm:grid-cols-4",
  6: "grid-cols-3 sm:grid-cols-6",
  8: "grid-cols-4 sm:grid-cols-8",
};

export default function LogoGrid({
  logos,
  columns = 6,
  title,
}: LogoGridProps) {
  if (logos.length === 0) return null;

  return (
    <div>
      {title ? (
        <div className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {title}
        </div>
      ) : null}
      <div
        className={`grid items-center justify-items-center gap-6 ${colClasses[columns] ?? colClasses[6]}`}
      >
        {logos.map((logo) => {
          const img = (
            <Image
              src={logo.src}
              alt={logo.name}
              width={120}
              height={40}
              className="h-8 w-auto max-w-[120px] object-contain opacity-50 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            />
          );

          if (logo.href) {
            return (
              <a
                key={logo.name}
                href={logo.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={logo.name}
              >
                {img}
              </a>
            );
          }

          return (
            <div key={logo.name} aria-label={logo.name}>
              {img}
            </div>
          );
        })}
      </div>
    </div>
  );
}
