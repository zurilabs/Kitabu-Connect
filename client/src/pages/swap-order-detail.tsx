import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Send,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  Book,
  User,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import RequirementsForm from "@/components/swap-orders/RequirementsForm";
import OrderTimeline from "@/components/swap-orders/OrderTimeline";
import DeliveryConfirmation from "@/components/swap-orders/DeliveryConfirmation";
import CommitmentFeePayment from "@/components/swap-orders/CommitmentFeePayment";

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
  requirementsSubmitted: boolean;
  requirementsApproved: boolean;
  commitmentFee?: string;
  requesterPaidFee: boolean;
  ownerPaidFee: boolean;
  requesterShipped?: boolean;
  ownerShipped?: boolean;
  meetupLocation?: string;
  meetupTime?: string;
  deliveryDeadline?: string;
  requesterReceivedBook: boolean;
  ownerReceivedBook: boolean;
  createdAt: string;
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

export default function SwapOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [swapOrder, setSwapOrder] = useState<SwapOrder | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showRequirementsForm, setShowRequirementsForm] = useState(false);
  const previousMessageCountRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchSwapOrder();
    fetchMessages();
    fetchCurrentUser();

    // Check for payment success and verify
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    const reference = urlParams.get("reference");

    if (paymentStatus === "success" && reference) {
      verifyPayment(reference);
      // Clean up URL
      window.history.replaceState({}, "", `/orders/${id}/messages`);
    }

    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    // Only scroll to bottom if there are new messages
    if (messages.length > previousMessageCountRef.current) {
      scrollToBottom();
    }
    previousMessageCountRef.current = messages.length;
  }, [messages]);

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch(
        `/api/swap-orders/${id}/pay-commitment-fee/verify/${reference}`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Payment verified successfully!");
        fetchSwapOrder();
        fetchMessages();
      } else {
        toast.error(data.message || "Payment verification failed");
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      toast.error("Failed to verify payment");
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.user.id);
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error);
    }
  };

  const fetchSwapOrder = async () => {
    try {
      const response = await fetch(`/api/swap-orders/${id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setSwapOrder(data.swapOrder);
      } else {
        toast.error("Failed to load swap order");
        setLocation("/swaps");
      }
    } catch (error) {
      toast.error("Failed to load swap order");
      setLocation("/swaps");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/swap-orders/${id}/messages`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);

        // Mark messages as read
        await fetch(`/api/swap-orders/${id}/messages/mark-read`, {
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
      const response = await fetch(`/api/swap-orders/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          swapOrderId: parseInt(id!),
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
      <div className="container mx-auto py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!swapOrder) {
    return null;
  }

  const isRequester = currentUserId === swapOrder.requesterId;
  const otherParty = isRequester ? swapOrder.owner : swapOrder.requester;

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/swaps")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Order {swapOrder.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Created {format(new Date(swapOrder.createdAt), "PPP")}
          </p>
        </div>
        <Badge className={cn("text-white", getStatusColor(swapOrder.status))}>
          {getStatusText(swapOrder.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Books & Details */}
        <div className="lg:col-span-3 space-y-4">
          {/* Books Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Books Being Swapped</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Requested Book */}
              <div className="flex gap-3">
                <div className="h-16 w-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                  {swapOrder.requestedBook.coverImageUrl ? (
                    <img
                      src={swapOrder.requestedBook.coverImageUrl}
                      alt={swapOrder.requestedBook.title}
                      className="h-full w-full object-cover rounded"
                    />
                  ) : (
                    <Book className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {swapOrder.requestedBook.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {swapOrder.requestedBook.author}
                  </p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {swapOrder.requestedBook.condition}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="bg-muted rounded-full p-2">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </div>
              </div>

              {/* Offered Book */}
              {swapOrder.offeredBook && (
                <div className="flex gap-3">
                  <div className="h-16 w-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    {swapOrder.offeredBook.coverImageUrl ? (
                      <img
                        src={swapOrder.offeredBook.coverImageUrl}
                        alt={swapOrder.offeredBook.title}
                        className="h-full w-full object-cover rounded"
                      />
                    ) : (
                      <Book className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {swapOrder.offeredBook.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {swapOrder.offeredBook.author}
                    </p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {swapOrder.offeredBook.condition}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Other Party Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {isRequester ? "Book Owner" : "Requester"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={otherParty.profilePictureUrl} />
                  <AvatarFallback>
                    {otherParty.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{otherParty.fullName}</p>
                  {otherParty.schoolName && (
                    <p className="text-xs text-muted-foreground">
                      {otherParty.schoolName}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meetup Details */}
          {swapOrder.requirementsSubmitted && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Meetup Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {swapOrder.meetupLocation && (
                  <div className="flex gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm">{swapOrder.meetupLocation}</p>
                    </div>
                  </div>
                )}
                {swapOrder.meetupTime && (
                  <div className="flex gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date & Time</p>
                      <p className="text-sm">
                        {format(new Date(swapOrder.meetupTime), "PPP p")}
                      </p>
                    </div>
                  </div>
                )}
                {swapOrder.deliveryDeadline && (
                  <div className="flex gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Deadline</p>
                      <p className="text-sm">
                        {format(new Date(swapOrder.deliveryDeadline), "PPP")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Requirements Form */}
          {isRequester &&
            swapOrder.status === "requirements_gathering" &&
            !swapOrder.requirementsSubmitted && (
              <RequirementsForm
                orderId={parseInt(id!)}
                onSuccess={() => {
                  fetchSwapOrder();
                  fetchMessages();
                  setShowRequirementsForm(false);
                }}
                open={showRequirementsForm}
                onOpenChange={setShowRequirementsForm}
              />
            )}
        </div>

        {/* Middle Column - Messages */}
        <div className="lg:col-span-6">
          <Card className="h-[calc(100vh-140px)] flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={otherParty.profilePictureUrl} />
                  <AvatarFallback>
                    {otherParty.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-base">
                    {otherParty.fullName}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Chat about your swap
                  </p>
                </div>
              </div>
            </CardHeader>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
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
                            {format(
                              new Date(msg.message.createdAt),
                              "p"
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.message.id}
                      className={cn(
                        "flex gap-2",
                        isOwnMessage ? "justify-end" : "justify-start"
                      )}
                    >
                      {!isOwnMessage && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={msg.sender.profilePictureUrl} />
                          <AvatarFallback className="text-xs">
                            {msg.sender.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "rounded-lg px-4 py-2 max-w-[70%]",
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.message.content}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            isOwnMessage
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {format(new Date(msg.message.createdAt), "p")}
                        </p>
                      </div>
                      {isOwnMessage && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={msg.sender.profilePictureUrl} />
                          <AvatarFallback className="text-xs">
                            {msg.sender.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            {swapOrder.status !== "completed" &&
              swapOrder.status !== "cancelled" && (
                <div className="border-t p-4">
                  <div className="flex gap-2">
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
                      className="self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              )}
          </Card>
        </div>

        {/* Right Column - Order Progress & Actions */}
        <div className="lg:col-span-3 space-y-4">
          {/* Order Timeline */}
          <OrderTimeline swapOrder={swapOrder} isRequester={isRequester} />

          {/* Commitment Fee Payment */}
          {(swapOrder.status === "awaiting_payment" || swapOrder.status === "in_progress") && (
            <CommitmentFeePayment
              swapOrderId={swapOrder.id}
              isRequester={isRequester}
              requesterPaidFee={swapOrder.requesterPaidFee}
              ownerPaidFee={swapOrder.ownerPaidFee}
              commitmentFee={swapOrder.commitmentFee || "50.00"}
            />
          )}

          {/* Actions */}
          {swapOrder.status !== "completed" && swapOrder.status !== "cancelled" && (
            <DeliveryConfirmation
              swapOrder={swapOrder}
              isRequester={isRequester}
              onSuccess={fetchSwapOrder}
            />
          )}
        </div>
      </div>
    </div>
  );
}
