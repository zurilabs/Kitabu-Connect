import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageSquare, Package, Clock, ArrowRight } from "lucide-react";

interface Conversation {
  swapOrder: {
    id: number;
    orderNumber: string;
    status: string;
    createdAt: string;
    requester: {
      id: string;
      fullName: string;
      profilePictureUrl: string | null;
    };
    owner: {
      id: string;
      fullName: string;
      profilePictureUrl: string | null;
    };
    requestedBook: {
      title: string;
      author: string | null;
    };
    offeredBook: {
      title: string;
      author: string | null;
    };
  };
  lastMessage: {
    content: string;
    createdAt: string;
    isSystemMessage: boolean;
  } | null;
  unreadCount: number;
}

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetchConversations();
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/swap-orders/conversations/all", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        toast.error("Failed to load conversations");
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "delivered":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "disputed":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getOtherParty = (conversation: Conversation, userId: string) => {
    return conversation.swapOrder.requester.id === userId
      ? conversation.swapOrder.owner
      : conversation.swapOrder.requester;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Messages</h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground mt-1">
              Manage your swap conversations
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>{conversations.length} conversations</span>
          </div>
        </div>

        {conversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
              <p className="text-muted-foreground mb-4">
                When you accept or send swap requests, conversations will appear here.
              </p>
              <Button onClick={() => setLocation("/marketplace")}>
                Browse Books
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => {
              const currentUserId = conversation.swapOrder.requester.id; // This will be replaced with actual auth
              const otherParty = getOtherParty(conversation, currentUserId);
              const isRequester =
                conversation.swapOrder.requester.id === currentUserId;

              return (
                <Card
                  key={conversation.swapOrder.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() =>
                    setLocation(`/orders/${conversation.swapOrder.id}/messages`)
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {otherParty.profilePictureUrl ? (
                          <img
                            src={otherParty.profilePictureUrl}
                            alt={otherParty.fullName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-semibold text-primary">
                              {otherParty.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <h3 className="font-semibold text-base">
                              {otherParty.fullName}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Order #{conversation.swapOrder.orderNumber}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge
                              variant="secondary"
                              className={getStatusColor(
                                conversation.swapOrder.status
                              )}
                            >
                              {getStatusLabel(conversation.swapOrder.status)}
                            </Badge>
                            {conversation.unreadCount > 0 && (
                              <Badge
                                variant="destructive"
                                className="h-5 min-w-5 flex items-center justify-center px-1.5"
                              >
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground mb-2">
                          <span className="font-medium">
                            {isRequester ? "You want:" : "They want:"}
                          </span>{" "}
                          {conversation.swapOrder.requestedBook.title}
                          {conversation.swapOrder.requestedBook.author && (
                            <span className="text-xs">
                              {" "}
                              by {conversation.swapOrder.requestedBook.author}
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground mb-3">
                          <span className="font-medium">
                            {isRequester ? "You offer:" : "They offer:"}
                          </span>{" "}
                          {conversation.swapOrder.offeredBook.title}
                          {conversation.swapOrder.offeredBook.author && (
                            <span className="text-xs">
                              {" "}
                              by {conversation.swapOrder.offeredBook.author}
                            </span>
                          )}
                        </div>

                        {conversation.lastMessage && (
                          <>
                            <Separator className="mb-2" />
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`text-sm truncate ${
                                  conversation.lastMessage.isSystemMessage
                                    ? "italic text-muted-foreground"
                                    : conversation.unreadCount > 0
                                    ? "font-semibold text-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {conversation.lastMessage.isSystemMessage && (
                                  <span className="mr-1">🤖</span>
                                )}
                                {conversation.lastMessage.content}
                              </p>
                              <div className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {formatTimeAgo(
                                    conversation.lastMessage.createdAt
                                  )}
                                </span>
                                <ArrowRight className="h-4 w-4" />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
