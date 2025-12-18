import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { School, Phone, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import onboardingHero from "@assets/generated_images/friendly_parents_talking_at_school_gate.png";

export default function Login() {
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
        title: "Login successful",
        description: "Welcome to Kitabu Connect!",
      });

      // Redirect based on onboarding status
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
              Kenya's Trusted Textbook Marketplace
            </h1>
            <p className="text-lg text-white/90">
              Connect with other parents to buy and sell textbooks. Secure transactions with escrow protection and QR code verification.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <div className="text-3xl font-bold">98%</div>
                <div className="text-sm text-white/80">Trust Score</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold">5k+</div>
                <div className="text-sm text-white/80">Active Parents</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-col justify-center items-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-display font-bold">Welcome Back</h2>
            <p className="text-muted-foreground">
              {step === "phone" ? "Enter your phone number to continue" : "Enter the verification code"}
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
                  We'll send you a 6-digit verification code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="+254 XXX XXX XXX or 07XX XXX XXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Kenyan phone number (Safaricom, Airtel, Telkom)
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSendingOTP || !phoneNumber.trim()}
                  >
                    {isSendingOTP ? "Sending..." : "Send Code"}
                  </Button>

                  <div className="space-y-3 pt-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setLocation("/signup")}
                          className="text-primary hover:underline font-medium"
                        >
                          Sign up
                        </button>
                      </p>
                    </div>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setLocation("/forgot-password")}
                        className="text-sm text-muted-foreground hover:text-primary hover:underline"
                      >
                        Having trouble signing in?
                      </button>
                    </div>
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
                      className="text-center text-2xl tracking-widest"
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
                      {isVerifyingOTP ? "Verifying..." : "Verify"}
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
