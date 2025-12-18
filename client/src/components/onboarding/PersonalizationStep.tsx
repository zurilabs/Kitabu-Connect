import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingData } from "@/lib/onboarding-state-machine";
import { cn } from "@/lib/utils";

interface PersonalizationStepProps {
  data: OnboardingData;
  onNext: (updates: Partial<OnboardingData>) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function PersonalizationStep({ data, onNext, onBack, isSubmitting }: PersonalizationStepProps) {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(data.childGrade);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGrade !== null) {
      onNext({ childGrade: selectedGrade });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Personalize Your Feed</CardTitle>
        <CardDescription>
          Select your child's current grade to see relevant textbooks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Child's Grade</Label>
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map((grade) => (
                <Button
                  key={grade}
                  type="button"
                  variant={selectedGrade === grade ? "default" : "outline"}
                  className={cn(
                    "h-14 text-base font-semibold",
                    selectedGrade === grade && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => setSelectedGrade(grade)}
                >
                  Grade {grade}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1"
              disabled={isSubmitting}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={selectedGrade === null || isSubmitting}
            >
              {isSubmitting ? "Completing..." : "Complete Setup"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
