import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { wishlistService } from "../services/wishlist.service";
import {
  createWishlistItemSchema,
  updateWishlistItemSchema,
} from "../db/schema/index.ts";
import { fromZodError } from "zod-validation-error";
import type { Request, Response } from "express";

const router = Router();

/**
 * POST /api/wishlist
 * Create a new wishlist item for a child
 */
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate input
    const validationResult = createWishlistItemSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: fromZodError(validationResult.error).toString(),
      });
    }

    const result = await wishlistService.createWishlistItem(
      userId,
      validationResult.data
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Failed to create wishlist item",
      });
    }

    return res.status(201).json({
      success: true,
      wishlistItem: result.wishlistItem,
    });
  } catch (error: any) {
    console.error("Error creating wishlist item:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

/**
 * GET /api/wishlist
 * Get all wishlist items for the authenticated parent (across all children)
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const status = req.query.status as string | undefined;

    const result = await wishlistService.getWishlistByParentId(userId, status);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message || "Failed to fetch wishlist",
      });
    }

    return res.status(200).json({
      success: true,
      wishlistItems: result.wishlistItems,
    });
  } catch (error: any) {
    console.error("Error fetching wishlist:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

/**
 * GET /api/wishlist/child/:childId
 * Get all wishlist items for a specific child
 */
router.get("/child/:childId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const childId = parseInt(req.params.childId, 10);

    if (isNaN(childId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid child ID",
      });
    }

    const result = await wishlistService.getWishlistByChildId(childId, userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Failed to fetch wishlist",
      });
    }

    return res.status(200).json({
      success: true,
      wishlistItems: result.wishlistItems,
    });
  } catch (error: any) {
    console.error("Error fetching child wishlist:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

/**
 * GET /api/wishlist/:id
 * Get a specific wishlist item by ID
 */
router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const wishlistItemId = parseInt(req.params.id, 10);

    if (isNaN(wishlistItemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wishlist item ID",
      });
    }

    const wishlistItem = await wishlistService.getWishlistItemById(
      wishlistItemId,
      userId
    );

    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: "Wishlist item not found",
      });
    }

    return res.status(200).json({
      success: true,
      wishlistItem,
    });
  } catch (error: any) {
    console.error("Error fetching wishlist item:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

/**
 * PUT /api/wishlist/:id
 * Update a wishlist item
 */
router.put("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const wishlistItemId = parseInt(req.params.id, 10);

    if (isNaN(wishlistItemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wishlist item ID",
      });
    }

    // Validate input
    const validationResult = updateWishlistItemSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: fromZodError(validationResult.error).toString(),
      });
    }

    const result = await wishlistService.updateWishlistItem(
      wishlistItemId,
      userId,
      validationResult.data
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Failed to update wishlist item",
      });
    }

    return res.status(200).json({
      success: true,
      wishlistItem: result.wishlistItem,
    });
  } catch (error: any) {
    console.error("Error updating wishlist item:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

/**
 * DELETE /api/wishlist/:id
 * Delete a wishlist item
 */
router.delete("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const wishlistItemId = parseInt(req.params.id, 10);

    if (isNaN(wishlistItemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wishlist item ID",
      });
    }

    const result = await wishlistService.deleteWishlistItem(
      wishlistItemId,
      userId
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Failed to delete wishlist item",
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message || "Wishlist item deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting wishlist item:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

export default router;

