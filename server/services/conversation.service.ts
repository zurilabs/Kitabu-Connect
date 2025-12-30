import { db } from "../db";
import { conversations, messages, users, bookListings } from "../db/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";

export class ConversationService {
  /**
   * Get or create a conversation between two users
   * Ensures user IDs are always stored in consistent order (smaller ID first)
   */
  async getOrCreateConversation(params: {
    user1Id: string;
    user2Id: string;
    bookListingId?: number;
  }): Promise<{
    success: boolean;
    conversation?: any;
    message?: string;
  }> {
    try {
      // Ensure consistent ordering (alphabetically)
      const [smallerId, largerId] = [params.user1Id, params.user2Id].sort();

      // Check if conversation already exists
      const [existing] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.user1Id, smallerId),
            eq(conversations.user2Id, largerId)
          )
        )
        .limit(1);

      if (existing) {
        return {
          success: true,
          conversation: existing,
        };
      }

      // Create new conversation
      const [result] = await db.insert(conversations).values({
        user1Id: smallerId,
        user2Id: largerId,
        bookListingId: params.bookListingId,
        user1UnreadCount: 0,
        user2UnreadCount: 0,
      });

      const [newConversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, result.insertId))
        .limit(1);

      return {
        success: true,
        conversation: newConversation,
      };
    } catch (error) {
      console.error("[ConversationService] Get or create conversation error:", error);
      return {
        success: false,
        message: "Failed to create conversation",
      };
    }
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<{
    success: boolean;
    conversations?: any[];
    message?: string;
  }> {
    try {
      const userConversations = await db
        .select({
          conversation: conversations,
          otherUser: users,
          bookListing: bookListings,
        })
        .from(conversations)
        .leftJoin(
          users,
          or(
            and(
              eq(conversations.user1Id, userId),
              eq(users.id, conversations.user2Id)
            ),
            and(
              eq(conversations.user2Id, userId),
              eq(users.id, conversations.user1Id)
            )
          )
        )
        .leftJoin(bookListings, eq(conversations.bookListingId, bookListings.id))
        .where(
          or(
            eq(conversations.user1Id, userId),
            eq(conversations.user2Id, userId)
          )
        )
        .orderBy(desc(conversations.lastMessageAt));

      return {
        success: true,
        conversations: userConversations,
      };
    } catch (error) {
      console.error("[ConversationService] Get user conversations error:", error);
      return {
        success: false,
        message: "Failed to fetch conversations",
      };
    }
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(params: {
    conversationId: number;
    senderId: string;
    receiverId: string;
    content: string;
  }): Promise<{
    success: boolean;
    message?: any;
    error?: string;
  }> {
    try {
      // Verify conversation exists and sender is a participant
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, params.conversationId))
        .limit(1);

      if (!conversation) {
        return {
          success: false,
          error: "Conversation not found",
        };
      }

      // Verify sender is part of conversation
      if (conversation.user1Id !== params.senderId && conversation.user2Id !== params.senderId) {
        return {
          success: false,
          error: "Not authorized to send messages in this conversation",
        };
      }

      // Insert message
      const [result] = await db.insert(messages).values({
        conversationId: params.conversationId,
        senderId: params.senderId,
        receiverId: params.receiverId,
        content: params.content,
        messageType: "text",
        isRead: false,
      });

      // Update conversation last message info and unread count
      const isUser1 = conversation.user1Id === params.senderId;
      const updateData: any = {
        lastMessageContent: params.content.substring(0, 200), // Truncate for preview
        lastMessageAt: new Date(),
        lastMessageSenderId: params.senderId,
      };

      // Increment unread count for receiver
      if (isUser1) {
        updateData.user2UnreadCount = sql`${conversations.user2UnreadCount} + 1`;
      } else {
        updateData.user1UnreadCount = sql`${conversations.user1UnreadCount} + 1`;
      }

      await db
        .update(conversations)
        .set(updateData)
        .where(eq(conversations.id, params.conversationId));

      // Fetch the created message
      const [newMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, result.insertId))
        .limit(1);

      return {
        success: true,
        message: newMessage,
      };
    } catch (error) {
      console.error("[ConversationService] Send message error:", error);
      return {
        success: false,
        error: "Failed to send message",
      };
    }
  }

  /**
   * Get messages in a conversation
   */
  async getConversationMessages(
    conversationId: number,
    userId: string,
    limit: number = 50
  ): Promise<{
    success: boolean;
    messages?: any[];
    error?: string;
  }> {
    try {
      // Verify user is part of conversation
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation) {
        return {
          success: false,
          error: "Conversation not found",
        };
      }

      if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
        return {
          success: false,
          error: "Not authorized to view this conversation",
        };
      }

      // Fetch messages
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

      return {
        success: true,
        messages: conversationMessages.reverse(), // Oldest first
      };
    } catch (error) {
      console.error("[ConversationService] Get messages error:", error);
      return {
        success: false,
        error: "Failed to fetch messages",
      };
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(
    conversationId: number,
    userId: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      // Verify conversation
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation) {
        return {
          success: false,
          message: "Conversation not found",
        };
      }

      // Mark all unread messages from the other user as read
      await db
        .update(messages)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.receiverId, userId),
            eq(messages.isRead, false)
          )
        );

      // Reset unread count for this user
      const isUser1 = conversation.user1Id === userId;
      await db
        .update(conversations)
        .set(isUser1 ? { user1UnreadCount: 0 } : { user2UnreadCount: 0 })
        .where(eq(conversations.id, conversationId));

      return {
        success: true,
        message: "Messages marked as read",
      };
    } catch (error) {
      console.error("[ConversationService] Mark as read error:", error);
      return {
        success: false,
        message: "Failed to mark messages as read",
      };
    }
  }
}

export const conversationService = new ConversationService();
