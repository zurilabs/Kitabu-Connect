import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Send,
  ArrowLeft,
  Phone,
  MoreVertical,
  Package,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Message {
  message: {
    id: number;
    content: string;
    messageType: string;
    isSystemMessage: boolean;
    createdAt: string;
    isRead: boolean;
  };
  sender: {
    id: string;
    fullName: string;
    profilePictureUrl?: string;
  };
}

interface SwapOrder {
  id: number;
  orderNumber: string;
  status: string;
  requesterId: string;
  ownerId: string;
  meetupLocation?: string;
  meetupTime?: string;
  requester: {
    id: string;
    fullName: string;
    email: string;
    profilePictureUrl?: string;
    schoolName?: string;
    phoneNumber?: string;
  };
  owner: {
    id: string;
    fullName: string;
    email: string;
    profilePictureUrl?: string;
    schoolName?: string;
    phoneNumber?: string;
  };
  requestedBook: {
    id: number;
    title: string;
    author?: string;
    condition: string;
    coverImageUrl?: string;
  };
  offeredBook?: {
    id: number;
    title: string;
    author?: string;
    condition: string;
    coverImageUrl?: string;
  };
}

interface ChatWindowProps {
  conversationId: number;
  currentUserId: string;
  onBack?: () => void;
}

export default function ChatWindow({ conversationId, currentUserId, onBack }: ChatWindowProps) {
  const [, setLocation] = useLocation();
  const [swapOrder, setSwapOrder] = useState<SwapOrder | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (conversationId) {
      fetchSwapOrder();
      fetchMessages();

      // Poll for new messages every 3 seconds
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [conversationId]);

  useEffect(() => {
    if (messages.length > previousMessageCountRef.current) {
      scrollToBottom();
    }
    previousMessageCountRef.current = messages.length;
  }, [messages]);

  const fetchSwapOrder = async () => {
    try {
      const response = await fetch(`/api/swap-orders/${conversationId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setSwapOrder(data.swapOrder);
      }
    } catch (error) {
      console.error("Failed to fetch swap order:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/swap-orders/${conversationId}/messages`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);

        // Mark messages as read
        await fetch(`/api/swap-orders/${conversationId}/messages/mark-read`, {
          method: "POST",
          credentials: "include",
        });
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/swap-orders/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          swapOrderId: conversationId,
          content: newMessage.trim(),
          messageType: "text",
        }),
      });

      if (response.ok) {
        setNewMessage("");
        await fetchMessages();
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      requirements_gathering: "bg-yellow-500",
      in_progress: "bg-blue-500",
      delivered: "bg-purple-500",
      completed: "bg-green-500",
      cancelled: "bg-red-500",
      disputed: "bg-orange-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      requirements_gathering: "Requirements Gathering",
      in_progress: "In Progress",
      delivered: "Delivered",
      completed: "Completed",
      cancelled: "Cancelled",
      disputed: "Disputed",
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!swapOrder) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/10 p-8">
        <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
        <p className="text-sm text-muted-foreground text-center">
          Choose a conversation from the sidebar to view messages
        </p>
      </div>
    );
  }

  const isRequester = currentUserId === swapOrder.requesterId;
  const otherParty = isRequester ? swapOrder.owner : swapOrder.requester;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          <Avatar className="h-10 w-10">
            <AvatarImage src={otherParty.profilePictureUrl} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {otherParty.fullName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{otherParty.fullName}</h3>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Order #{swapOrder.orderNumber}</p>
              <Badge className={cn("text-white text-xs h-5", getStatusColor(swapOrder.status))}>
                {getStatusText(swapOrder.status)}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/orders/${conversationId}/messages`)}
              title="View full order details"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Info */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <Card className="flex-shrink-0">
            <CardContent className="p-2 flex items-center gap-2">
              <Package className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium truncate max-w-[150px]">
                {swapOrder.requestedBook.title}
              </span>
            </CardContent>
          </Card>
          {swapOrder.meetupLocation && (
            <Card className="flex-shrink-0">
              <CardContent className="p-2 flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs truncate max-w-[120px]">
                  {swapOrder.meetupLocation}
                </span>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 bg-muted/10">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((msg) => {
            const isOwnMessage = msg.sender.id === currentUserId;
            const isSystemMessage = msg.message.isSystemMessage;

            if (isSystemMessage) {
              return (
                <div key={msg.message.id} className="flex justify-center">
                  <div className="bg-muted rounded-lg px-4 py-2 text-center max-w-md">
                    <p className="text-xs text-muted-foreground">
                      {msg.message.content}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(msg.message.createdAt), "p")}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.message.id}
                className={cn(
                  "flex gap-2 items-end",
                  isOwnMessage ? "justify-end" : "justify-start"
                )}
              >
                {!isOwnMessage && (
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={msg.sender.profilePictureUrl} />
                    <AvatarFallback className="text-xs">
                      {msg.sender.fullName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2 max-w-[70%] break-words",
                    isOwnMessage
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-background border rounded-bl-sm"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {msg.message.content}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] mt-1 text-right",
                      isOwnMessage
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {format(new Date(msg.message.createdAt), "p")}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      {swapOrder.status !== "completed" && swapOrder.status !== "cancelled" && (
        <div className="border-t bg-background p-4">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={sending}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              size="icon"
              className="h-[60px] w-[60px] flex-shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}
