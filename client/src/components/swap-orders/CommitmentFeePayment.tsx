import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, DollarSign, CheckCircle, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface CommitmentFeePaymentProps {
  swapOrderId: number;
  isRequester: boolean;
  requesterPaidFee: boolean;
  ownerPaidFee: boolean;
  commitmentFee: string;
}

export default function CommitmentFeePayment({
  swapOrderId,
  isRequester,
  requesterPaidFee,
  ownerPaidFee,
  commitmentFee,
}: CommitmentFeePaymentProps) {
  const [paying, setPaying] = useState(false);

  const userPaidFee = isRequester ? requesterPaidFee : ownerPaidFee;
  const otherPartyPaidFee = isRequester ? ownerPaidFee : requesterPaidFee;
  const bothPaid = requesterPaidFee && ownerPaidFee;

  const handlePayment = async () => {
    setPaying(true);
    try {
      // Initialize payment with backend (same as wallet top-up)
      // Email and amount are fetched from the backend automatically
      const response = await fetch(`/api/swap-orders/${swapOrderId}/pay-commitment-fee/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.authorizationUrl) {
        // Redirect to Paystack payment page (same as wallet top-up)
        window.location.href = data.authorizationUrl;
      } else {
        toast.error(data.message || "Failed to initialize payment");
        setPaying(false);
      }
    } catch (error) {
      console.error("Payment initialization error:", error);
      toast.error("Failed to initialize payment");
      setPaying(false);
    }
  };

  if (bothPaid) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700 dark:text-green-300">
          Both parties have paid their commitment fees. The swap is now in progress!
        </AlertDescription>
      </Alert>
    );
  }

  if (userPaidFee) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          You have paid your commitment fee. Waiting for the other party to pay.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
          <DollarSign className="h-5 w-5" />
          Service Fee Required
        </CardTitle>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          Pay a KES {commitmentFee} service fee to proceed with the swap.
          {otherPartyPaidFee && " The other party has already paid."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert className="bg-white dark:bg-gray-900 border-blue-200">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm space-y-2">
              <p className="font-semibold text-blue-900 dark:text-blue-100">Why do we charge this fee?</p>
              <p className="text-muted-foreground">
                This service fee ensures both parties are serious about the swap and helps us maintain a safe, reliable platform for book exchanges. The fee is held in escrow and released to Kitabu Connect once both parties confirm successful delivery.
              </p>
              <div className="bg-blue-50 dark:bg-blue-950/50 p-2 rounded mt-2">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  🔒 Secure payment via Paystack<br />
                  ⚖️ Held in escrow during swap<br />
                  ✅ Released to platform on completion
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <Button
            type="button"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            disabled={paying}
            onClick={handlePayment}
          >
            {paying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to Payment...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Pay KES {commitmentFee} via Paystack
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You will be redirected to Paystack to complete your payment securely
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
