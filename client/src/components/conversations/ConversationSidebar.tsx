import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ConversationSidebarProps {
  conversations: Conversation[];
  selectedConversationId: number | null;
  onSelectConversation: (id: number) => void;
  currentUserId: string;
}

export default function ConversationSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  currentUserId,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getOtherParty = (conversation: Conversation) => {
    if (!conversation?.swapOrder?.requester || !conversation?.swapOrder?.owner) {
      return null;
    }
    return conversation.swapOrder.requester.id === currentUserId
      ? conversation.swapOrder.owner
      : conversation.swapOrder.requester;
  };

  const getBookTitle = (conversation: Conversation) => {
    if (!conversation?.swapOrder?.requester || !conversation?.swapOrder?.requestedBook) {
      return "";
    }
    const isRequester = conversation.swapOrder.requester.id === currentUserId;
    return isRequester
      ? conversation.swapOrder.requestedBook.title
      : conversation.swapOrder.offeredBook?.title || "";
  };

  const filteredConversations = conversations.filter((conv) => {
    // Validate conversation data
    if (!conv?.swapOrder) return false;

    const otherParty = getOtherParty(conv);
    if (!otherParty) return false;

    const bookTitle = getBookTitle(conv);

    const matchesSearch =
      otherParty.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.swapOrder.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeTab) {
      case "unread":
        return conv.unreadCount > 0;
      case "active":
        return conv.swapOrder.status === "in_progress" ||
               conv.swapOrder.status === "requirements_gathering" ||
               conv.swapOrder.status === "awaiting_payment";
      case "completed":
        return conv.swapOrder.status === "completed";
      case "all":
      default:
        return true;
    }
  });

  const unreadCount = conversations.filter(c => c.unreadCount > 0).length;

  return (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div>
          <h2 className="text-xl font-bold">Messages</h2>
          <p className="text-xs text-muted-foreground">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs relative">
              Unread
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No conversations found" : "No messages yet"}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const otherParty = getOtherParty(conversation);
              if (!otherParty) return null; // Skip if no valid party data

              const bookTitle = getBookTitle(conversation);
              const isSelected = conversation.swapOrder.id === selectedConversationId;
              const hasUnread = conversation.unreadCount > 0;
              const lastMessage = conversation.lastMessage;
              const isLastMessageFromMe = lastMessage?.senderId === currentUserId;

              return (
                <div
                  key={conversation.swapOrder.id}
                  onClick={() => onSelectConversation(conversation.swapOrder.id)}
                  className={cn(
                    "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                    isSelected && "bg-muted border-l-4 border-l-primary",
                    hasUnread && !isSelected && "bg-blue-50/30 dark:bg-blue-950/10"
                  )}
                >
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={otherParty.profilePictureUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {otherParty.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {hasUnread && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-background" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={cn(
                          "font-semibold text-sm truncate",
                          hasUnread && "text-foreground"
                        )}>
                          {otherParty.fullName}
                        </h3>
                        {lastMessage && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatTimeAgo(lastMessage.createdAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground truncate mb-1">
                        {bookTitle}
                      </p>

                      {lastMessage && (
                        <div className="flex items-center gap-1">
                          {!lastMessage.isSystemMessage && isLastMessageFromMe && (
                            <CheckCheck className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                          <p className={cn(
                            "text-xs truncate",
                            hasUnread ? "font-semibold text-foreground" : "text-muted-foreground",
                            lastMessage.isSystemMessage && "italic"
                          )}>
                            {lastMessage.isSystemMessage && "🤖 "}
                            {lastMessage.content}
                          </p>
                        </div>
                      )}

                      {hasUnread && (
                        <Badge
                          variant="default"
                          className="mt-1.5 h-5 px-2 text-[10px] font-semibold"
                        >
                          {conversation.unreadCount} new
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
