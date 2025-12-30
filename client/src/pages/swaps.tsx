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

export default function SwapsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");

  // Fetch swap orders (includes both swaps and purchases)
  const { data: ordersData, isLoading } = useQuery<{ orders: SwapOrder[] }>({
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
  });

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

  const OrderCard = ({ orderData, type }: { orderData: SwapOrder; type: "incoming" | "outgoing" }) => {
    const isIncoming = type === "incoming";
    const isPurchase = orderData.orderType === "purchase";
    const otherPerson = orderData.otherParty;

    const handleCardClick = () => {
      // Don't navigate if order is rejected or cancelled
      if (orderData.status === "rejected" || orderData.status === "cancelled") {
        return;
      }
      // Navigate to order details page
      setLocation(`/orders/${orderData.id}/messages`);
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
                  {formatDistanceToNow(new Date(orderData.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {getStatusBadge(orderData.status)}
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
                <img
                  src={orderData.requestedBook.coverImageUrl || "/placeholder-book.png"}
                  alt={orderData.requestedBook.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  {isPurchase ? (isIncoming ? "Your Book" : "Purchasing") : (isIncoming ? "Your Book" : "You Want")}
                </p>
                <p className="font-semibold text-sm line-clamp-2">{orderData.requestedBook.title}</p>
                {isPurchase && orderData.totalAmount && (
                  <div className="mt-2">
                    <p className="text-lg font-bold text-primary">
                      KES {Number(orderData.totalAmount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Book: KES {Number(orderData.bookPrice).toLocaleString()} + Fee: KES {Number(orderData.convenienceFee).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          {isIncoming && orderData.status === "pending" && (
            <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  rejectOrder.mutate(orderData.id);
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
                  acceptOrder.mutate(orderData.id);
                }}
                disabled={acceptOrder.isPending}
              >
                <Check className="w-4 h-4 mr-2" />
                Accept
              </Button>
            </div>
          )}

          {orderData.status !== "pending" && orderData.status !== "rejected" && orderData.status !== "cancelled" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                setLocation(`/orders/${orderData.id}/messages`);
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

  const allOrders = ordersData?.orders || [];

  // Split orders into incoming (seller) and outgoing (buyer)
  const incomingOrders = allOrders.filter(o => o.ownerId === user?.id);
  const outgoingOrders = allOrders.filter(o => o.requesterId === user?.id);

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
            {incomingOrders.length > 0 && (
              <Badge variant="secondary">{incomingOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="gap-2">
            Buying/Requesting
            {outgoingOrders.length > 0 && (
              <Badge variant="secondary">{outgoingOrders.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-4">
          {incomingOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Incoming Orders</h3>
                <p className="text-sm text-muted-foreground">
                  When someone wants to buy or swap a book with you, it will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {incomingOrders.map((order) => (
                <OrderCard key={order.id} orderData={order} type="incoming" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-4">
          {outgoingOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Outgoing Orders</h3>
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
              {outgoingOrders.map((order) => (
                <OrderCard key={order.id} orderData={order} type="outgoing" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
