export type TourStepPlacement = "top" | "bottom" | "left" | "right" | "auto";

export type TourStep = {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  placement: TourStepPlacement;
};

export type TourContextValue = {
  isActive: boolean;
  currentStepIndex: number;
  totalSteps: number;
  currentStep: TourStep | null;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
};
