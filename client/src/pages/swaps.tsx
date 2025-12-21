import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeftRight,
  Check,
  X,
  Loader2,
  MessageSquare,
  Calendar,
  MapPin,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SwapRequest {
  swapRequest: {
    id: number;
    requesterId: string;
    ownerId: string;
    requestedListingId: number;
    offeredBookTitle: string;
    offeredBookAuthor: string | null;
    offeredBookCondition: string;
    offeredBookDescription: string | null;
    offeredBookPhotoUrl: string | null;
    message: string | null;
    status: string;
    meetupLocation: string | null;
    meetupTime: string | null;
    createdAt: string;
  };
  requester?: {
    id: string;
    fullName: string;
    profilePictureUrl: string | null;
    schoolName: string | null;
  };
  owner?: {
    id: string;
    fullName: string;
    profilePictureUrl: string | null;
    schoolName: string | null;
  };
  requestedBook: {
    id: number;
    title: string;
    author: string;
    coverImageUrl: string | null;
  };
}

export default function SwapsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");

  // Fetch swap requests
  const { data: swapData, isLoading } = useQuery<{
    incoming: SwapRequest[];
    outgoing: SwapRequest[];
  }>({
    queryKey: ["swaps"],
    queryFn: async () => {
      const response = await fetch("/api/swaps", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch swap requests");
      }

      return response.json();
    },
  });

  // Accept swap mutation
  const acceptSwap = useMutation({
    mutationFn: async (swapId: number) => {
      const response = await fetch(`/api/swaps/${swapId}/accept`, {
        method: "PUT",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to accept swap");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swaps"] });
      toast({
        title: "Swap Accepted!",
        description: "You can now coordinate the exchange with the requester.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject swap mutation
  const rejectSwap = useMutation({
    mutationFn: async (swapId: number) => {
      const response = await fetch(`/api/swaps/${swapId}/reject`, {
        method: "PUT",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject swap");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swaps"] });
      toast({
        title: "Swap Declined",
        description: "The requester has been notified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cancel swap mutation
  const cancelSwap = useMutation({
    mutationFn: async (swapId: number) => {
      const response = await fetch(`/api/swaps/${swapId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to cancel swap");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swaps"] });
      toast({
        title: "Swap Cancelled",
        description: "Your swap request has been cancelled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      accepted: { label: "Accepted", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      rejected: { label: "Declined", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
      completed: { label: "Completed", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const SwapRequestCard = ({ swap, type }: { swap: SwapRequest; type: "incoming" | "outgoing" }) => {
    const otherPerson = type === "incoming" ? swap.requester : swap.owner;
    const isIncoming = type === "incoming";

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={otherPerson?.profilePictureUrl || undefined} />
                <AvatarFallback>
                  {otherPerson?.fullName?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{otherPerson?.fullName || "Unknown User"}</h3>
                <p className="text-sm text-muted-foreground">{otherPerson?.schoolName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(swap.swapRequest.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            {getStatusBadge(swap.swapRequest.status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Your Book */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {isIncoming ? "Your Book" : "You Want"}
              </p>
              <div className="flex gap-2">
                <div className="w-16 h-20 rounded overflow-hidden border bg-muted flex-shrink-0">
                  <img
                    src={swap.requestedBook.coverImageUrl || "/placeholder-book.png"}
                    alt={swap.requestedBook.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm line-clamp-2">{swap.requestedBook.title}</p>
                  <p className="text-xs text-muted-foreground">{swap.requestedBook.author}</p>
                </div>
              </div>
            </div>

            {/* Their Book */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {isIncoming ? "They Offer" : "You Offer"}
              </p>
              <div className="flex gap-2">
                {swap.swapRequest.offeredBookPhotoUrl && (
                  <div className="w-16 h-20 rounded overflow-hidden border bg-muted flex-shrink-0">
                    <img
                      src={swap.swapRequest.offeredBookPhotoUrl}
                      alt={swap.swapRequest.offeredBookTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm line-clamp-2">
                    {swap.swapRequest.offeredBookTitle}
                  </p>
                  {swap.swapRequest.offeredBookAuthor && (
                    <p className="text-xs text-muted-foreground">
                      {swap.swapRequest.offeredBookAuthor}
                    </p>
                  )}
                  <Badge variant="outline" className="text-xs mt-1">
                    {swap.swapRequest.offeredBookCondition}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {swap.swapRequest.message && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs font-semibold">Message:</p>
              </div>
              <p className="text-sm">{swap.swapRequest.message}</p>
            </div>
          )}

          {swap.swapRequest.status === "accepted" && swap.swapRequest.meetupLocation && (
            <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <MapPin className="w-4 h-4" />
                <p className="text-sm font-semibold">Meetup: {swap.swapRequest.meetupLocation}</p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0">
          {isIncoming && swap.swapRequest.status === "pending" && (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => rejectSwap.mutate(swap.swapRequest.id)}
                disabled={rejectSwap.isPending}
              >
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => acceptSwap.mutate(swap.swapRequest.id)}
                disabled={acceptSwap.isPending}
              >
                <Check className="w-4 h-4 mr-2" />
                Accept
              </Button>
            </div>
          )}

          {!isIncoming && swap.swapRequest.status === "pending" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => cancelSwap.mutate(swap.swapRequest.id)}
              disabled={cancelSwap.isPending}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Request
            </Button>
          )}

          {swap.swapRequest.status === "accepted" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation(`/swaps/${swap.swapRequest.id}`)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              View Details & Coordinate
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const incomingSwaps = swapData?.incoming || [];
  const outgoingSwaps = swapData?.outgoing || [];

  return (
    <div className="container px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="w-8 h-8 text-blue-600" />
          Book Swaps
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your book swap requests and exchanges
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="incoming" className="gap-2">
            Incoming
            {incomingSwaps.length > 0 && (
              <Badge variant="secondary">{incomingSwaps.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="gap-2">
            Outgoing
            {outgoingSwaps.length > 0 && (
              <Badge variant="secondary">{outgoingSwaps.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-4">
          {incomingSwaps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ArrowLeftRight className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Incoming Swap Requests</h3>
                <p className="text-sm text-muted-foreground">
                  When someone wants to swap a book with you, it will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {incomingSwaps.map((swap) => (
                <SwapRequestCard key={swap.swapRequest.id} swap={swap} type="incoming" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-4">
          {outgoingSwaps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ArrowLeftRight className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Outgoing Swap Requests</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Browse the marketplace to find books you'd like to swap for
                </p>
                <Button onClick={() => setLocation("/marketplace")}>
                  Browse Marketplace
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {outgoingSwaps.map((swap) => (
                <SwapRequestCard key={swap.swapRequest.id} swap={swap} type="outgoing" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
