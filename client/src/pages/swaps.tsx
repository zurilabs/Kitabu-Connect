import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
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
  ShoppingCart,
  Package,
  BookOpen,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SwapOrder {
  id: number;
  orderNumber: string;
  orderType: string;
  requesterId: string;
  ownerId: string;
  status: string;
  bookPrice: string | null;
  convenienceFee: string | null;
  totalAmount: string | null;
  createdAt: string;
  updatedAt: string;
  otherParty: {
    id: string;
    fullName: string;
    profilePictureUrl: string | null;
  };
  requestedBook: {
    id: number;
    title: string;
    coverImageUrl: string | null;
  };
}

interface SwapRequest {
  swapRequest: {
    id: number;
    requesterId: string;
    ownerId: string;
    status: string;
    offeredBookTitle: string;
    offeredBookPhotoUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
  requester?: {
    id: string;
    fullName: string;
    profilePictureUrl: string | null;
  };
  owner?: {
    id: string;
    fullName: string;
    profilePictureUrl: string | null;
  };
  requestedBook: {
    id: number;
    title: string;
    coverImageUrl: string | null;
  };
  swapOrder: {
    id: number;
  } | null;
}

type SwapItem = SwapOrder | SwapRequest;

function isSwapOrder(item: SwapItem): item is SwapOrder {
  return 'orderNumber' in item;
}

function isSwapRequest(item: SwapItem): item is SwapRequest {
  return 'swapRequest' in item;
}

// Component to display book image with fallback
function BookImage({ src, alt }: { src: string | null; alt: string }) {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
        <BookOpen className="w-10 h-10 text-blue-400 dark:text-blue-300" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setImageError(true)}
    />
  );
}

export default function SwapsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");

  // Fetch swap requests
  const { data: swapRequestsData, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["swap-requests"],
    queryFn: async () => {
      const response = await fetch("/api/swaps", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch swap requests");
      }

      return response.json();
    },
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Fetch swap orders (includes both swaps and purchases)
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery<{ orders: SwapOrder[] }>({
    queryKey: ["swap-orders"],
    queryFn: async () => {
      const response = await fetch("/api/swap-orders", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      return response.json();
    },
    enabled: !!user, // Only fetch when user is authenticated
  });

  const isLoading = isLoadingRequests || isLoadingOrders;

  // Accept order mutation
  const acceptOrder = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await fetch(`/api/swap-orders/${orderId}/accept`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to accept order");
      }

      return response.json();
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ["swap-orders"] });
      toast({
        title: "Request Accepted!",
        description: "The buyer has been notified.",
      });
      setLocation(`/orders/${orderId}/messages`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject order mutation
  const rejectOrder = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await fetch(`/api/swap-orders/${orderId}/reject`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject order");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swap-orders"] });
      toast({
        title: "Request Declined",
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

  // Accept swap request mutation
  const acceptSwapRequest = useMutation({
    mutationFn: async (swapRequestId: number) => {
      const response = await fetch(`/api/swaps/${swapRequestId}/accept`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to accept swap request");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["swap-requests"] });
      queryClient.invalidateQueries({ queryKey: ["swap-orders"] });
      toast({
        title: "Swap Request Accepted!",
        description: "A swap order has been created.",
      });
      if (data.swapOrderId) {
        setLocation(`/orders/${data.swapOrderId}/messages`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject swap request mutation
  const rejectSwapRequest = useMutation({
    mutationFn: async (swapRequestId: number) => {
      const response = await fetch(`/api/swaps/${swapRequestId}/reject`, {
        method: "PUT",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject swap request");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swap-requests"] });
      toast({
        title: "Swap Request Declined",
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      awaiting_payment: { label: "Awaiting Payment", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
      requirements_gathering: { label: "Setup Required", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
      delivered: { label: "Delivered", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      completed: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      rejected: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
      cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const SwapItemCard = ({ item, type }: { item: SwapItem; type: "incoming" | "outgoing" }) => {
    const isIncoming = type === "incoming";

    // Check if this is a swap order or swap request
    if (isSwapOrder(item)) {
      // This is a swap order
      const isPurchase = item.orderType === "purchase";
      const otherPerson = item.otherParty;

      const handleCardClick = () => {
        // Don't navigate if order is rejected or cancelled
        if (item.status === "rejected" || item.status === "cancelled") {
          return;
        }
        // For incoming pending orders, don't navigate (user should accept/decline first)
        if (isIncoming && item.status === "pending") {
          return;
        }
        // Navigate to order details page
        setLocation(`/orders/${item.id}/messages`);
      };

      return (
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={handleCardClick}
        >
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {getStatusBadge(item.status)}
                <Badge variant={isPurchase ? "default" : "secondary"} className="text-xs">
                  {isPurchase ? (
                    <>
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Purchase
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="w-3 h-3 mr-1" />
                      Swap
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-20 h-28 rounded overflow-hidden border bg-muted flex-shrink-0">
                  <BookImage
                    src={item.requestedBook.coverImageUrl}
                    alt={item.requestedBook.title}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    {isPurchase ? (isIncoming ? "Your Book" : "Purchasing") : (isIncoming ? "Your Book" : "You Want")}
                  </p>
                  <p className="font-semibold text-sm line-clamp-2">{item.requestedBook.title}</p>
                  {isPurchase && item.totalAmount && (
                    <div className="mt-2">
                      <p className="text-lg font-bold text-primary">
                        KES {Number(item.totalAmount).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Book: KES {Number(item.bookPrice).toLocaleString()} + Fee: KES {Number(item.convenienceFee).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-0">
            {isIncoming && item.status === "pending" && (
              <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    rejectOrder.mutate(item.id);
                  }}
                  disabled={rejectOrder.isPending}
                >
                  <X className="w-4 h-4 mr-2" />
                  Decline
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    acceptOrder.mutate(item.id);
                  }}
                  disabled={acceptOrder.isPending}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Accept
                </Button>
              </div>
            )}

            {/* Show View Details for all non-rejected/cancelled orders, including pending outgoing */}
            {!(isIncoming && item.status === "pending") && item.status !== "rejected" && item.status !== "cancelled" && (
              <Button
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation(`/orders/${item.id}/messages`);
                }}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                View Details
              </Button>
            )}
          </CardFooter>
        </Card>
      );
    }

    // This is a swap request
    const swapReq = item.swapRequest;
    const otherPerson = isIncoming ? item.requester : item.owner;

    const handleCardClick = () => {
      // Don't navigate if swap request is rejected or cancelled
      if (swapReq.status === "rejected" || swapReq.status === "cancelled") {
        return;
      }
      // If there's a swap order created, navigate to it
      if (item.swapOrder?.id) {
        setLocation(`/orders/${item.swapOrder.id}/messages`);
      }
      // For pending swap requests without an order, clicking the card does nothing
      // (user needs to accept/decline first for incoming, or wait for outgoing)
    };

    return (
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleCardClick}
      >
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
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(swapReq.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {getStatusBadge(swapReq.status)}
              <Badge variant="secondary" className="text-xs">
                <ArrowLeftRight className="w-3 h-3 mr-1" />
                Swap Request
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* Requested book */}
            <div className="flex gap-3">
              <div className="w-20 h-28 rounded overflow-hidden border bg-muted flex-shrink-0">
                <BookImage
                  src={item.requestedBook.coverImageUrl}
                  alt={item.requestedBook.title}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  {isIncoming ? "Your Book" : "You Want"}
                </p>
                <p className="font-semibold text-sm line-clamp-2">{item.requestedBook.title}</p>
              </div>
            </div>

            {/* Offered book */}
            <div className="flex gap-3 pt-2 border-t">
              <div className="w-20 h-28 rounded overflow-hidden border bg-muted flex-shrink-0">
                <BookImage
                  src={swapReq.offeredBookPhotoUrl}
                  alt={swapReq.offeredBookTitle}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  {isIncoming ? "They Offer" : "You Offer"}
                </p>
                <p className="font-semibold text-sm line-clamp-2">{swapReq.offeredBookTitle}</p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          {isIncoming && swapReq.status === "pending" && (
            <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  rejectSwapRequest.mutate(swapReq.id);
                }}
                disabled={rejectSwapRequest.isPending}
              >
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={(e) => {
                  e.stopPropagation();
                  acceptSwapRequest.mutate(swapReq.id);
                }}
                disabled={acceptSwapRequest.isPending}
              >
                <Check className="w-4 h-4 mr-2" />
                Accept
              </Button>
            </div>
          )}

          {/* Show View Details button for swap requests that have an order created */}
          {item.swapOrder?.id && swapReq.status !== "rejected" && swapReq.status !== "cancelled" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                setLocation(`/orders/${item.swapOrder!.id}/messages`);
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              View Details
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

  // Combine swap requests and swap orders
  const allOrders = ordersData?.orders || [];
  const incomingRequests = swapRequestsData?.incoming || [];
  const outgoingRequests = swapRequestsData?.outgoing || [];

  // Split orders into incoming (seller) and outgoing (buyer)
  const incomingOrders = allOrders.filter(o => o.ownerId === user?.id);
  const outgoingOrders = allOrders.filter(o => o.requesterId === user?.id);

  // Combine requests and orders for each tab
  const allIncoming = [...incomingRequests, ...incomingOrders];
  const allOutgoing = [...outgoingRequests, ...outgoingOrders];

  return (
    <div className="container px-4 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="w-8 h-8 text-blue-600" />
          My Orders
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your book swaps and purchases
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="incoming" className="gap-2">
            Selling/Swapping
            {allIncoming.length > 0 && (
              <Badge variant="secondary">{allIncoming.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="gap-2">
            Buying/Requesting
            {allOutgoing.length > 0 && (
              <Badge variant="secondary">{allOutgoing.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-4">
          {allIncoming.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Incoming Requests</h3>
                <p className="text-sm text-muted-foreground">
                  When someone wants to buy or swap a book with you, it will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {allIncoming.map((item) => {
                const key = isSwapOrder(item) ? `order-${item.id}` : `request-${item.swapRequest.id}`;
                return <SwapItemCard key={key} item={item} type="incoming" />;
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-4">
          {allOutgoing.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Outgoing Requests</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Browse the marketplace to find books to buy or swap
                </p>
                <Button onClick={() => setLocation("/marketplace")}>
                  Browse Marketplace
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {allOutgoing.map((item) => {
                const key = isSwapOrder(item) ? `order-${item.id}` : `request-${item.swapRequest.id}`;
                return <SwapItemCard key={key} item={item} type="outgoing" />;
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
