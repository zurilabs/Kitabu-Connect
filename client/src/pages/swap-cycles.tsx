import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Loader2,
  RefreshCw,
  Users,
  Sparkles,
  Info,
} from "lucide-react";
import CycleMatchCard from "@/components/cycles/CycleMatchCard";
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

interface UserCyclesResponse {
  cycles: SwapCycle[];
  userId: string;
}

export default function SwapCyclesPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "pending" | "active" | "completed"
  >("pending");

  // Fetch user's swap cycles
  const { data, isLoading, refetch } = useQuery<UserCyclesResponse>({
    queryKey: ["swap-cycles"],
    queryFn: async () => {
      const response = await fetch("/api/cycles", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch swap cycles");
      }

      return response.json();
    },
  });

  // Detect new cycles mutation
  const detectCycles = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/cycles/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          maxCycleSize: 5,
          topN: 50,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to detect swap cycles");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["swap-cycles"] });
      if (data.cyclesDetected > 0) {
        toast.success(
          `Found ${data.cyclesDetected} new swap match${
            data.cyclesDetected === 1 ? "" : "es"
          }!`
        );
      } else {
        toast.info("No new swap matches found at this time");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const cycles = data?.cycles || [];
  const userId = data?.userId || "";

  // Filter cycles by status
  const pendingCycles = cycles.filter(
    (c) => c.status === "pending_confirmation"
  );
  const activeCycles = cycles.filter(
    (c) => c.status === "confirmed" || c.status === "active"
  );
  const completedCycles = cycles.filter(
    (c) => c.status === "completed" || c.status === "cancelled" || c.status === "timeout"
  );

  const handleRefresh = () => {
    refetch();
  };

  const handleDetectCycles = () => {
    detectCycles.mutate();
  };

  if (isLoading) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="w-8 h-8 text-purple-600" />
              Multi-Way Swap Cycles
            </h1>
            <p className="text-muted-foreground mt-2">
              Discover smart book exchanges with multiple participants
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Find Matches
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Find Swap Matches</AlertDialogTitle>
                  <AlertDialogDescription>
                    Our algorithm will analyze your swap listings and find the best
                    multi-way exchange opportunities based on location, book
                    compatibility, and logistics costs.
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          The system prioritizes swaps within the same county and school
                          zone to minimize logistics costs. Same-school swaps are FREE!
                        </p>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDetectCycles}
                    disabled={detectCycles.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {detectCycles.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Find Matches
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
                How Multi-Way Swaps Work
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Instead of simple 1-to-1 swaps, our algorithm finds chains of 2-5
                people who can all exchange books. For example: You give your book
                to Person A, Person A gives to Person B, and Person B gives you the
                book you want. This dramatically increases your chances of finding
                matches!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="space-y-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pendingCycles.length > 0 && (
              <Badge variant="secondary">{pendingCycles.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            Active
            {activeCycles.length > 0 && (
              <Badge variant="secondary">{activeCycles.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            History
            {completedCycles.length > 0 && (
              <Badge variant="secondary">{completedCycles.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingCycles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Pending Swap Matches</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click "Find Matches" to discover new swap opportunities
                </p>
                <Button
                  onClick={handleDetectCycles}
                  disabled={detectCycles.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {detectCycles.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Find Matches
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingCycles.map((cycle) => (
                <CycleMatchCard
                  key={cycle.id}
                  cycle={cycle}
                  currentUserId={userId}
                  onConfirm={handleRefresh}
                  onCancel={handleRefresh}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Active Tab */}
        <TabsContent value="active" className="space-y-4">
          {activeCycles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ArrowLeftRight className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Active Swaps</h3>
                <p className="text-sm text-muted-foreground">
                  Confirmed swap cycles will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeCycles.map((cycle) => (
                <div key={cycle.id} className="cursor-pointer" onClick={() => setLocation(`/swap-cycles/${cycle.id}`)}>
                  <CycleMatchCard
                    cycle={cycle}
                    currentUserId={userId}
                    onConfirm={handleRefresh}
                    onCancel={handleRefresh}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="space-y-4">
          {completedCycles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ArrowLeftRight className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Swap History</h3>
                <p className="text-sm text-muted-foreground">
                  Completed and cancelled swaps will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completedCycles.map((cycle) => (
                <CycleMatchCard
                  key={cycle.id}
                  cycle={cycle}
                  currentUserId={userId}
                  onConfirm={handleRefresh}
                  onCancel={handleRefresh}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Link to Traditional Swaps */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Looking for 1-to-1 swaps?</p>
            <p className="text-xs text-muted-foreground mt-1">
              View your traditional book swap requests
            </p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/swaps")}>
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            View Swaps
          </Button>
        </div>
      </div>
    </div>
  );
}
