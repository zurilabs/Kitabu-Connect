import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { format, formatDistanceToNow, differenceInHours, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface EscrowStatusCardProps {
  escrowId: number;
  amount: string;
  status: "active" | "released" | "refunded" | "disputed";
  releaseAt: string;
  releasedAt?: string | null;
  refundedAt?: string | null;
  holdPeriodDays: number;
  isSeller: boolean;
  buyerName: string;
  sellerName: string;
  onRefresh?: () => void;
}

export function EscrowStatusCard({
  escrowId,
  amount,
  status,
  releaseAt,
  releasedAt,
  refundedAt,
  holdPeriodDays,
  isSeller,
  buyerName,
  sellerName,
  onRefresh,
}: EscrowStatusCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeRemaining, setTimeRemaining] = useState("");
  const [progress, setProgress] = useState(0);

  // Update countdown every minute
  useEffect(() => {
    if (status !== "active") return;

    const updateCountdown = () => {
      const now = new Date();
      const release = new Date(releaseAt);
      const hoursRemaining = differenceInHours(release, now);
      const daysRemaining = differenceInDays(release, now);

      if (hoursRemaining <= 0) {
        setTimeRemaining("Ready for release");
        setProgress(100);
      } else if (daysRemaining > 1) {
        setTimeRemaining(`${daysRemaining} days remaining`);
        const totalHours = holdPeriodDays * 24;
        const elapsedHours = totalHours - hoursRemaining;
        setProgress((elapsedHours / totalHours) * 100);
      } else if (hoursRemaining > 24) {
        setTimeRemaining(`1 day remaining`);
        const totalHours = holdPeriodDays * 24;
        const elapsedHours = totalHours - hoursRemaining;
        setProgress((elapsedHours / totalHours) * 100);
      } else {
        setTimeRemaining(`${hoursRemaining} hours remaining`);
        const totalHours = holdPeriodDays * 24;
        const elapsedHours = totalHours - hoursRemaining;
        setProgress((elapsedHours / totalHours) * 100);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [status, releaseAt, holdPeriodDays]);

  const releaseEscrowMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/escrow/${escrowId}/release`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to release escrow");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Escrow Released",
        description: "Funds have been released to the seller's wallet",
      });
      queryClient.invalidateQueries({ queryKey: ["swap-order"] });
      onRefresh?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Release Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            <Clock className="h-3 w-3 mr-1" />
            In Escrow
          </Badge>
        );
      case "released":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Released
          </Badge>
        );
      case "refunded":
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            <AlertCircle className="h-3 w-3 mr-1" />
            Refunded
          </Badge>
        );
      case "disputed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Disputed
          </Badge>
        );
    }
  };

  const canRelease = () => {
    if (status !== "active") return false;
    if (!isSeller) return false;
    const now = new Date();
    const release = new Date(releaseAt);
    return now >= release;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Escrow Protection</CardTitle>
              <CardDescription className="text-xs">
                {status === "active" && `Funds held for ${holdPeriodDays} days`}
                {status === "released" && "Payment completed"}
                {status === "refunded" && "Order refunded"}
                {status === "disputed" && "Under review"}
              </CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Amount */}
        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">Escrow Amount</span>
          <span className="text-lg font-bold">KES {parseFloat(amount).toLocaleString()}</span>
        </div>

        {/* Active Escrow Details */}
        {status === "active" && (
          <>
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Hold Period Progress</span>
                <span>{timeRemaining}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Release Date */}
            <div className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {differenceInHours(new Date(releaseAt), new Date()) > 0
                    ? "Automatic Release In"
                    : "Ready for Release"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                {format(new Date(releaseAt), "PPP 'at' p")}
              </p>
            </div>

            {/* Release Button for Seller */}
            {isSeller && (
              <div className="pt-2">
                {canRelease() ? (
                  <Button
                    onClick={() => releaseEscrowMutation.mutate()}
                    disabled={releaseEscrowMutation.isPending}
                    className="w-full"
                  >
                    {releaseEscrowMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Releasing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Release Funds to Wallet
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Funds will be automatically released on{" "}
                      {format(new Date(releaseAt), "PPP")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Buyer View */}
            {!isSeller && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900">
                  <Shield className="h-3 w-3 inline mr-1" />
                  Your payment is protected. Funds will be released to {sellerName} after{" "}
                  {timeRemaining.toLowerCase()}.
                </p>
              </div>
            )}
          </>
        )}

        {/* Released Status */}
        {status === "released" && releasedAt && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-1">
            <p className="text-sm font-medium text-green-900">
              <CheckCircle className="h-4 w-4 inline mr-1" />
              Escrow Released
            </p>
            <p className="text-xs text-green-700">
              Released {formatDistanceToNow(new Date(releasedAt), { addSuffix: true })}
            </p>
            <p className="text-xs text-green-700">
              {isSeller
                ? "Funds have been credited to your wallet"
                : `Payment sent to ${sellerName}`}
            </p>
          </div>
        )}

        {/* Refunded Status */}
        {status === "refunded" && refundedAt && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-1">
            <p className="text-sm font-medium text-orange-900">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Escrow Refunded
            </p>
            <p className="text-xs text-orange-700">
              Refunded {formatDistanceToNow(new Date(refundedAt), { addSuffix: true })}
            </p>
            <p className="text-xs text-orange-700">
              {!isSeller
                ? "Funds have been refunded to your wallet"
                : `Payment refunded to ${buyerName}`}
            </p>
          </div>
        )}

        {/* Disputed Status */}
        {status === "disputed" && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
            <p className="text-sm font-medium text-red-900">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Escrow Disputed
            </p>
            <p className="text-xs text-red-700">
              This escrow is under dispute review. Our team will investigate and resolve this issue.
            </p>
          </div>
        )}

        {/* Info */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <Shield className="h-3 w-3 inline mr-1" />
            Escrow protects both buyer and seller. Funds are held securely until the transaction is
            completed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
