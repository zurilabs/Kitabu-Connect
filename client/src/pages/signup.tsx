import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { School, Mail, KeyRound, ArrowRight, ArrowLeft, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import onboardingHero from "@assets/generated_images/friendly_parents_talking_at_school_gate.png";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, sendOTP, verifyOTP, isSendingOTP, isVerifyingOTP } = useAuth();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referrerName, setReferrerName] = useState("");
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Check for referral code in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");

    if (refCode) {
      setReferralCode(refCode);
      // Store in localStorage so onboarding can access it
      localStorage.setItem("pendingReferralCode", refCode);
      validateReferralCode(refCode);
    }
  }, []);

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

  // Validate referral code
  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setReferrerName("");
      return;
    }

    setIsValidatingReferral(true);
    try {
      const response = await fetch(`/api/referrals/validate/${code}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isValid) {
          setReferrerName(data.referrerName);
        } else {
          setReferrerName("");
          toast({
            title: "Invalid referral code",
            description: data.message || "The referral code you entered is not valid",
            variant: "destructive",
          });
        }
      } else {
        setReferrerName("");
      }
    } catch (error) {
      console.error("Failed to validate referral code:", error);
      setReferrerName("");
    } finally {
      setIsValidatingReferral(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await sendOTP(email);
      setOtpMessage(result.message);
      setStep("otp");
      toast({
        title: "Verification code sent",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send verification code",
        variant: "destructive",
      });
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode.trim() || otpCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await verifyOTP({ email, code: otpCode });

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
        description: error instanceof Error ? error.message : "Invalid verification code",
        variant: "destructive",
      });
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setOtpCode("");
  };

  const handleGoogleSignup = () => {
    window.location.href = "/api/auth/google";
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
                  <h3 className="font-semibold">Enter your email</h3>
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
      <div className="flex flex-col justify-center items-center p-6 lg:p-12 bg-background relative">
        {/* Back to Home Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="absolute top-4 left-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>

        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-display font-bold">Create Parent Account</h2>
            <p className="text-muted-foreground">
              {step === "email"
                ? "Join the trusted community of Kenyan parents"
                : "Enter the verification code we sent you"}
            </p>
          </div>

          {step === "email" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Address
                </CardTitle>
                <CardDescription>
                  We'll send you a 6-digit verification code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="text-lg"
                    />
                  </div>

                  {/* Referral Code Input */}
                  <div className="space-y-2">
                    <Label htmlFor="referralCode" className="flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      Referral Code (Optional)
                    </Label>
                    <div className="relative">
                      <Input
                        id="referralCode"
                        type="text"
                        placeholder="Enter referral code"
                        value={referralCode}
                        onChange={(e) => {
                          const code = e.target.value.toUpperCase();
                          setReferralCode(code);
                        }}
                        onBlur={(e) => validateReferralCode(e.target.value)}
                        className="uppercase"
                      />
                      {isValidatingReferral && (
                        <div className="absolute right-3 top-2.5">
                          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                        </div>
                      )}
                    </div>
                    {referrerName && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Valid code from {referrerName}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to the{" "}
                      <Link href="/terms-of-service">
                        <a className="text-primary hover:underline font-medium" target="_blank">
                          Terms of Service
                        </a>
                      </Link>
                      {" "}and{" "}
                      <Link href="/privacy-policy">
                        <a className="text-primary hover:underline font-medium" target="_blank">
                          Privacy Policy
                        </a>
                      </Link>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSendingOTP || !email.trim() || !agreedToTerms}
                  >
                    {isSendingOTP ? "Sending code..." : (
                      <>
                        Send verification code
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    size="lg"
                    onClick={handleGoogleSignup}
                    disabled={!agreedToTerms}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Sign up with Google
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
                  {otpMessage || `Code sent to ${email}`}
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
                      onClick={handleBackToEmail}
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
