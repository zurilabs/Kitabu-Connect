import { Router } from "express";
import { conversationService } from "../services/conversation.service";
import { authenticateToken } from "../middleware/auth.middleware";
import type { Request, Response } from "express";

const router = Router();

/**
 * GET /api/conversations
 * Get all conversations for the current user
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await conversationService.getUserConversations(userId);

    if (!result.success) {
      return res.status(500).json({ message: result.message });
    }

    return res.json({ conversations: result.conversations });
  } catch (error) {
    console.error("[Conversations API] Get conversations error:", error);
    return res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

/**
 * POST /api/conversations
 * Create or get a conversation with another user about a book
 */
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { otherUserId, bookListingId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ message: "Other user ID is required" });
    }

    if (otherUserId === userId) {
      return res.status(400).json({ message: "Cannot create conversation with yourself" });
    }

    const result = await conversationService.getOrCreateConversation({
      user1Id: userId,
      user2Id: otherUserId,
      bookListingId: bookListingId ? parseInt(bookListingId) : undefined,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({
      success: true,
      conversation: result.conversation,
    });
  } catch (error) {
    console.error("[Conversations API] Create conversation error:", error);
    return res.status(500).json({ message: "Failed to create conversation" });
  }
});

/**
 * GET /api/conversations/:id/messages
 * Get all messages in a conversation
 */
router.get("/:id/messages", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 50;

    if (isNaN(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const result = await conversationService.getConversationMessages(
      conversationId,
      userId,
      limit
    );

    if (!result.success) {
      return res.status(result.error === "Not authorized to view this conversation" ? 403 : 404)
        .json({ message: result.error });
    }

    return res.json({ messages: result.messages });
  } catch (error) {
    console.error("[Conversations API] Get messages error:", error);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
});

/**
 * POST /api/conversations/:id/messages
 * Send a message in a conversation
 */
router.post("/:id/messages", authenticateToken, async (req: Request, res: Response) => {
  try {
    const senderId = req.user!.id;
    const conversationId = parseInt(req.params.id);
    const { content, receiverId } = req.body;

    if (isNaN(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    if (!receiverId) {
      return res.status(400).json({ message: "Receiver ID is required" });
    }

    const result = await conversationService.sendMessage({
      conversationId,
      senderId,
      receiverId,
      content: content.trim(),
    });

    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }

    return res.status(201).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[Conversations API] Send message error:", error);
    return res.status(500).json({ message: "Failed to send message" });
  }
});

/**
 * POST /api/conversations/:id/mark-read
 * Mark all messages in a conversation as read
 */
router.post("/:id/mark-read", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = parseInt(req.params.id);

    if (isNaN(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const result = await conversationService.markAsRead(conversationId, userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[Conversations API] Mark as read error:", error);
    return res.status(500).json({ message: "Failed to mark messages as read" });
  }
});

export default router;
