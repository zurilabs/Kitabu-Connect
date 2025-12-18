import { useState, useCallback } from "react";

export type OnboardingStep = "identity" | "school" | "location" | "personalization";

export interface OnboardingData {
  // Step 1: Identity
  fullName: string;
  email: string;

  // Step 2: School Hub
  schoolId: string;
  schoolName: string;

  // Step 3: Location
  latitude: number | null;
  longitude: number | null;

  // Step 4: Personalization
  childGrade: number | null;
}

const STEP_ORDER: OnboardingStep[] = ["identity", "school", "location", "personalization"];

export function useOnboardingStateMachine() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("identity");
  const [data, setData] = useState<OnboardingData>({
    fullName: "",
    email: "",
    schoolId: "",
    schoolName: "",
    latitude: null,
    longitude: null,
    childGrade: null,
  });

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const totalSteps = STEP_ORDER.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  const goToNextStep = useCallback(() => {
    if (!isLastStep) {
      setCurrentStep(STEP_ORDER[currentStepIndex + 1]);
    }
  }, [currentStepIndex, isLastStep]);

  const goToPreviousStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(STEP_ORDER[currentStepIndex - 1]);
    }
  }, [currentStepIndex, isFirstStep]);

  const goToStep = useCallback((step: OnboardingStep) => {
    setCurrentStep(step);
  }, []);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetData = useCallback(() => {
    setData({
      fullName: "",
      email: "",
      schoolId: "",
      schoolName: "",
      latitude: null,
      longitude: null,
      childGrade: null,
    });
    setCurrentStep("identity");
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case "identity":
        return !!data.fullName && !!data.email;
      case "school":
        return !!data.schoolId && !!data.schoolName;
      case "location":
        // Location is optional, always allow proceeding
        return true;
      case "personalization":
        return data.childGrade !== null;
      default:
        return false;
    }
  }, [currentStep, data]);

  const isDataComplete = useCallback((): boolean => {
    return (
      !!data.fullName &&
      !!data.email &&
      !!data.schoolId &&
      !!data.schoolName &&
      // Location is optional
      data.childGrade !== null
    );
  }, [data]);

  return {
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    progress,
    data,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    updateData,
    resetData,
    canProceed,
    isDataComplete,
  };
}
