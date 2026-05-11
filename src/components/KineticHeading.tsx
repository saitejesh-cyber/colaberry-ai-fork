"use client";

import { ReactNode, useId, useMemo } from "react";
import { m, useReducedMotion } from "framer-motion";

/**
 * KineticHeading
 * --------------
 * Sprint v5 kinetic-pacing. Editorial line-mask reveal for flagship headings.
 *
 * Mechanics:
 *   - Server renders the heading as plain crawlable HTML containing the full
 *     `text` prop verbatim (wrapped in a visually-hidden span with the exact
 *     string). On hydration the visible layer animates in word-by-word with a
 *     translateY line-mask pattern.
 *   - Accessibility: the full string is exposed to assistive tech via
 *     `aria-label`; the animated word spans are marked `aria-hidden="true"`
 *     so screen readers don't read the same content twice.
 *   - AEO: because the hidden span contains the full copy in pre-hydration
 *     HTML, `curl https://... | grep <heading>` returns the complete string.
 *   - Motion: each word rises from 110% y-offset (cut off by parent overflow)
 *     to 0 with 0.08s stagger, 0.9s duration, ease-entry curve.
 *   - Reduced-motion collapses to an instant state — no translate, no stagger.
 *
 * Usage:
 *   <KineticHeading
 *     as="h1"
 *     text="Discover, govern, and scale"
 *     highlight="and scale"
 *     className="text-display-xl text-white"
 *   />
 *
 *   Children slot can be used to append extra content (e.g. the word rotator)
 *   — that content is NOT split, it renders as-is after the animated words.
 */

type KineticHeadingProps = {
  /** The text to split and reveal word-by-word. Required. */
  text: string;
  /** HTML tag. Default "h2". */
  as?: "h1" | "h2" | "h3" | "h4";
  /** Classes applied to the outer heading element. */
  className?: string;
  /** Extra content appended after the animated words (e.g. a rotator span). */
  children?: ReactNode;
  /**
   * Word-stagger interval in seconds. Default 0.08 (80ms) — the editorial
   * sweet spot for pace.
   */
  stagger?: number;
  /**
   * Duration of each word's reveal in seconds. Default 0.9.
   */
  duration?: number;
  /**
   * Delay before the first word starts animating. Default 0.
   */
  delay?: number;
};

export default function KineticHeading({
  text,
  as = "h2",
  className = "",
  children,
  stagger = 0.08,
  duration = 0.9,
  delay = 0,
}: KineticHeadingProps) {
  const reduceMotion = useReducedMotion();
  const labelId = useId();

  // Split on whitespace while preserving exact whitespace groupings so the
  // rendered words read the same as the original (e.g. after em-dashes).
  const words = useMemo(() => text.split(/(\s+)/), [text]);

  const Tag = as;

  // Under reduced motion, emit plain DOM with no motion layer.
  if (reduceMotion) {
    return (
      <Tag className={className}>
        {text}
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      className={className}
      aria-labelledby={labelId}
    >
      {/* Crawlable, screen-reader-exposed copy. Visually hidden but present in
       * the DOM pre-hydration — AEO safe. */}
      <span id={labelId} className="sr-only">
        {text}
      </span>

      {/* Animated words, aria-hidden. Each sits inside an overflow-hidden
       * inline-block mask so the 110% y-offset is clipped. */}
      <span aria-hidden="true">
        {words.map((token, idx) => {
          // Whitespace tokens pass through unchanged so line-wrapping works
          // naturally — they just live between the animated word spans.
          if (/^\s+$/.test(token)) {
            return <span key={`ws-${idx}`}>{token}</span>;
          }
          return (
            <span
              key={`w-${idx}-${token}`}
              style={{
                display: "inline-block",
                overflow: "hidden",
                verticalAlign: "top",
              }}
            >
              <m.span
                style={{ display: "inline-block" }}
                initial={{ y: "110%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                transition={{
                  duration,
                  delay: delay + idx * stagger * 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {token}
              </m.span>
            </span>
          );
        })}
      </span>

      {children}
    </Tag>
  );
}
