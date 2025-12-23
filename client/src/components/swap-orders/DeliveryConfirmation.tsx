import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CheckCircle2, Package, ThumbsUp, X, Truck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SwapOrder {
  id: number;
  status: string;
  requirementsSubmitted: boolean;
  requirementsApproved: boolean;
  requesterPaidFee: boolean;
  ownerPaidFee: boolean;
  requesterShipped?: boolean;
  ownerShipped?: boolean;
  requesterReceivedBook: boolean;
  ownerReceivedBook: boolean;
}

interface DeliveryConfirmationProps {
  swapOrder: SwapOrder;
  isRequester: boolean;
  onSuccess: () => void;
}

export default function DeliveryConfirmation({
  swapOrder,
  isRequester,
  onSuccess,
}: DeliveryConfirmationProps) {
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [approving, setApproving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  const handleApproveRequirements = async () => {
    setApproving(true);
    try {
      const response = await fetch(
        `/api/swap-orders/${swapOrder.id}/approve-requirements`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("Requirements approved! Swap is now in progress.");
        onSuccess();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to approve requirements");
      }
    } catch (error) {
      toast.error("Failed to approve requirements");
    } finally {
      setApproving(false);
    }
  };

  const handleDispatchBook = async () => {
    setDispatching(true);
    try {
      const response = await fetch(
        `/api/swap-orders/${swapOrder.id}/dispatch`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        onSuccess();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to mark book as dispatched");
      }
    } catch (error) {
      toast.error("Failed to mark book as dispatched");
    } finally {
      setDispatching(false);
    }
  };

  const handleConfirmDelivery = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/swap-orders/${swapOrder.id}/confirm-delivery`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        onSuccess();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to confirm delivery");
      }
    } catch (error) {
      toast.error("Failed to confirm delivery");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancellationReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    setCancelling(true);
    try {
      const response = await fetch(`/api/swap-orders/${swapOrder.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: cancellationReason }),
      });

      if (response.ok) {
        toast.success("Order cancelled successfully");
        onSuccess();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to cancel order");
      }
    } catch (error) {
      toast.error("Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const bothPaidFees = swapOrder.requesterPaidFee && swapOrder.ownerPaidFee;

  const userHasDispatched = isRequester
    ? swapOrder.requesterShipped
    : swapOrder.ownerShipped;

  const otherPartyDispatched = isRequester
    ? swapOrder.ownerShipped
    : swapOrder.requesterShipped;

  const userHasConfirmed = isRequester
    ? swapOrder.requesterReceivedBook
    : swapOrder.ownerReceivedBook;

  const otherPartyConfirmed = isRequester
    ? swapOrder.ownerReceivedBook
    : swapOrder.requesterReceivedBook;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Owner: Approve Requirements */}
        {!isRequester &&
          swapOrder.requirementsSubmitted &&
          !swapOrder.requirementsApproved && (
            <Button
              className="w-full"
              onClick={handleApproveRequirements}
              disabled={approving}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              {approving ? "Approving..." : "Approve Meetup Details"}
            </Button>
          )}

        {/* Dispatch Book - Show after both parties have paid */}
        {bothPaidFees && swapOrder.status === "in_progress" && (
          <div className="space-y-2">
            {userHasDispatched ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                    You dispatched your book
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {otherPartyDispatched
                      ? "Both books are on the way!"
                      : "Waiting for other party to dispatch"}
                  </p>
                </div>
              </div>
            ) : (
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleDispatchBook}
                disabled={dispatching}
              >
                <Truck className="h-4 w-4 mr-2" />
                {dispatching ? "Marking as Dispatched..." : "I've Sent My Book"}
              </Button>
            )}
          </div>
        )}

        {/* Confirm Receipt - Show if in_progress or delivered status */}
        {(swapOrder.status === "in_progress" ||
          swapOrder.status === "delivered") && (
          <div className="space-y-2">
            {userHasConfirmed ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-green-900 dark:text-green-100">
                    You confirmed receipt
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    {otherPartyConfirmed
                      ? "Both parties have confirmed"
                      : "Waiting for other party to confirm"}
                  </p>
                </div>
              </div>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" variant="default">
                    <Package className="h-4 w-4 mr-2" />
                    Confirm I Received the Book
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Book Receipt</AlertDialogTitle>
                    <AlertDialogDescription>
                      By confirming, you're indicating that you have received the
                      book and are satisfied with the condition. Once both
                      parties confirm, the swap will be marked as completed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConfirmDelivery}
                      disabled={loading}
                    >
                      {loading ? "Confirming..." : "Yes, I Received It"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}

        {/* Cancel Order */}
        {swapOrder.status !== "completed" && swapOrder.status !== "cancelled" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancel Order
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Swap Order</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel this order? This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Label htmlFor="cancellationReason">
                  Reason for Cancellation
                </Label>
                <Textarea
                  id="cancellationReason"
                  placeholder="Please provide a reason..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Go Back</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancelOrder}
                  disabled={cancelling || !cancellationReason.trim()}
                  className="bg-destructive text-destructive-foreground"
                >
                  {cancelling ? "Cancelling..." : "Yes, Cancel Order"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}
