import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, MessageSquare } from "lucide-react";
import CycleConfirmationFlow from "@/components/cycles/CycleConfirmationFlow";
import CycleProgress from "@/components/cycles/CycleProgress";
import DropOffTracking from "@/components/cycles/DropOffTracking";
import { Card, CardContent } from "@/components/ui/card";

interface CycleParticipant {
  id: string;
  userId: string;
  userName: string;
  userSchoolName: string;
  userProfilePictureUrl: string | null;
  schoolCounty: string;
  positionInCycle: number;
  bookToGive: {
    id: number;
    title: string;
    author: string;
    subject: string;
    grade: string;
    condition: string;
    coverImageUrl: string | null;
  };
  bookToReceive: {
    id: number;
    title: string;
    author: string;
    subject: string;
    grade: string;
    condition: string;
    coverImageUrl: string | null;
  };
  confirmed: boolean;
  confirmedAt: Date | null;
  logisticsCost: string;
  bookDroppedOff: boolean;
  bookCollected: boolean;
  dropOffPhotoUrl: string | null;
  collectionPhotoUrl: string | null;
  collectionQrCode: string | null;
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
  confirmedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  participants: CycleParticipant[];
  dropPoint: {
    id: string;
    name: string;
    address: string;
  } | null;
}

interface CycleDetailResponse {
  cycle: SwapCycle;
  userId: string;
}

export default function SwapCycleDetail() {
  const [, params] = useRoute("/swap-cycles/:id");
  const [, setLocation] = useLocation();
  const cycleId = params?.id;

  const { data, isLoading, refetch } = useQuery<CycleDetailResponse>({
    queryKey: ["swap-cycle", cycleId],
    queryFn: async () => {
      const response = await fetch(`/api/cycles/${cycleId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch cycle details");
      }

      return response.json();
    },
    enabled: !!cycleId,
  });

  if (isLoading) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Cycle Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The swap cycle you're looking for doesn't exist
        </p>
        <Button onClick={() => setLocation("/swap-cycles")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Swap Cycles
        </Button>
      </div>
    );
  }

  const { cycle, userId } = data;
  const currentUserParticipant = cycle.participants.find(
    (p) => p.userId === userId
  );

  return (
    <div className="container px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/swap-cycles")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Swap Cycles
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {cycle.cycleType} Swap Cycle
            </h1>
            <p className="text-muted-foreground mt-2">
              Track your multi-way book exchange
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Progress */}
          <CycleProgress
            status={cycle.status}
            confirmedParticipantsCount={cycle.confirmedParticipantsCount}
            totalParticipantsCount={cycle.totalParticipantsCount}
            confirmationDeadline={cycle.confirmationDeadline}
            completionDeadline={cycle.completionDeadline}
            confirmedAt={cycle.confirmedAt}
            completedAt={cycle.completedAt}
            cancelledAt={cycle.cancelledAt}
          />

          {/* Drop Off/Collection Tracking */}
          {currentUserParticipant &&
            (cycle.status === "active" || cycle.status === "confirmed") && (
              <DropOffTracking
                cycleId={cycle.id}
                participantId={currentUserParticipant.id}
                bookDroppedOff={currentUserParticipant.bookDroppedOff}
                bookCollected={currentUserParticipant.bookCollected}
                dropOffPhotoUrl={currentUserParticipant.dropOffPhotoUrl}
                collectionPhotoUrl={currentUserParticipant.collectionPhotoUrl}
                collectionQrCode={currentUserParticipant.collectionQrCode}
                dropPointName={cycle.dropPoint?.name || null}
                dropPointAddress={cycle.dropPoint?.address || null}
                onSuccess={refetch}
              />
            )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Cycle Details */}
          <CycleConfirmationFlow cycle={cycle} currentUserId={userId} />

          {/* Communication Card */}
          {cycle.status !== "cancelled" && cycle.status !== "timeout" && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold mb-1">Need to Communicate?</h3>
                    <p className="text-sm text-muted-foreground">
                      Use the group chat to coordinate with other participants
                    </p>
                  </div>
                  <Button className="w-full" variant="outline" disabled>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Group Chat (Coming Soon)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
