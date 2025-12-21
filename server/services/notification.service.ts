import { db } from "../db";
import { notifications } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedSwapRequestId?: number;
  relatedBookListingId?: number;
  relatedOrderId?: number;
  actionUrl?: string;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationInput): Promise<{
    success: boolean;
    notificationId?: number;
    message?: string;
  }> {
    try {
      const [result] = await db.insert(notifications).values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        relatedSwapRequestId: data.relatedSwapRequestId || null,
        relatedBookListingId: data.relatedBookListingId || null,
        relatedOrderId: data.relatedOrderId || null,
        actionUrl: data.actionUrl || null,
        isRead: false,
      });

      console.log(`[NotificationService] Created notification for user ${data.userId}: ${data.title}`);

      return {
        success: true,
        notificationId: result.insertId,
      };
    } catch (error) {
      console.error("[NotificationService] Create notification error:", error);
      return {
        success: false,
        message: "Failed to create notification",
      };
    }
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<{
    success: boolean;
    notifications: any[];
    unreadCount: number;
    message?: string;
  }> {
    try {
      // Get notifications
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      // Get unread count
      const unreadResult = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      return {
        success: true,
        notifications: userNotifications,
        unreadCount: unreadResult.length,
      };
    } catch (error) {
      console.error("[NotificationService] Get user notifications error:", error);
      return {
        success: false,
        notifications: [],
        unreadCount: 0,
        message: "Failed to fetch notifications",
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number, userId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );

      return {
        success: true,
      };
    } catch (error) {
      console.error("[NotificationService] Mark as read error:", error);
      return {
        success: false,
        message: "Failed to mark notification as read",
      };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      return {
        success: true,
      };
    } catch (error) {
      console.error("[NotificationService] Mark all as read error:", error);
      return {
        success: false,
        message: "Failed to mark all notifications as read",
      };
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: number, userId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );

      return {
        success: true,
      };
    } catch (error) {
      console.error("[NotificationService] Delete notification error:", error);
      return {
        success: false,
        message: "Failed to delete notification",
      };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      return result.length;
    } catch (error) {
      console.error("[NotificationService] Get unread count error:", error);
      return 0;
    }
  }
}

export const notificationService = new NotificationService();
