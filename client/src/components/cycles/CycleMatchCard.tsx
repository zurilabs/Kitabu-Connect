import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useState } from "react";
import { toast } from "sonner";
import {
  Users,
  MapPin,
  DollarSign,
  TrendingUp,
  Clock,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CycleParticipant {
  id: string;
  userId: string;
  userName: string;
  userSchoolName: string;
  schoolCounty: string;
  positionInCycle: number;
  bookToGive: {
    id: number;
    title: string;
    subject: string;
    grade: string;
  };
  bookToReceive: {
    id: number;
    title: string;
    subject: string;
    grade: string;
  };
  confirmed: boolean;
  confirmedAt: Date | null;
}

interface SwapCycle {
  id: string;
  cycleType: string;
  status: string;
  priorityScore: string;
  primaryCounty: string | null;
  isSameCounty: boolean;
  isSameZone: boolean;
  totalLogisticsCost: string;
  avgCostPerParticipant: string;
  maxDistanceKm: string;
  avgDistanceKm: string;
  confirmationDeadline: Date;
  completionDeadline: Date | null;
  confirmedParticipantsCount: number;
  totalParticipantsCount: number;
  createdAt: Date;
  participants: CycleParticipant[];
}

interface CycleMatchCardProps {
  cycle: SwapCycle;
  currentUserId: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function CycleMatchCard({
  cycle,
  currentUserId,
  onConfirm,
  onCancel,
}: CycleMatchCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const currentUserParticipant = cycle.participants.find(
    (p) => p.userId === currentUserId
  );

  const isUserConfirmed = currentUserParticipant?.confirmed || false;
  const allConfirmed = cycle.confirmedParticipantsCount === cycle.totalParticipantsCount;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const response = await fetch(`/api/cycles/${cycle.id}/confirm`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Swap cycle confirmed! Waiting for other participants.");
        onConfirm?.();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to confirm participation");
      }
    } catch (error) {
      toast.error("Failed to confirm participation");
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/cycles/${cycle.id}/cancel`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Swap cycle cancelled");
        onCancel?.();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to cancel cycle");
      }
    } catch (error) {
      toast.error("Failed to cancel cycle");
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = () => {
    switch (cycle.status) {
      case "pending_confirmation":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Confirmed</Badge>;
      case "active":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Active</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Cancelled</Badge>;
      case "timeout":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Expired</Badge>;
      default:
        return <Badge variant="outline">{cycle.status}</Badge>;
    }
  };

  const getPriorityBadge = () => {
    const score = parseFloat(cycle.priorityScore);
    if (score >= 80) {
      return <Badge className="bg-green-600">High Priority</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-blue-600">Medium Priority</Badge>;
    } else {
      return <Badge className="bg-gray-600">Low Priority</Badge>;
    }
  };

  const timeUntilDeadline = cycle.confirmationDeadline
    ? formatDistanceToNow(new Date(cycle.confirmationDeadline), { addSuffix: true })
    : null;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {cycle.cycleType} Swap Match
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Found {formatDistanceToNow(new Date(cycle.createdAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge()}
            {getPriorityBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Your Exchange */}
        {currentUserParticipant && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Your Exchange
            </h4>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex-1">
                <p className="font-medium">{currentUserParticipant.bookToGive.title}</p>
                <p className="text-xs text-muted-foreground">
                  {currentUserParticipant.bookToGive.subject} - Grade {currentUserParticipant.bookToGive.grade}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{currentUserParticipant.bookToReceive.title}</p>
                <p className="text-xs text-muted-foreground">
                  {currentUserParticipant.bookToReceive.subject} - Grade {currentUserParticipant.bookToReceive.grade}
                </p>
              </div>
            </div>
            {isUserConfirmed && (
              <div className="mt-2 flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                You confirmed this swap
              </div>
            )}
          </div>
        )}

        {/* Swap Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-medium">Location</span>
            </div>
            <p className="text-sm font-semibold">
              {cycle.isSameCounty ? "Same County" : cycle.primaryCounty || "Multi-County"}
            </p>
            {cycle.isSameZone && (
              <Badge variant="outline" className="text-xs">Same Zone</Badge>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Your Cost</span>
            </div>
            <p className="text-sm font-semibold">
              KES {parseFloat(cycle.avgCostPerParticipant).toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Total: KES {parseFloat(cycle.totalLogisticsCost).toFixed(0)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Distance</span>
            </div>
            <p className="text-sm font-semibold">
              {parseFloat(cycle.avgDistanceKm).toFixed(1)} km avg
            </p>
            <p className="text-xs text-muted-foreground">
              Max: {parseFloat(cycle.maxDistanceKm).toFixed(1)} km
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Participants</span>
            </div>
            <p className="text-sm font-semibold">
              {cycle.confirmedParticipantsCount} / {cycle.totalParticipantsCount}
            </p>
            <p className="text-xs text-muted-foreground">
              {allConfirmed ? "All confirmed" : "Waiting for confirmation"}
            </p>
          </div>
        </div>

        {/* Confirmation Deadline */}
        {cycle.status === "pending_confirmation" && timeUntilDeadline && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Confirm {timeUntilDeadline}
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  All participants must confirm within 48 hours
                </p>
              </div>
            </div>
          </div>
        )}

        {/* All Participants */}
        <div>
          <h4 className="font-semibold text-sm mb-2">All Participants</h4>
          <div className="space-y-2">
            {cycle.participants
              .sort((a, b) => a.positionInCycle - b.positionInCycle)
              .map((participant, index) => (
                <div
                  key={participant.id}
                  className={`p-2 rounded-lg border ${
                    participant.userId === currentUserId
                      ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                      : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {participant.userName}
                        {participant.userId === currentUserId && (
                          <span className="ml-1 text-xs text-muted-foreground">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {participant.userSchoolName}
                      </p>
                    </div>
                    {participant.confirmed && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Actions */}
        {cycle.status === "pending_confirmation" && !isUserConfirmed && (
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={confirming}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {confirming ? "Confirming..." : "Confirm Swap"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" disabled={cancelling}>
                  <X className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Swap Cycle?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this swap? This will cancel the
                    entire cycle for all participants and may affect your reliability score.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Go Back</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="bg-destructive text-destructive-foreground"
                  >
                    {cancelling ? "Cancelling..." : "Yes, Cancel"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {cycle.status === "pending_confirmation" && isUserConfirmed && (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              Waiting for {cycle.totalParticipantsCount - cycle.confirmedParticipantsCount} more{" "}
              {cycle.totalParticipantsCount - cycle.confirmedParticipantsCount === 1
                ? "participant"
                : "participants"}{" "}
              to confirm
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
