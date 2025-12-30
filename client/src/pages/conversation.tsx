import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Loader2, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConversation } from "@/hooks/useConversation";
import { useQuery } from "@tanstack/react-query";

export default function Conversation() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [messageContent, setMessageContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const previousMessageCountRef = useRef(0);

  const conversationId = id ? parseInt(id) : null;
  const { useConversationMessages, sendMessage, markAsRead } = useConversation();
  const { data: messagesData, isLoading } = useConversationMessages(conversationId);

  // Fetch conversation details to get the other user's ID
  const { data: conversationData } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      const response = await fetch("/api/conversations", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch conversations");
      const data = await response.json();
      return data.conversations?.find((c: any) => c.conversation?.id === conversationId);
    },
    enabled: !!conversationId,
  });

  // Check if user is at the bottom of messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShouldAutoScroll(isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom only when appropriate
  useEffect(() => {
    const messages = messagesData?.messages || [];
    const currentMessageCount = messages.length;
    const previousMessageCount = previousMessageCountRef.current;

    // Scroll to bottom on initial load or when user sends a message
    if (previousMessageCount === 0 || (shouldAutoScroll && currentMessageCount > previousMessageCount)) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    previousMessageCountRef.current = currentMessageCount;
  }, [messagesData, shouldAutoScroll]);

  // Mark messages as read when conversation loads
  useEffect(() => {
    if (conversationId && messagesData?.messages) {
      markAsRead.mutate(conversationId);
    }
  }, [conversationId, messagesData]);

  if (!user) {
    setLocation('/login');
    return null;
  }

  if (!conversationId) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Invalid conversation</p>
        <Button onClick={() => setLocation('/marketplace')} className="mt-4">
          Back to Marketplace
        </Button>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageContent.trim()) return;

    // Get the other user's ID from conversation data
    let otherUserId: string | undefined;

    if (conversationData?.conversation) {
      const conv = conversationData.conversation;
      otherUserId = conv.user1Id === user?.id ? conv.user2Id : conv.user1Id;
    } else if (messagesData?.messages?.length > 0) {
      // Fallback to getting from messages
      otherUserId = messagesData.messages[0].senderId === user?.id
        ? messagesData.messages[0].receiverId
        : messagesData.messages[0].senderId;
    }

    if (!otherUserId) {
      toast({
        title: "Error",
        description: "Unable to determine recipient. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendMessage.mutateAsync({
        conversationId: conversationId!,
        receiverId: otherUserId,
        content: messageContent.trim(),
      });
      setMessageContent("");
      // Force auto-scroll when user sends a message
      setShouldAutoScroll(true);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      // Error handled by mutation onError
    }
  };

  if (isLoading) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const messages = messagesData?.messages || [];

  // Get other user's name from conversation data
  const otherUser = conversationData?.otherUser;
  const otherUserName = otherUser?.fullName || otherUser?.email || "Seller";
  const bookListing = conversationData?.bookListing;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6 pl-0 hover:pl-2 transition-all"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="h-[calc(100vh-12rem)] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Avatar>
              <AvatarFallback>
                {otherUserName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span>{otherUserName}</span>
              {bookListing && (
                <span className="text-sm font-normal text-muted-foreground">
                  About: {bookListing.title}
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((message: any) => {
                const isOwnMessage = message.senderId === user.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              disabled={sendMessage.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!messageContent.trim() || sendMessage.isPending}
            >
              {sendMessage.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
