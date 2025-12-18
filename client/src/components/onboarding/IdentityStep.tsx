import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingData } from "@/lib/onboarding-state-machine";

interface IdentityStepProps {
  data: OnboardingData;
  onNext: (updates: Partial<OnboardingData>) => void;
}

export function IdentityStep({ data, onNext }: IdentityStepProps) {
  const [fullName, setFullName] = useState(data.fullName);
  const [email, setEmail] = useState(data.email);

  const isValid = fullName.trim().length >= 2 && email.includes("@");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onNext({ fullName, email });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Welcome to Kitabu Connect</CardTitle>
        <CardDescription>Let's start by getting to know you better</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              {/* Use @kitabu.admin email for admin access */}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={!isValid}>
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
