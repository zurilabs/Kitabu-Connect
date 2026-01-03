import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Send,
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Shield,
  FileText,
  Image as ImageIcon,
  ArrowUpCircle,
  Calendar,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  message: string;
  attachmentUrls: string[] | null;
  isAdminMessage: boolean;
  createdAt: Date;
  sender: {
    id: string;
    fullName: string;
    email: string;
    profilePictureUrl: string | null;
  };
}

interface Dispute {
  id: string;
  cycleId: string;
  reporterId: string;
  respondentId: string | null;
  disputeType: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  evidencePhotoUrls: string[] | null;
  respondentResponseDeadline: Date;
  resolutionDeadline: Date;
  disputeValue: string | null;
  resolution: string | null;
  resolutionType: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  adminNotes: string | null;
  mediatorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  reporter: {
    id: string;
    fullName: string;
    email: string;
    profilePictureUrl: string | null;
  };
  respondent: {
    id: string;
    fullName: string;
    email: string;
    profilePictureUrl: string | null;
  } | null;
}

interface DisputeDetailResponse {
  success: boolean;
  dispute: Dispute;
  messages: DisputeMessage[];
}

export default function DisputeDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [showRespondForm, setShowRespondForm] = useState(false);
  const [respondText, setRespondText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchDispute();
    fetchCurrentUser();

    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      fetchDispute();
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.user.id);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchDispute = async () => {
    try {
      const response = await fetch(`/api/disputes/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dispute");
      }

      const data: DisputeDetailResponse = await response.json();
      setDispute(data.dispute);
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error fetching dispute:", error);
      toast.error("Failed to load dispute details");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch(`/api/disputes/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: newMessage }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setNewMessage("");
      toast.success("Message sent");
      await fetchDispute();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleRespond = async () => {
    if (!respondText.trim()) {
      toast.error("Please enter a response");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/disputes/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ response: respondText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit response");
      }

      setRespondText("");
      setShowRespondForm(false);
      toast.success("Response submitted successfully");
      await fetchDispute();
    } catch (error: any) {
      console.error("Error submitting response:", error);
      toast.error(error.message || "Failed to submit response");
    } finally {
      setSending(false);
    }
  };

  const handleEscalate = async () => {
    try {
      const response = await fetch(`/api/disputes/${id}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: "User requested escalation" }),
      });

      if (!response.ok) {
        throw new Error("Failed to escalate dispute");
      }

      toast.success("Dispute escalated to admin review");
      await fetchDispute();
    } catch (error) {
      console.error("Error escalating dispute:", error);
      toast.error("Failed to escalate dispute");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "default",
      awaiting_response: "secondary",
      investigating: "outline",
      resolved: "default",
      closed: "secondary",
      escalated: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"} className="capitalize">
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      low: "secondary",
      medium: "default",
      high: "destructive",
      urgent: "destructive",
    };

    return (
      <Badge variant={variants[priority] || "default"} className="capitalize">
        {priority}
      </Badge>
    );
  };

  const getDisputeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      book_condition: "Book Condition",
      missing_book: "Missing Book",
      wrong_book: "Wrong Book",
      damage: "Damage",
      description_mismatch: "Description Mismatch",
      non_delivery: "Non-Delivery",
      other: "Other",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dispute...</p>
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Dispute not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isReporter = currentUserId === dispute.reporterId;
  const isRespondent = currentUserId === dispute.respondentId;
  const canRespond = isRespondent && dispute.status === "awaiting_response";
  const canEscalate = (isReporter || isRespondent) &&
    !["resolved", "closed", "escalated"].includes(dispute.status);

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/disputes")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Disputes
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              {dispute.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              {getStatusBadge(dispute.status)}
              {getPriorityBadge(dispute.priority)}
              <Badge variant="outline">{getDisputeTypeLabel(dispute.disputeType)}</Badge>
              <Badge variant="outline">
                {isReporter ? "Reporter" : isRespondent ? "Respondent" : "Observer"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispute Details */}
          <Card>
            <CardHeader>
              <CardTitle>Dispute Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{dispute.description}</p>
              </div>

              {dispute.evidencePhotoUrls && dispute.evidencePhotoUrls.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Evidence</p>
                  <div className="grid grid-cols-2 gap-2">
                    {dispute.evidencePhotoUrls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {dispute.resolution && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Resolution</p>
                  <p className="text-sm mb-2">{dispute.resolution}</p>
                  {dispute.resolutionType && (
                    <Badge variant="outline" className="capitalize">
                      {dispute.resolutionType.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Response Form */}
          {canRespond && (
            <Card>
              <CardHeader>
                <CardTitle>Submit Your Response</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="response">Your Response</Label>
                  <Textarea
                    id="response"
                    placeholder="Provide your side of the story with evidence..."
                    value={respondText}
                    onChange={(e) => setRespondText(e.target.value)}
                    rows={5}
                  />
                </div>
                <Button onClick={handleRespond} disabled={sending || !respondText.trim()}>
                  {sending ? "Submitting..." : "Submit Response"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Discussion</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No messages yet
                    </p>
                  ) : (
                    messages.map((msg) => {
                      const isCurrentUser = msg.senderId === currentUserId;
                      const isAdmin = msg.isAdminMessage;

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-3",
                            isCurrentUser && !isAdmin && "flex-row-reverse"
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={msg.sender.profilePictureUrl || undefined} />
                            <AvatarFallback>
                              {msg.sender.fullName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={cn(
                              "flex-1 space-y-1",
                              isCurrentUser && !isAdmin && "text-right"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{msg.sender.fullName}</p>
                              {isAdmin && (
                                <Badge variant="secondary" className="text-xs">
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <div
                              className={cn(
                                "inline-block max-w-[80%] rounded-lg px-4 py-2",
                                isAdmin
                                  ? "bg-blue-100 text-blue-900"
                                  : isCurrentUser
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              )}
                            >
                              <p className="text-sm">{msg.message}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <Separator className="my-4" />

              {/* Message Input */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  size="icon"
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Parties */}
          <Card>
            <CardHeader>
              <CardTitle>Parties Involved</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Reporter</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={dispute.reporter.profilePictureUrl || undefined} />
                    <AvatarFallback>
                      {dispute.reporter.fullName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{dispute.reporter.fullName}</p>
                    <p className="text-xs text-muted-foreground">{dispute.reporter.email}</p>
                  </div>
                </div>
              </div>

              {dispute.respondent && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Respondent</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={dispute.respondent.profilePictureUrl || undefined} />
                      <AvatarFallback>
                        {dispute.respondent.fullName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{dispute.respondent.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {dispute.respondent.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(dispute.createdAt), "MMM dd, yyyy HH:mm")}
                  </p>
                </div>
              </div>

              {dispute.status !== "resolved" && dispute.status !== "closed" && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Response Deadline</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(dispute.respondentResponseDeadline), "MMM dd, yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              )}

              {dispute.resolvedAt && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  <div>
                    <p className="font-medium">Resolved</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(dispute.resolvedAt), "MMM dd, yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {canEscalate && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleEscalate}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Escalate to Admin
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
