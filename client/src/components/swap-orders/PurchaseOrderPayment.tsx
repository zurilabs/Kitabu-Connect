import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShoppingCart, CheckCircle, ShieldCheck, Package } from "lucide-react";
import { toast } from "sonner";

interface PurchaseOrderPaymentProps {
  purchaseOrderId: number;
  isBuyer: boolean;
  buyerPaid: boolean;
  bookPrice: string;
  convenienceFee: string;
  totalAmount: string;
  status: string;
}

export default function PurchaseOrderPayment({
  purchaseOrderId,
  isBuyer,
  buyerPaid,
  bookPrice,
  convenienceFee,
  totalAmount,
  status,
}: PurchaseOrderPaymentProps) {
  const [paying, setPaying] = useState(false);

  const handlePayment = async () => {
    setPaying(true);
    try {
      const response = await fetch(`/api/swap-orders/purchase/${purchaseOrderId}/pay/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.authorizationUrl) {
        // Redirect to Paystack payment page
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

  // Seller view - payment received
  if (!isBuyer && buyerPaid) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700 dark:text-green-300">
          Payment received! KES {parseFloat(totalAmount).toLocaleString()} is being held in escrow.
          You can now dispatch the book to the buyer.
        </AlertDescription>
      </Alert>
    );
  }

  // Seller view - awaiting payment
  if (!isBuyer && !buyerPaid) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
        <Package className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Awaiting buyer payment. You will be notified once the buyer completes payment.
        </AlertDescription>
      </Alert>
    );
  }

  // Buyer view - already paid
  if (buyerPaid) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700 dark:text-green-300">
          Payment successful! Your payment of KES {parseFloat(totalAmount).toLocaleString()} is being held in escrow.
          Once you receive and confirm the book, the payment will be released to the seller.
        </AlertDescription>
      </Alert>
    );
  }

  // Buyer view - needs to pay
  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
          <ShoppingCart className="h-5 w-5" />
          Complete Your Purchase
        </CardTitle>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          Pay for your book to proceed with the order.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Price Breakdown */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Book Price</span>
              <span className="font-medium">KES {parseFloat(bookPrice).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform Fee (5%)</span>
              <span className="font-medium">KES {parseFloat(convenienceFee).toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Total Amount</span>
              <span className="font-bold text-lg">KES {parseFloat(totalAmount).toLocaleString()}</span>
            </div>
          </div>

          <Alert className="bg-white dark:bg-gray-900 border-blue-200">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm space-y-2">
              <p className="font-semibold text-blue-900 dark:text-blue-100">Secure Escrow Payment</p>
              <p className="text-muted-foreground">
                Your payment is held securely in escrow until you confirm receipt of the book.
                This protects both you and the seller.
              </p>
              <div className="bg-blue-50 dark:bg-blue-950/50 p-2 rounded mt-2">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  🔒 Secure payment via Paystack<br />
                  💰 Money held in escrow<br />
                  ✅ Released to seller after delivery confirmation
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
                <ShoppingCart className="mr-2 h-4 w-4" />
                Pay KES {parseFloat(totalAmount).toLocaleString()} via Paystack
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
