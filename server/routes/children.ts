import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { childService } from "../services/child.service";
import {
  createChildSchema,
  updateChildSchema,
  reorderChildrenSchema,
} from "../db/schema/index.ts";
import { fromZodError } from "zod-validation-error";

const router = Router();

/**
 * GET /api/children
 * Get all children for the authenticated user
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await childService.getChildrenByParent(userId);

    if (!result.success) {
      return res.status(500).json({ message: "Failed to fetch children" });
    }

    return res.status(200).json({
      children: result.children.map((child, index) => ({
        ...child,
        displayName: childService.getChildDisplayName(child, index),
      })),
    });
  } catch (error: any) {
    console.error("Error fetching children:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
});

/**
 * GET /api/children/:id
 * Get a single child by ID
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const childId = parseInt(req.params.id);

    if (isNaN(childId)) {
      return res.status(400).json({ message: "Invalid child ID" });
    }

    const result = await childService.getChildById(childId, userId);

    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }

    return res.status(200).json({ child: result.child });
  } catch (error: any) {
    console.error("Error fetching child:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
});

/**
 * POST /api/children
 * Create a new child
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Validate request body
    const validation = createChildSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: fromZodError(validation.error).message,
      });
    }

    const result = await childService.createChild(userId, validation.data);

    if (!result.success) {
      return res.status(500).json({ message: "Failed to create child" });
    }

    return res.status(201).json({
      message: "Child created successfully",
      child: result.child,
    });
  } catch (error: any) {
    console.error("Error creating child:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
});

/**
 * PUT /api/children/:id
 * Update a child
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const childId = parseInt(req.params.id);

    if (isNaN(childId)) {
      return res.status(400).json({ message: "Invalid child ID" });
    }

    // Validate request body
    const validation = updateChildSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: fromZodError(validation.error).message,
      });
    }

    const result = await childService.updateChild(childId, userId, validation.data);

    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }

    return res.status(200).json({
      message: "Child updated successfully",
      child: result.child,
    });
  } catch (error: any) {
    console.error("Error updating child:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
});

/**
 * DELETE /api/children/:id
 * Delete a child
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const childId = parseInt(req.params.id);

    if (isNaN(childId)) {
      return res.status(400).json({ message: "Invalid child ID" });
    }

    const result = await childService.deleteChild(childId, userId);

    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }

    return res.status(200).json({ message: result.message });
  } catch (error: any) {
    console.error("Error deleting child:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
});

/**
 * POST /api/children/reorder
 * Reorder children (manual ordering)
 */
router.post("/reorder", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Validate request body
    const validation = reorderChildrenSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: fromZodError(validation.error).message,
      });
    }

    const result = await childService.reorderChildren(userId, validation.data.childrenOrder);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      message: "Children reordered successfully",
      children: result.children,
    });
  } catch (error: any) {
    console.error("Error reordering children:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
});

export default router;
