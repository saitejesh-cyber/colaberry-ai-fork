import { useEffect, useRef } from "react";

type PodcastPlayerProps = {
  embedCode?: string | null;
  audioUrl?: string | null;
};

export default function PodcastPlayer({ embedCode, audioUrl }: PodcastPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!embedCode || !containerRef.current) return;

    containerRef.current.innerHTML = embedCode;

    const scripts = Array.from(containerRef.current.querySelectorAll("script"));
    scripts.forEach((oldScript) => {
      const script = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => {
        script.setAttribute(attr.name, attr.value);
      });
      if (oldScript.textContent) {
        script.text = oldScript.textContent;
      }
      oldScript.parentNode?.replaceChild(script, oldScript);
    });
  }, [embedCode]);

  if (embedCode) {
    return <div ref={containerRef} className="podcast-embed" />;
  }

  if (audioUrl) {
    return (
      <audio
        controls
        className="w-full rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm"
      >
        <source src={audioUrl} />
        Your browser does not support the audio element.
      </audio>
    );
  }

  return null;
}
