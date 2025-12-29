import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  ArrowLeftRight,
  ShoppingCart,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  AlertCircle,
  Package,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  relatedSwapRequestId: number | null;
  relatedBookListingId: number | null;
  relatedOrderId: number | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export default function Notifications() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  // Fetch notifications
  const { data: notificationData, isLoading } = useQuery<{
    notifications: Notification[];
    unreadCount: number;
  }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications?limit=100", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to mark as read");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all as read mutation
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/read-all", {
        method: "PUT",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Delete notification mutation
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }

    // Route to relevant page based on notification type
    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
    } else {
      // Fallback routing based on related entities
      if (notification.relatedSwapRequestId) {
        setLocation(`/swaps/${notification.relatedSwapRequestId}`);
      } else if (notification.relatedOrderId) {
        setLocation(`/orders/${notification.relatedOrderId}`);
      } else if (notification.relatedBookListingId) {
        setLocation(`/marketplace?book=${notification.relatedBookListingId}`);
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "swap_request":
      case "swap_accepted":
      case "swap_rejected":
      case "swap_completed":
      case "swap_cycle_found":
        return <ArrowLeftRight className="w-5 h-5 text-blue-600" />;
      case "order_created":
      case "order_confirmed":
      case "order_completed":
        return <ShoppingCart className="w-5 h-5 text-green-600" />;
      case "payment_received":
      case "payment_sent":
      case "escrow_hold":
      case "escrow_release":
        return <DollarSign className="w-5 h-5 text-yellow-600" />;
      case "book_sold":
      case "book_listed":
        return <Package className="w-5 h-5 text-purple-600" />;
      case "message":
        return <MessageSquare className="w-5 h-5 text-pink-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "swap_request":
      case "swap_accepted":
      case "swap_completed":
      case "swap_cycle_found":
        return "border-l-4 border-l-blue-500";
      case "swap_rejected":
        return "border-l-4 border-l-red-500";
      case "order_created":
      case "order_completed":
        return "border-l-4 border-l-green-500";
      case "payment_received":
      case "payment_sent":
        return "border-l-4 border-l-yellow-500";
      case "book_sold":
        return "border-l-4 border-l-purple-500";
      case "message":
        return "border-l-4 border-l-pink-500";
      default:
        return "border-l-4 border-l-gray-300";
    }
  };

  const notifications = notificationData?.notifications || [];
  const unreadCount = notificationData?.unreadCount || 0;

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const displayNotifications = activeTab === "all" ? notifications : unreadNotifications;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Stay updated with your activities on Kitabu Connect
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "unread")}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : displayNotifications.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-20 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">
                    {activeTab === "all" ? "No notifications yet" : "No unread notifications"}
                  </h3>
                  <p className="text-muted-foreground">
                    {activeTab === "all"
                      ? "You'll see notifications here when you have activity on your account"
                      : "All caught up! You've read all your notifications"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {displayNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      !notification.isRead
                        ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                        : "hover:bg-muted/50"
                    } ${getNotificationColor(notification.type)}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              {notification.title}
                              {!notification.isRead && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                              )}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification.mutate(notification.id);
                              }}
                              disabled={deleteNotification.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                          <CardDescription className="text-sm">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead.mutate(notification.id);
                          }}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Mark as read
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
