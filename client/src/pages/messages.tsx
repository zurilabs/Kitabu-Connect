import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useConversation } from "@/hooks/useConversation";
import { MessageCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { useConversations } = useConversation();
  const { data: conversationsData, isLoading } = useConversations();

  if (!user) {
    setLocation('/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  const conversations = conversationsData?.conversations || [];

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold mb-2">Messages</h1>
        <p className="text-muted-foreground">Chat with sellers and manage your book conversations</p>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-6 text-center">
              Start chatting with sellers by clicking "Chat with Seller" on any book listing
            </p>
            <Button onClick={() => setLocation('/marketplace')}>
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((item: any) => {
            const conv = item.conversation;
            const otherUser = item.otherUser;
            const bookListing = item.bookListing;

            // Determine unread count based on which user is viewing
            const isUser1 = conv.user1Id === user.id;
            const unreadCount = isUser1 ? conv.user1UnreadCount : conv.user2UnreadCount;

            return (
              <Card
                key={conv.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setLocation(`/conversations/${conv.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {otherUser?.fullName?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {otherUser?.fullName || otherUser?.email || 'Unknown User'}
                          </h3>
                          {bookListing && (
                            <p className="text-xs text-muted-foreground truncate">
                              About: {bookListing.title}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {conv.lastMessageAt && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                            </span>
                          )}
                          {unreadCount > 0 && (
                            <Badge variant="default" className="h-5 min-w-5 flex items-center justify-center px-1.5">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {conv.lastMessageContent && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessageSenderId === user.id ? 'You: ' : ''}
                          {conv.lastMessageContent}
                        </p>
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
  );
}
