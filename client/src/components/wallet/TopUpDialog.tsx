import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface TopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TopUpDialog({ open, onOpenChange }: TopUpDialogProps) {
  const [amount, setAmount] = useState("");
  const { initializeTopUp } = useWallet();
  const { user } = useAuth();

  const handleTopUp = () => {
    const amountNumber = parseFloat(amount);

    if (!amountNumber || amountNumber < 10) {
      alert("Minimum top-up amount is KES 10");
      return;
    }

    if (amountNumber > 1000000) {
      alert("Maximum top-up amount is KES 1,000,000");
      return;
    }

    initializeTopUp.mutate({
      amount: amountNumber,
      email: user?.email || undefined,
    });
  };

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Top Up Wallet</DialogTitle>
          <DialogDescription>
            Add funds to your wallet using Paystack. You'll be redirected to complete the payment.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="10"
              max="1000000"
            />
            <p className="text-xs text-muted-foreground">
              Minimum: KES 10 • Maximum: KES 1,000,000
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick amounts</Label>
            <div className="grid grid-cols-5 gap-2">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="text-xs"
                >
                  {quickAmount}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Payment Method</p>
            <p className="text-muted-foreground text-xs">
              You'll be redirected to Paystack to complete your payment securely using card, bank transfer, or mobile money.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleTopUp} disabled={initializeTopUp.isPending || !amount}>
            {initializeTopUp.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              "Proceed to Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
