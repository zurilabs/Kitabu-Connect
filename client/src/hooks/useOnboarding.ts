import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { User, CompleteOnboardingInput } from "server/db/schema";

interface CompleteOnboardingResponse {
  success: boolean;
  user: User;
}

async function completeOnboarding(data: CompleteOnboardingInput): Promise<CompleteOnboardingResponse> {
  const response = await fetch("/api/onboarding/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to complete onboarding");
  }

  return response.json();
}

export function useOnboarding() {
  const queryClient = useQueryClient();

  const completeOnboardingMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: (data) => {
      // Update user in cache
      queryClient.setQueryData(["auth", "me"], data.user);
    },
  });

  return {
    completeOnboarding: completeOnboardingMutation.mutateAsync,
    isCompletingOnboarding: completeOnboardingMutation.isPending,
    error: completeOnboardingMutation.error,
  };
}
