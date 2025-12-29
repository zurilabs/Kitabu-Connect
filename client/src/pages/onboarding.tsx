import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { SchoolCombobox } from "@/components/ui/school-combobox";
import { CheckCircle2, School, ArrowRight, ShieldCheck, Mail, Lock, Users, X } from "lucide-react";
import onboardingHero from "@assets/generated_images/friendly_parents_talking_at_school_gate.png";

const GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9",
  "Form 1", "Form 2", "Form 3", "Form 4"
];

interface ChildData {
  name: string;
  grade: string;
  schoolId: string;
  schoolName: string;
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Form data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Children data
  const [childrenCount, setChildrenCount] = useState<number | null>(null);
  const [children, setChildren] = useState<ChildData[]>([]);

  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Step 2 - Submit all data and complete onboarding
      setLoading(true);
      try {
        const response = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            fullName: `${firstName} ${lastName}`,
            email,
            children: children.map(child => ({
              name: child.name || null,
              grade: child.grade,
              schoolId: child.schoolId,
              schoolName: child.schoolName,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to complete onboarding");
        }

        // Navigate to marketplace
        setLocation("/marketplace");
      } catch (error) {
        console.error("Onboarding error:", error);
        setLoading(false);
      }
    }
  };

  const handleChildrenCountSelect = (count: number) => {
    setChildrenCount(count);
    // Initialize children array with empty data
    const newChildren: ChildData[] = Array.from({ length: count }, () => ({
      name: "",
      grade: "",
      schoolId: "",
      schoolName: "",
    }));
    setChildren(newChildren);
  };

  const updateChild = (index: number, field: keyof ChildData, value: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const handleSkipChildren = async () => {
    setLoading(true);
    try {
      // Submit onboarding data without children
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: `${firstName} ${lastName}`,
          email,
          children: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete onboarding");
      }

      // Navigate to marketplace
      setLocation("/marketplace");
    } catch (error) {
      console.error("Onboarding error:", error);
      setLoading(false);
    }
  };

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
            <h2 className="text-3xl font-display font-bold">Create Parent Account</h2>
            <p className="text-muted-foreground">Step {step} of {totalSteps}</p>
            <Progress value={progress} className="h-2" />
          </div>

          <Card className="border-none shadow-none">
            <CardContent className="p-0 space-y-6">
              {/* Step 1: Parent Basic Info with Email */}
              {step === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="Jane"
                        className="h-12"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        className="h-12"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="jane@example.com"
                        className="pl-10 h-12"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Children Information */}
              {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  {childrenCount === null ? (
                    <>
                      <div className="text-center space-y-2">
                        <Users className="w-12 h-12 mx-auto text-primary" />
                        <h3 className="text-lg font-semibold">How many children do you have?</h3>
                        <p className="text-sm text-muted-foreground">
                          This helps us personalize your experience
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((num) => (
                          <Button
                            key={num}
                            variant="outline"
                            className="h-20 text-2xl font-bold hover:bg-primary hover:text-white"
                            onClick={() => handleChildrenCountSelect(num)}
                          >
                            {num}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        className="w-full h-12"
                        onClick={() => handleChildrenCountSelect(5)}
                      >
                        4+ children
                      </Button>

                      <div className="text-center pt-4">
                        <Button
                          variant="link"
                          className="text-muted-foreground"
                          onClick={handleSkipChildren}
                        >
                          Skip for now
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">
                          {childrenCount === 5 ? "Add your children" : `Add ${childrenCount} ${childrenCount === 1 ? "child" : "children"}`}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setChildrenCount(null);
                            setChildren([]);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {children.map((child, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="font-semibold">Child {index + 1}</Label>
                              {children.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setChildren(children.filter((_, i) => i !== index));
                                    setChildrenCount(children.length - 1);
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`child-name-${index}`}>Name (Optional)</Label>
                              <Input
                                id={`child-name-${index}`}
                                placeholder="e.g., John"
                                value={child.name}
                                onChange={(e) => updateChild(index, "name", e.target.value)}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`child-grade-${index}`}>Grade *</Label>
                              <Select
                                value={child.grade}
                                onValueChange={(value) => updateChild(index, "grade", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                                <SelectContent>
                                  {GRADES.map((grade) => (
                                    <SelectItem key={grade} value={grade}>
                                      {grade}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`child-school-${index}`}>School *</Label>
                              <SchoolCombobox
                                value={child.schoolId}
                                onChange={(schoolId, schoolName) => {
                                  const updated = [...children];
                                  updated[index] = {
                                    ...updated[index],
                                    schoolId,
                                    schoolName,
                                  };
                                  setChildren(updated);
                                }}
                                placeholder="Search for school"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {childrenCount === 5 && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setChildren([
                              ...children,
                              { name: "", grade: "", schoolId: "", schoolName: "" },
                            ]);
                          }}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Add Another Child
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: OTP Verification */}
              {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 text-center py-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Verification Pending</h3>
                    <p className="text-muted-foreground text-sm">
                      We've sent a 6-digit code to your email. Please enter it below to verify your parent status.
                    </p>
                  </div>

                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Input
                        key={i}
                        className="w-12 h-14 text-center text-xl font-bold"
                        maxLength={1}
                        placeholder="•"
                      />
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Didn't receive code? <Button variant="link" className="p-0 h-auto font-normal">Resend</Button>
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="p-0 pt-6 flex justify-between gap-4">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (step === 2 && childrenCount !== null) {
                      // Reset to count selection
                      setChildrenCount(null);
                      setChildren([]);
                    } else {
                      setStep(step - 1);
                    }
                  }}
                  className="w-full h-12"
                >
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="w-full h-12 bg-primary hover:bg-primary/90"
                disabled={loading || (step === 2 && childrenCount !== null && children.some(c => !c.grade || !c.schoolId))}
              >
                {loading ? "Joining..." : step === totalSteps ? "Join" : "Continue"}
                {!loading && step !== totalSteps && <ArrowRight className="ml-2 w-4 h-4" />}
              </Button>
            </CardFooter>
          </Card>

          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Encrypted</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
