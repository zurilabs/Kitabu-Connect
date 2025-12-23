import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import ConversationSidebar from "@/components/conversations/ConversationSidebar";
import ChatWindow from "@/components/conversations/ChatWindow";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    senderId?: string;
  } | null;
  unreadCount: number;
}

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetchCurrentUser();
    fetchConversations();

    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-select first conversation on desktop
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId && window.innerWidth >= 1024) {
      // Find the first valid conversation with proper data structure
      const firstValidConversation = conversations.find(conv => conv?.swapOrder?.id);
      if (firstValidConversation) {
        setSelectedConversationId(firstValidConversation.swapOrder.id);
      }
    }
  }, [conversations, selectedConversationId]);

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

  const handleSelectConversation = (id: number) => {
    setSelectedConversationId(id);
    // On mobile, show the chat window
    if (window.innerWidth < 1024) {
      setShowMobileChat(true);
    }
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
          <p className="text-muted-foreground mb-6">
            When you accept or send swap requests, conversations will appear here.
          </p>
          <Button onClick={() => setLocation("/marketplace")}>
            Browse Books
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Mobile: Show either sidebar or chat */}
      <div className="lg:hidden w-full h-full">
        {showMobileChat && selectedConversationId ? (
          <ChatWindow
            conversationId={selectedConversationId}
            currentUserId={currentUserId}
            onBack={handleBackToList}
          />
        ) : (
          <ConversationSidebar
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            currentUserId={currentUserId}
          />
        )}
      </div>

      {/* Desktop: Show both sidebar and chat */}
      <div className="hidden lg:flex w-full h-full">
        {/* Sidebar */}
        <div className="w-[380px] flex-shrink-0 h-full">
          <ConversationSidebar
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            currentUserId={currentUserId}
          />
        </div>

        {/* Chat Window */}
        <div className="flex-1 h-full">
          {selectedConversationId ? (
            <ChatWindow
              conversationId={selectedConversationId}
              currentUserId={currentUserId}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-muted/10">
              <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-sm text-muted-foreground">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
