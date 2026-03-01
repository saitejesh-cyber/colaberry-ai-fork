import { useEffect, useState } from "react";

/**
 * Returns a 0–1 value representing how far the user has scrolled down the page.
 * Uses requestAnimationFrame for smooth updates.
 *
 * Usage:
 *   const progress = useScrollProgress();
 *   <div className="scroll-progress" style={{ transform: `scaleX(${progress})` }} />
 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;

    function update() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
    }

    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    update(); // initial value

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return progress;
}
