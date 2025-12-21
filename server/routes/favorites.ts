import { Router } from "express";
import { favoritesService } from "../services/favorites.service";
import { authenticateToken } from "../middleware/auth.middleware";
import type { Request, Response } from "express";

const router = Router();

/**
 * GET /api/favorites
 * Get all favorites for the authenticated user
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await favoritesService.getUserFavorites(userId, limit, offset);

    if (!result.success) {
      return res.status(500).json({ message: result.message });
    }

    return res.json({
      favorites: result.favorites,
      total: result.total,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error("[Favorites API] Get favorites error:", error);
    return res.status(500).json({ message: "Failed to get favorites" });
  }
});

/**
 * GET /api/favorites/ids
 * Get list of favorited book IDs for the authenticated user
 */
router.get("/ids", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const favoriteIds = await favoritesService.getUserFavoriteIds(userId);

    return res.json({ favoriteIds });
  } catch (error) {
    console.error("[Favorites API] Get favorite IDs error:", error);
    return res.status(500).json({ message: "Failed to get favorite IDs" });
  }
});

/**
 * GET /api/favorites/count
 * Get count of favorites for the authenticated user
 */
router.get("/count", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const count = await favoritesService.getFavoritesCount(userId);

    return res.json({ count });
  } catch (error) {
    console.error("[Favorites API] Get favorites count error:", error);
    return res.status(500).json({ message: "Failed to get favorites count" });
  }
});

/**
 * POST /api/favorites/:listingId
 * Add a book to favorites
 */
router.post("/:listingId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const listingId = parseInt(req.params.listingId);
    if (isNaN(listingId)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    const result = await favoritesService.addFavorite(userId, listingId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      message: result.message,
      favoriteId: result.favoriteId,
    });
  } catch (error) {
    console.error("[Favorites API] Add favorite error:", error);
    return res.status(500).json({ message: "Failed to add to favorites" });
  }
});

/**
 * DELETE /api/favorites/:listingId
 * Remove a book from favorites
 */
router.delete("/:listingId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const listingId = parseInt(req.params.listingId);
    if (isNaN(listingId)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    const result = await favoritesService.removeFavorite(userId, listingId);

    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }

    return res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[Favorites API] Remove favorite error:", error);
    return res.status(500).json({ message: "Failed to remove from favorites" });
  }
});

/**
 * PUT /api/favorites/:listingId/toggle
 * Toggle favorite status for a book
 */
router.put("/:listingId/toggle", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const listingId = parseInt(req.params.listingId);
    if (isNaN(listingId)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    const result = await favoritesService.toggleFavorite(userId, listingId);

    if (!result.success) {
      return res.status(500).json({ message: result.message });
    }

    return res.json({
      success: true,
      isFavorited: result.isFavorited,
      message: result.message,
    });
  } catch (error) {
    console.error("[Favorites API] Toggle favorite error:", error);
    return res.status(500).json({ message: "Failed to toggle favorite" });
  }
});

/**
 * GET /api/favorites/check/:listingId
 * Check if a book is favorited
 */
router.get("/check/:listingId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const listingId = parseInt(req.params.listingId);
    if (isNaN(listingId)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    const isFavorited = await favoritesService.isFavorited(userId, listingId);

    return res.json({ isFavorited });
  } catch (error) {
    console.error("[Favorites API] Check favorite error:", error);
    return res.status(500).json({ message: "Failed to check favorite status" });
  }
});

export default router;
