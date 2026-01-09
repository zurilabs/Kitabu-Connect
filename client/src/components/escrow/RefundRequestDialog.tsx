import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, DollarSign, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface RefundRequestDialogProps {
  orderId: number;
  orderType: "purchase" | "swap";
  amount: string;
  sellerName: string;
  onSuccess?: () => void;
}

const refundReasons = [
  { value: "item_not_received", label: "Item not received" },
  { value: "item_not_as_described", label: "Item not as described" },
  { value: "item_damaged", label: "Item damaged or defective" },
  { value: "seller_unresponsive", label: "Seller is unresponsive" },
  { value: "cancelled_by_agreement", label: "Cancelled by mutual agreement" },
  { value: "other", label: "Other reason" },
];

export function RefundRequestDialog({
  orderId,
  orderType,
  amount,
  sellerName,
  onSuccess,
}: RefundRequestDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const requestRefundMutation = useMutation({
    mutationFn: async () => {
      const endpoint =
        orderType === "purchase"
          ? `/api/swap-orders/purchase/${orderId}/refund`
          : `/api/swap-orders/${orderId}/refund`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reason,
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to request refund");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Refund Requested",
        description:
          "Your refund request has been submitted. Our team will review it and get back to you within 24-48 hours.",
      });
      setOpen(false);
      setReason("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["swap-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast({
        title: "Reason Required",
        description: "Please select a reason for the refund request",
        variant: "destructive",
      });
      return;
    }

    if (description.trim().length < 20) {
      toast({
        title: "Description Too Short",
        description: "Please provide a detailed description (at least 20 characters)",
        variant: "destructive",
      });
      return;
    }

    requestRefundMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <DollarSign className="h-4 w-4 mr-2" />
          Request Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Request Refund
            </DialogTitle>
            <DialogDescription>
              Request a refund for this order. Our team will review your request and contact both
              parties.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Refund Amount */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Refund Amount</span>
                <span className="text-lg font-bold">KES {parseFloat(amount).toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Funds will be returned to your wallet if approved
              </p>
            </div>

            {/* Seller Info */}
            <div className="p-3 border rounded-lg">
              <p className="text-sm">
                <span className="text-muted-foreground">Seller:</span>{" "}
                <span className="font-medium">{sellerName}</span>
              </p>
            </div>

            {/* Reason Selection */}
            <div className="space-y-2">
              <Label>Reason for Refund *</Label>
              <RadioGroup value={reason} onValueChange={setReason}>
                {refundReasons.map((r) => (
                  <div key={r.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={r.value} id={r.value} />
                    <Label htmlFor={r.value} className="font-normal cursor-pointer">
                      {r.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Detailed Description *
                <span className="text-xs text-muted-foreground ml-2">
                  ({description.length}/500)
                </span>
              </Label>
              <Textarea
                id="description"
                placeholder="Please provide detailed information about why you're requesting a refund. Include any relevant details such as what went wrong, communication attempts with the seller, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Be as specific as possible to help us process your request quickly
              </p>
            </div>

            {/* Warning */}
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs text-orange-900">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                Filing a false refund request may result in account restrictions. Please only
                request a refund if there's a genuine issue with your order.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={requestRefundMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={requestRefundMutation.isPending || !reason || description.length < 20}
            >
              {requestRefundMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Refund Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
