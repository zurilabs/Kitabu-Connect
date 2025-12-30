import { useConversation } from "@/hooks/useConversation";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export function UnreadMessagesIndicator() {
  const { user } = useAuth();
  const { useConversations } = useConversation();
  const { data: conversationsData } = useConversations();

  const conversations = conversationsData?.conversations || [];

  // Calculate total unread messages across all conversations
  const totalUnread = conversations.reduce((total: number, item: any) => {
    const conv = item.conversation;
    if (!conv || !user) return total;

    // Determine which user is the current user and get their unread count
    const isUser1 = conv.user1Id === user.id;
    const unreadCount = isUser1 ? conv.user1UnreadCount : conv.user2UnreadCount;

    return total + (unreadCount || 0);
  }, 0);

  if (totalUnread === 0) return null;

  return (
    <Badge
      variant="destructive"
      className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
    >
      {totalUnread > 99 ? '99+' : totalUnread}
    </Badge>
  );
}
