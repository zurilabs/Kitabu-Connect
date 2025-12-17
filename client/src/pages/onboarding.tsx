import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { SCHOOLS } from "@/lib/mockData";
import { CheckCircle2, School, User, ArrowRight, ShieldCheck, Mail, Phone, Lock } from "lucide-react";
import onboardingHero from "@assets/generated_images/friendly_parents_talking_at_school_gate.png";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
        setLocation("/dashboard");
      }, 1500);
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
              {step === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="school">Select Your Child's School</Label>
                    <Select>
                      <SelectTrigger id="school" className="h-12">
                        <SelectValue placeholder="Search for school..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHOOLS.map(school => (
                          <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">We use this to connect you with other parents in the same hub.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="Jane" className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Doe" className="h-12" />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="jane@example.com" className="pl-10 h-12" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                      <Input id="phone" type="tel" placeholder="+234 800 000 0000" className="pl-10 h-12" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Create Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                      <Input id="password" type="password" className="pl-10 h-12" />
                    </div>
                  </div>
                </div>
              )}

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
                <Button variant="outline" onClick={() => setStep(step - 1)} className="w-full h-12">
                  Back
                </Button>
              )}
              <Button onClick={handleNext} className="w-full h-12 bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? "Creating Account..." : step === totalSteps ? "Verify & Join" : "Continue"}
                {!loading && step !== totalSteps && <ArrowRight className="ml-2 w-4 h-4" />}
              </Button>
            </CardFooter>
          </Card>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
