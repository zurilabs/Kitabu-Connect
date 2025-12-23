import { db } from "../db";
import {
  messages,
  swapOrders,
  users,
  bookListings,
  type SendMessageInput,
} from "../db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { notificationService } from "./notification.service";

export class MessageService {
  /**
   * Send a message in a swap order
   */
  async sendMessage(
    senderId: string,
    data: SendMessageInput
  ): Promise<{
    success: boolean;
    message?: any;
    error?: string;
  }> {
    try {
      // Verify the swap order exists and user is part of it
      const [swapOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, data.swapOrderId))
        .limit(1);

      if (!swapOrder) {
        return {
          success: false,
          error: "Swap order not found",
        };
      }

      // Verify user is part of this swap
      if (
        swapOrder.requesterId !== senderId &&
        swapOrder.ownerId !== senderId
      ) {
        return {
          success: false,
          error: "You are not authorized to send messages in this order",
        };
      }

      // Determine receiver
      const receiverId =
        swapOrder.requesterId === senderId
          ? swapOrder.ownerId
          : swapOrder.requesterId;

      // Create the message
      const [result] = await db.insert(messages).values({
        swapOrderId: data.swapOrderId,
        senderId,
        receiverId,
        content: data.content,
        messageType: data.messageType || "text",
        attachmentUrl: data.attachmentUrl || null,
        attachmentType: data.attachmentType || null,
        isSystemMessage: false,
      });

      const messageId = result.insertId;

      // Get sender info for notification
      const [sender] = await db
        .select()
        .from(users)
        .where(eq(users.id, senderId))
        .limit(1);

      // Send notification to receiver
      await notificationService.createNotification({
        userId: receiverId,
        type: "message",
        title: "New Message",
        message: `${sender.fullName || "Someone"} sent you a message: "${data.content.substring(0, 50)}${data.content.length > 50 ? "..." : ""}"`,
        relatedSwapRequestId: swapOrder.swapRequestId,
        actionUrl: `/orders/${swapOrder.id}/messages`,
      });

      // Fetch the complete message
      const [newMessage] = await db
        .select({
          message: messages,
          sender: {
            id: users.id,
            fullName: users.fullName,
            profilePictureUrl: users.profilePictureUrl,
          },
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.id, messageId))
        .limit(1);

      return {
        success: true,
        message: newMessage,
      };
    } catch (error) {
      console.error("[MessageService] Send message error:", error);
      return {
        success: false,
        error: "Failed to send message",
      };
    }
  }

  /**
   * Send a system message (automated)
   */
  async sendSystemMessage(
    swapOrderId: number,
    content: string,
    messageType: string = "system",
    metadata?: any
  ): Promise<{
    success: boolean;
    message?: any;
  }> {
    try {
      const [swapOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, swapOrderId))
        .limit(1);

      if (!swapOrder) {
        return {
          success: false,
        };
      }

      // Create system message
      const [result] = await db.insert(messages).values({
        swapOrderId,
        senderId: swapOrder.ownerId, // Use owner as sender for system messages
        receiverId: swapOrder.requesterId,
        content,
        messageType,
        isSystemMessage: true,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });

      const messageId = result.insertId;

      const [newMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      return {
        success: true,
        message: newMessage,
      };
    } catch (error) {
      console.error("[MessageService] Send system message error:", error);
      return {
        success: false,
      };
    }
  }

  /**
   * Get all messages for a swap order
   */
  async getOrderMessages(
    swapOrderId: number,
    userId: string
  ): Promise<{
    success: boolean;
    messages?: any[];
    error?: string;
  }> {
    try {
      // Verify user is part of this swap
      const [swapOrder] = await db
        .select()
        .from(swapOrders)
        .where(eq(swapOrders.id, swapOrderId))
        .limit(1);

      if (!swapOrder) {
        return {
          success: false,
          error: "Swap order not found",
        };
      }

      if (
        swapOrder.requesterId !== userId &&
        swapOrder.ownerId !== userId
      ) {
        return {
          success: false,
          error: "You are not authorized to view messages in this order",
        };
      }

      // Fetch all messages
      const orderMessages = await db
        .select({
          message: messages,
          sender: {
            id: users.id,
            fullName: users.fullName,
            profilePictureUrl: users.profilePictureUrl,
          },
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.swapOrderId, swapOrderId))
        .orderBy(messages.createdAt);

      return {
        success: true,
        messages: orderMessages,
      };
    } catch (error) {
      console.error("[MessageService] Get order messages error:", error);
      return {
        success: false,
        error: "Failed to fetch messages",
      };
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    swapOrderId: number,
    userId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Mark all messages in this order where user is receiver as read
      await db
        .update(messages)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(messages.swapOrderId, swapOrderId),
            eq(messages.receiverId, userId),
            eq(messages.isRead, false)
          )
        );

      return {
        success: true,
      };
    } catch (error) {
      console.error("[MessageService] Mark messages as read error:", error);
      return {
        success: false,
        error: "Failed to mark messages as read",
      };
    }
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<{
    success: boolean;
    count?: number;
  }> {
    try {
      const unreadMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.receiverId, userId),
            eq(messages.isRead, false)
          )
        );

      return {
        success: true,
        count: unreadMessages.length,
      };
    } catch (error) {
      console.error("[MessageService] Get unread count error:", error);
      return {
        success: false,
        count: 0,
      };
    }
  }

  /**
   * Get all conversations (orders with messages) for a user
   */
  async getUserConversations(userId: string): Promise<{
    success: boolean;
    conversations?: any[];
  }> {
    try {
      // Get all swap orders where user is involved
      const userOrders = await db
        .select({
          swapOrder: swapOrders,
        })
        .from(swapOrders)
        .where(
          or(
            eq(swapOrders.requesterId, userId),
            eq(swapOrders.ownerId, userId)
          )
        )
        .orderBy(desc(swapOrders.updatedAt));

      // For each order, get the last message, unread count, and all related data
      const conversations = await Promise.all(
        userOrders.map(async ({ swapOrder }) => {
          // Get requester info
          const [requester] = await db
            .select({
              id: users.id,
              fullName: users.fullName,
              email: users.email,
              profilePictureUrl: users.profilePictureUrl,
            })
            .from(users)
            .where(eq(users.id, swapOrder.requesterId))
            .limit(1);

          // Get owner info
          const [owner] = await db
            .select({
              id: users.id,
              fullName: users.fullName,
              email: users.email,
              profilePictureUrl: users.profilePictureUrl,
            })
            .from(users)
            .where(eq(users.id, swapOrder.ownerId))
            .limit(1);

          // Get requested book info
          const [requestedBook] = await db
            .select({
              id: bookListings.id,
              title: bookListings.title,
              author: bookListings.author,
              condition: bookListings.condition,
              coverImageUrl: bookListings.primaryPhotoUrl,
            })
            .from(bookListings)
            .where(eq(bookListings.id, swapOrder.requestedListingId))
            .limit(1);

          // Get offered book info (if exists)
          let offeredBook = null;
          if (swapOrder.offeredListingId) {
            const [book] = await db
              .select({
                id: bookListings.id,
                title: bookListings.title,
                author: bookListings.author,
                condition: bookListings.condition,
                coverImageUrl: bookListings.primaryPhotoUrl,
              })
              .from(bookListings)
              .where(eq(bookListings.id, swapOrder.offeredListingId))
              .limit(1);
            offeredBook = book || null;
          }

          // Get last message with sender info
          const lastMessageResult = await db
            .select({
              content: messages.content,
              createdAt: messages.createdAt,
              isSystemMessage: messages.isSystemMessage,
              senderId: messages.senderId,
            })
            .from(messages)
            .where(eq(messages.swapOrderId, swapOrder.id))
            .orderBy(desc(messages.createdAt))
            .limit(1);

          const lastMessage = lastMessageResult[0] || null;

          // Get unread count
          const unreadMessages = await db
            .select()
            .from(messages)
            .where(
              and(
                eq(messages.swapOrderId, swapOrder.id),
                eq(messages.receiverId, userId),
                eq(messages.isRead, false)
              )
            );

          return {
            swapOrder: {
              id: swapOrder.id,
              orderNumber: swapOrder.orderNumber,
              status: swapOrder.status,
              createdAt: swapOrder.createdAt,
              requester,
              owner,
              requestedBook,
              offeredBook,
            },
            lastMessage,
            unreadCount: unreadMessages.length,
          };
        })
      );

      return {
        success: true,
        conversations,
      };
    } catch (error) {
      console.error("[MessageService] Get user conversations error:", error);
      return {
        success: false,
        conversations: [],
      };
    }
  }
}

export const messageService = new MessageService();
