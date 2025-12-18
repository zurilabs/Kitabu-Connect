import { useEffect } from "react";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { useOnboardingStateMachine } from "@/lib/onboarding-state-machine";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { IdentityStep } from "@/components/onboarding/IdentityStep";
import { SchoolStep } from "@/components/onboarding/SchoolStep";
import { LocationStep } from "@/components/onboarding/LocationStep";
import { PersonalizationStep } from "@/components/onboarding/PersonalizationStep";
import { School, ShieldCheck, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import onboardingHero from "@assets/generated_images/friendly_parents_talking_at_school_gate.png";

export default function OnboardingNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { completeOnboarding, isCompletingOnboarding } = useOnboarding();

  const {
    currentStep,
    progress,
    data,
    goToNextStep,
    goToPreviousStep,
    updateData,
    isDataComplete,
  } = useOnboardingStateMachine();

  // Redirect if already completed onboarding
  useEffect(() => {
    if (!isAuthLoading && user?.onboardingCompleted) {
      setLocation("/dashboard");
    }
  }, [user, isAuthLoading, setLocation]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation("/login");
    }
  }, [user, isAuthLoading, setLocation]);

  const handleStepUpdate = (updates: Partial<typeof data>) => {
    updateData(updates);

    // If this is the last step, submit the onboarding data
    if (currentStep === "personalization" && updates.childGrade) {
      handleCompleteOnboarding({ ...data, ...updates });
    } else {
      goToNextStep();
    }
  };

  const handleCompleteOnboarding = async (finalData: typeof data) => {
    if (!isDataComplete()) {
      toast({
        title: "Missing information",
        description: "Please complete all steps",
        variant: "destructive",
      });
      return;
    }

    try {
      await completeOnboarding({
        fullName: finalData.fullName,
        email: finalData.email,
        schoolId: finalData.schoolId,
        schoolName: finalData.schoolName,
        latitude: finalData.latitude!,
        longitude: finalData.longitude!,
        childGrade: finalData.childGrade!,
      });

      toast({
        title: "Welcome to Kitabu!",
        description: "Your account is ready",
      });

      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete onboarding",
        variant: "destructive",
      });
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel - Visuals */}
      <div className="hidden lg:flex flex-col relative bg-muted text-white">
        <div className="absolute inset-0">
          <img
            src={onboardingHero}
            alt="Parents Community"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/90 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col h-full justify-between p-12">
          <div className="flex items-center gap-2">
            <School className="w-8 h-8" />
            <span className="text-2xl font-bold font-display">Kitabu</span>
          </div>

          <div className="space-y-6 max-w-lg">
            <h1 className="text-4xl font-display font-bold leading-tight">
              Join your school's trusted parent community.
            </h1>
            <p className="text-lg text-white/90">
              Buy and sell textbooks directly with other parents in your school network. Secure, verified, and commission-free for families.
            </p>

            <div className="flex gap-4 pt-4">
              <div className="flex items-center gap-2 text-sm font-medium bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4" />
                Verified Parents Only
              </div>
              <div className="flex items-center gap-2 text-sm font-medium bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Lock className="w-4 h-4" />
                Escrow Protected
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex flex-col justify-center items-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-display font-bold">
              {currentStep === "identity" && "Welcome to Kitabu"}
              {currentStep === "school" && "Select Your School"}
              {currentStep === "location" && "Set Your Location"}
              {currentStep === "personalization" && "Almost Done!"}
            </h2>
            <p className="text-muted-foreground">
              Step {["identity", "school", "location", "personalization"].indexOf(currentStep) + 1} of 4
            </p>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="animate-in slide-in-from-right-4 duration-300">
            {currentStep === "identity" && (
              <IdentityStep data={data} onNext={handleStepUpdate} />
            )}

            {currentStep === "school" && (
              <SchoolStep data={data} onNext={handleStepUpdate} onBack={goToPreviousStep} />
            )}

            {currentStep === "location" && (
              <LocationStep data={data} onNext={handleStepUpdate} onBack={goToPreviousStep} />
            )}

            {currentStep === "personalization" && (
              <PersonalizationStep
                data={data}
                onNext={handleStepUpdate}
                onBack={goToPreviousStep}
                isSubmitting={isCompletingOnboarding}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
