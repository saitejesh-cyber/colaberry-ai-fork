import { useContext } from "react";
import { GuidedTourContext } from "../components/GuidedTour/GuidedTourProvider";

export function useGuidedTour() {
  return useContext(GuidedTourContext);
}
