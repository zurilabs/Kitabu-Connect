import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { School, Phone, KeyRound, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import onboardingHero from "@assets/generated_images/friendly_parents_talking_at_school_gate.png";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, sendOTP, verifyOTP, isSendingOTP, isVerifyingOTP } = useAuth();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpMessage, setOtpMessage] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      if (user.onboardingCompleted) {
        setLocation("/dashboard");
      } else {
        setLocation("/onboarding");
      }
    }
  }, [user, isLoading, setLocation]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate Kenyan phone number format
    const kenyanPhoneRegex = /^(\+254|254|0)?[17]\d{8}$/;
    if (!kenyanPhoneRegex.test(phoneNumber.replace(/\s/g, ""))) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid Kenyan phone number (e.g., 0712345678 or +254712345678)",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await sendOTP(phoneNumber);
      setOtpMessage(result.message);
      setStep("otp");
      toast({
        title: "OTP Sent",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send OTP",
        variant: "destructive",
      });
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode.trim() || otpCode.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit code",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await verifyOTP({ phoneNumber, code: otpCode });

      toast({
        title: "Welcome to Kitabu Connect!",
        description: result.isNewUser ? "Let's set up your account" : "Welcome back!",
      });

      // Redirect to onboarding for new users or those who haven't completed it
      if (result.isNewUser || !result.user.onboardingCompleted) {
        setLocation("/onboarding");
      } else {
        setLocation("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Invalid OTP code",
        variant: "destructive",
      });
    }
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setOtpCode("");
  };

  if (isLoading) {
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
            alt="Kitabu Connect"
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
              Join Kenya's trusted parent community for textbooks
            </h1>
            <p className="text-lg text-white/90">
              Buy and sell school textbooks safely. Connect with parents at your child's school. Secure escrow payments and verified community.
            </p>

            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold">Enter your phone number</h3>
                  <p className="text-sm text-white/80">We'll send you a verification code</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold">Verify & complete onboarding</h3>
                  <p className="text-sm text-white/80">Set up your profile in 4 simple steps</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold">Start buying & selling</h3>
                  <p className="text-sm text-white/80">Connect with parents in your school community</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex flex-col justify-center items-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-display font-bold">Create Parent Account</h2>
            <p className="text-muted-foreground">
              {step === "phone"
                ? "Join the trusted community of Kenyan parents"
                : "Enter the verification code we sent you"}
            </p>
          </div>

          {step === "phone" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Phone Number
                </CardTitle>
                <CardDescription>
                  We'll send you a 6-digit verification code via SMS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="0712 345 678 or +254712345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      autoFocus
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a valid Kenyan phone number (Safaricom, Airtel, Telkom)
                    </p>
                  </div>

                  <Alert>
                    <AlertDescription className="text-sm">
                      By signing up, you agree to connect with verified parents in your school's community.
                      Your phone number will be kept private.
                    </AlertDescription>
                  </Alert>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSendingOTP || !phoneNumber.trim()}
                  >
                    {isSendingOTP ? "Sending code..." : (
                      <>
                        Send verification code
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setLocation("/login")}
                        className="text-primary hover:underline font-medium"
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5" />
                  Verification Code
                </CardTitle>
                <CardDescription>
                  {otpMessage || `Code sent to ${phoneNumber}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otpCode">6-Digit Code</Label>
                    <Input
                      id="otpCode"
                      type="text"
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      required
                      autoFocus
                      className="text-center text-2xl tracking-widest font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToPhone}
                      className="flex-1"
                      disabled={isVerifyingOTP}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isVerifyingOTP || otpCode.length !== 6}
                    >
                      {isVerifyingOTP ? "Verifying..." : "Verify & Continue"}
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-sm"
                    onClick={handleSendOTP}
                    disabled={isSendingOTP}
                  >
                    Didn't receive code? Resend
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
