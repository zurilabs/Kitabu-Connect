import { Router } from "express";
import { swapRequestService } from "../services/swapRequest.service";
import { bookListingService } from "../services/bookListing.service";
import { authenticateToken } from "../middleware/auth.middleware";
import { createSwapRequestSchema, updateSwapRequestSchema } from "../db/schema";
import type { Request, Response } from "express";

const router = Router();

/**
 * GET /api/swaps/search-listings
 * Search for existing swap listings based on the book the user wants to offer
 * Query params: title, author, subject, classGrade, condition
 */
router.get("/search-listings", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, author, subject, classGrade, condition, schoolId } = req.query;

    const result = await bookListingService.searchSwapListings({
      title: title as string | undefined,
      author: author as string | undefined,
      subject: subject as string | undefined,
      classGrade: classGrade as string | undefined,
      condition: condition as string | undefined,
      schoolId: schoolId as string | undefined,
      excludeUserId: userId, // Don't show user's own listings
    });

    if (!result.success) {
      return res.status(500).json({ message: "Failed to search swap listings" });
    }

    return res.json({
      listings: result.listings,
      count: result.listings?.length || 0,
    });
  } catch (error) {
    console.error("[Swaps API] Search swap listings error:", error);
    return res.status(500).json({ message: "Failed to search swap listings" });
  }
});

/**
 * POST /api/swaps
 * Create a new swap request
 */
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate request body
    const validationResult = createSwapRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid swap request data",
        errors: validationResult.error.errors,
      });
    }

    const result = await swapRequestService.createSwapRequest(
      userId,
      validationResult.data
    );

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({
      message: result.message,
      swapRequest: result.swapRequest,
    });
  } catch (error) {
    console.error("[Swaps API] Create swap request error:", error);
    return res.status(500).json({ message: "Failed to create swap request" });
  }
});

/**
 * GET /api/swaps
 * Get user's swap requests (both incoming and outgoing)
 * Query params: type=incoming|outgoing (optional)
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const type = req.query.type as string | undefined;

    const result = await swapRequestService.getUserSwapRequests(userId);

    if (!result.success) {
      return res.status(500).json({ message: result.message });
    }

    // If type is specified, return only that type
    if (type === "incoming") {
      return res.json({ swapRequests: result.incoming });
    } else if (type === "outgoing") {
      return res.json({ swapRequests: result.outgoing });
    }

    // Otherwise return both
    return res.json({
      incoming: result.incoming,
      outgoing: result.outgoing,
    });
  } catch (error) {
    console.error("[Swaps API] Get swap requests error:", error);
    return res.status(500).json({ message: "Failed to get swap requests" });
  }
});

/**
 * GET /api/swaps/:id
 * Get a specific swap request by ID
 */
router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapRequestId = parseInt(req.params.id);

    if (isNaN(swapRequestId)) {
      return res.status(400).json({ message: "Invalid swap request ID" });
    }

    const result = await swapRequestService.getSwapRequestById(
      swapRequestId,
      userId
    );

    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }

    return res.json({ swapRequest: result.swapRequest });
  } catch (error) {
    console.error("[Swaps API] Get swap request error:", error);
    return res.status(500).json({ message: "Failed to get swap request" });
  }
});

/**
 * PUT /api/swaps/:id/accept
 * Accept a swap request
 */
router.put("/:id/accept", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapRequestId = parseInt(req.params.id);

    if (isNaN(swapRequestId)) {
      return res.status(400).json({ message: "Invalid swap request ID" });
    }

    const { meetupLocation, meetupTime } = req.body;

    const result = await swapRequestService.updateSwapRequest(
      swapRequestId,
      userId,
      {
        status: "accepted",
        meetupLocation,
        meetupTime: meetupTime ? new Date(meetupTime) : undefined,
      }
    );

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: result.message });
  } catch (error) {
    console.error("[Swaps API] Accept swap request error:", error);
    return res.status(500).json({ message: "Failed to accept swap request" });
  }
});

/**
 * PUT /api/swaps/:id/reject
 * Reject a swap request
 */
router.put("/:id/reject", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapRequestId = parseInt(req.params.id);

    if (isNaN(swapRequestId)) {
      return res.status(400).json({ message: "Invalid swap request ID" });
    }

    const result = await swapRequestService.updateSwapRequest(
      swapRequestId,
      userId,
      { status: "rejected" }
    );

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: result.message });
  } catch (error) {
    console.error("[Swaps API] Reject swap request error:", error);
    return res.status(500).json({ message: "Failed to reject swap request" });
  }
});

/**
 * PUT /api/swaps/:id/confirm
 * Confirm receipt of the swapped book
 */
router.put("/:id/confirm", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapRequestId = parseInt(req.params.id);

    if (isNaN(swapRequestId)) {
      return res.status(400).json({ message: "Invalid swap request ID" });
    }

    // Get the swap request to check who is confirming
    const swapResult = await swapRequestService.getSwapRequestById(
      swapRequestId,
      userId
    );

    if (!swapResult.success || !swapResult.swapRequest) {
      return res.status(404).json({ message: "Swap request not found" });
    }

    const swap = swapResult.swapRequest.swapRequest;
    const isRequester = swap.requesterId === userId;
    const isOwner = swap.ownerId === userId;

    if (!isRequester && !isOwner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update the appropriate confirmation field
    const updateData: any = {};
    if (isRequester) {
      updateData.requesterConfirmed = true;
    }
    if (isOwner) {
      updateData.ownerConfirmed = true;
    }

    // If both have confirmed, mark as completed
    const bothConfirmed =
      (isRequester && swap.ownerConfirmed) ||
      (isOwner && swap.requesterConfirmed) ||
      (swap.requesterConfirmed && swap.ownerConfirmed);

    if (bothConfirmed) {
      updateData.status = "completed";
    }

    const result = await swapRequestService.updateSwapRequest(
      swapRequestId,
      userId,
      updateData
    );

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      message: bothConfirmed
        ? "Swap completed successfully!"
        : "Receipt confirmed. Waiting for other party to confirm.",
    });
  } catch (error) {
    console.error("[Swaps API] Confirm swap error:", error);
    return res.status(500).json({ message: "Failed to confirm swap" });
  }
});

/**
 * DELETE /api/swaps/:id
 * Cancel a swap request (only requester can cancel)
 */
router.delete("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const swapRequestId = parseInt(req.params.id);

    if (isNaN(swapRequestId)) {
      return res.status(400).json({ message: "Invalid swap request ID" });
    }

    const result = await swapRequestService.cancelSwapRequest(
      swapRequestId,
      userId
    );

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: result.message });
  } catch (error) {
    console.error("[Swaps API] Cancel swap request error:", error);
    return res.status(500).json({ message: "Failed to cancel swap request" });
  }
});

export default router;
