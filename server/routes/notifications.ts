import { Router } from "express";
import { notificationService } from "../services/notification.service";
import { authenticateToken } from "../middleware/auth.middleware";
import type { Request, Response } from "express";

const router = Router();

/**
 * GET /api/notifications
 * Get all notifications for the authenticated user
 * Query params: limit, offset
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await notificationService.getUserNotifications(
      userId,
      limit,
      offset
    );

    if (!result.success) {
      return res.status(500).json({ message: result.message });
    }

    return res.json({
      notifications: result.notifications,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    console.error("[Notifications API] Get notifications error:", error);
    return res.status(500).json({ message: "Failed to get notifications" });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get("/unread-count", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const count = await notificationService.getUnreadCount(userId);

    return res.json({ count });
  } catch (error) {
    console.error("[Notifications API] Get unread count error:", error);
    return res.status(500).json({ message: "Failed to get unread count" });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put("/:id/read", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const result = await notificationService.markAsRead(notificationId, userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("[Notifications API] Mark as read error:", error);
    return res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the user
 */
router.put("/read-all", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await notificationService.markAllAsRead(userId);

    if (!result.success) {
      return res.status(500).json({ message: result.message });
    }

    return res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("[Notifications API] Mark all as read error:", error);
    return res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const result = await notificationService.deleteNotification(
      notificationId,
      userId
    );

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("[Notifications API] Delete notification error:", error);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
});

export default router;
