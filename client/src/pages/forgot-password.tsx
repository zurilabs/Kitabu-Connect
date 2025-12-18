import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { School, Phone, ArrowLeft, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import onboardingHero from "@assets/generated_images/friendly_parents_talking_at_school_gate.png";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // In a real app, this would send an OTP to reset password
    // For now, we'll just show a message
    setIsSubmitted(true);
  };

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
              Need help accessing your account?
            </h1>
            <p className="text-lg text-white/90">
              We'll help you get back into your account. Enter your phone number and we'll send you a verification code.
            </p>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Account Recovery</h3>
              <ul className="space-y-2 text-sm text-white/90">
                <li className="flex items-start gap-2">
                  <span className="text-white font-bold">•</span>
                  <span>Enter the phone number linked to your account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white font-bold">•</span>
                  <span>Receive a 6-digit verification code via SMS</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white font-bold">•</span>
                  <span>Verify the code to regain access to your account</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex flex-col justify-center items-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/login")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login
            </Button>

            <h2 className="text-3xl font-display font-bold">Account Recovery</h2>
            <p className="text-muted-foreground">
              Enter your phone number to receive a verification code
            </p>
          </div>

          {!isSubmitted ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Phone Number
                </CardTitle>
                <CardDescription>
                  We'll send a verification code to this number
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use the Kenyan phone number you registered with
                    </p>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Note:</strong> Kitabu Connect uses phone number + OTP authentication.
                      You don't have a password to reset. Simply enter your phone number to receive
                      a new login code.
                    </AlertDescription>
                  </Alert>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={!phoneNumber.trim()}
                  >
                    Send verification code
                  </Button>

                  <div className="text-center pt-4">
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
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Check your phone</CardTitle>
                <CardDescription>
                  We've sent a verification code to {phoneNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <AlertDescription className="text-sm text-green-800 dark:text-green-200">
                    A 6-digit verification code has been sent to your phone. Use it to log in
                    to your account.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setLocation("/login")}
                  >
                    Go to login
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsSubmitted(false)}
                  >
                    Try a different number
                  </Button>
                </div>

                <div className="text-center pt-4">
                  <p className="text-xs text-muted-foreground">
                    Didn't receive the code? Check your SMS or try resending from the login page.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
