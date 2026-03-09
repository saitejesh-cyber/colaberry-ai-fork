import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/router";
import TourOverlay from "./TourOverlay";
import TourTooltip from "./TourTooltip";
import { HOMEPAGE_TOUR_STEPS, TOUR_STORAGE_KEY, TOUR_VERSION } from "./tourSteps";
import type { TourContextValue } from "./types";

const noop = () => {};

export const GuidedTourContext = createContext<TourContextValue>({
  isActive: false,
  currentStepIndex: 0,
  totalSteps: 0,
  currentStep: null,
  startTour: noop,
  nextStep: noop,
  prevStep: noop,
  skipTour: noop,
});

export default function GuidedTourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef(0);
  const steps = HOMEPAGE_TOUR_STEPS;

  // Auto-start on homepage for first-time visitors
  useEffect(() => {
    if (router.pathname !== "/") return;
    try {
      const stored = localStorage.getItem(TOUR_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.version >= TOUR_VERSION) return;
      }
    } catch {
      /* ignore */
    }
    const timer = setTimeout(() => setIsActive(true), 1200);
    return () => clearTimeout(timer);
  }, [router.pathname]);

  // Track target element rect
  useEffect(() => {
    if (!isActive) {
      setTargetRect(null);
      return;
    }
    const step = steps[stepIndex];
    if (!step) return;

    const updateRect = () => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
      rafRef.current = requestAnimationFrame(updateRect);
    };

    // Scroll target into view first
    const el = document.querySelector(step.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Small delay for scroll to settle, then start tracking
    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(updateRect);
    }, 350);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, stepIndex, steps]);

  // Lock body scroll
  useEffect(() => {
    if (!isActive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isActive]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipTour();
      if (e.key === "ArrowRight") nextStep();
      if (e.key === "ArrowLeft") prevStep();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, stepIndex]);

  const markComplete = useCallback(() => {
    try {
      localStorage.setItem(
        TOUR_STORAGE_KEY,
        JSON.stringify({ version: TOUR_VERSION, completedAt: new Date().toISOString() }),
      );
    } catch {
      /* ignore */
    }
  }, []);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setTargetRect(null);
      setStepIndex((i) => i + 1);
    } else {
      // Completing tour
      setIsActive(false);
      markComplete();
    }
  }, [stepIndex, steps.length, markComplete]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      setTargetRect(null);
      setStepIndex((i) => i - 1);
    }
  }, [stepIndex]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    markComplete();
  }, [markComplete]);

  const ctx: TourContextValue = {
    isActive,
    currentStepIndex: stepIndex,
    totalSteps: steps.length,
    currentStep: steps[stepIndex] ?? null,
    startTour,
    nextStep,
    prevStep,
    skipTour,
  };

  return (
    <GuidedTourContext.Provider value={ctx}>
      {children}
      {isActive && (
        <>
          <TourOverlay targetRect={targetRect} onClickBackdrop={skipTour} />
          {steps[stepIndex] && (
            <TourTooltip
              step={steps[stepIndex]}
              stepIndex={stepIndex}
              totalSteps={steps.length}
              targetRect={targetRect}
              onNext={nextStep}
              onPrev={prevStep}
              onSkip={skipTour}
            />
          )}
        </>
      )}
    </GuidedTourContext.Provider>
  );
}
