/**
 * Quality Control Service
 *
 * Handles:
 * - Book condition verification
 * - Dispute management
 * - Photo verification
 * - Automated quality checks
 */

import { db } from "../db";
import {
  bookConditionReports,
  cycleDisputes,
  disputeMessages,
  cycleParticipants,
  swapCycles,
  users,
  userReliabilityScores,
  notifications,
} from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

/* ================================
   CONDITION REPORTS
================================ */

interface CreateConditionReportInput {
  cycleId: string;
  participantId: string;
  reporterId: string;
  reportType: "drop_off" | "collection";
  bookId: number;
  bookTitle: string;
  expectedCondition: string;
  actualCondition: string;
  hasMissingPages?: boolean;
  hasWaterDamage?: boolean;
  hasWriting?: boolean;
  hasTornPages?: boolean;
  coverCondition?: string;
  photoUrls?: string[];
  notes?: string;
  rating?: number;
}

export async function createConditionReport(
  input: CreateConditionReportInput
) {
  const conditionMatch =
    input.expectedCondition.toLowerCase() ===
    input.actualCondition.toLowerCase();

  const [report] = await db
    .insert(bookConditionReports)
    .values({
      cycleId: input.cycleId,
      participantId: input.participantId,
      reporterId: input.reporterId,
      reportType: input.reportType,
      bookId: input.bookId,
      bookTitle: input.bookTitle,
      expectedCondition: input.expectedCondition,
      actualCondition: input.actualCondition,
      conditionMatch,
      hasMissingPages: input.hasMissingPages || false,
      hasWaterDamage: input.hasWaterDamage || false,
      hasWriting: input.hasWriting || false,
      hasTornPages: input.hasTornPages || false,
      coverCondition: input.coverCondition,
      photoUrls: input.photoUrls ? JSON.stringify(input.photoUrls) : null,
      notes: input.notes,
      rating: input.rating,
    })
    .$returningId();

  // If condition doesn't match, update reliability score
  if (!conditionMatch) {
    await penalizeConditionMismatch(input.participantId);
  }

  // If rating is low (< 3 stars), flag for review
  if (input.rating && input.rating < 3) {
    await createAutoDispute({
      cycleId: input.cycleId,
      reporterId: input.reporterId,
      conditionReportId: report.id,
      disputeType: "book_condition",
      title: `Poor Book Condition: ${input.bookTitle}`,
      description: `Book received in ${input.actualCondition} condition (expected ${input.expectedCondition}). Rating: ${input.rating}/5 stars.`,
    });
  }

  console.log(
    `📝 Created ${input.reportType} condition report for cycle ${input.cycleId}`
  );

  return report;
}

export async function getConditionReports(cycleId: string) {
  const reports = await db
    .select()
    .from(bookConditionReports)
    .where(eq(bookConditionReports.cycleId, cycleId))
    .orderBy(desc(bookConditionReports.createdAt));

  return reports.map((r) => ({
    ...r,
    photoUrls: r.photoUrls ? JSON.parse(r.photoUrls) : [],
  }));
}

async function penalizeConditionMismatch(participantId: string) {
  // Get participant's user ID
  const [participant] = await db
    .select()
    .from(cycleParticipants)
    .where(eq(cycleParticipants.id, participantId))
    .limit(1);

  if (!participant) return;

  // Update reliability score
  const [score] = await db
    .select()
    .from(userReliabilityScores)
    .where(eq(userReliabilityScores.userId, participant.userId))
    .limit(1);

  if (score) {
    const currentScore = Number(score.reliabilityScore);
    const newScore = Math.max(0, currentScore - 3); // -3 points for condition mismatch

    await db
      .update(userReliabilityScores)
      .set({
        reliabilityScore: newScore.toFixed(2),
        penaltyPoints: (score.penaltyPoints || 0) + 3,
      })
      .where(eq(userReliabilityScores.userId, participant.userId));

    console.log(
      `⚠️ Penalized user ${participant.userId} for condition mismatch: ${currentScore} → ${newScore}`
    );
  }
}

/* ================================
   DISPUTES
================================ */

interface CreateDisputeInput {
  cycleId: string;
  reporterId: string;
  respondentId?: string;
  disputeType: string;
  title: string;
  description: string;
  evidencePhotoUrls?: string[];
  conditionReportId?: string;
}

async function createAutoDispute(input: CreateDisputeInput) {
  const [dispute] = await db
    .insert(cycleDisputes)
    .values({
      cycleId: input.cycleId,
      reporterId: input.reporterId,
      respondentId: input.respondentId,
      disputeType: input.disputeType,
      status: "open",
      priority: "medium",
      title: input.title,
      description: input.description,
      evidencePhotoUrls: input.evidencePhotoUrls
        ? JSON.stringify(input.evidencePhotoUrls)
        : null,
      conditionReportId: input.conditionReportId,
    })
    .$returningId();

  // Notify admin
  await db.insert(notifications).values({
    userId: input.reporterId,
    type: "dispute_created",
    title: "Dispute Created",
    message: `Your dispute "${input.title}" has been created and is under review.`,
    actionUrl: `/disputes/${dispute.id}`,
    isRead: false,
  });

  console.log(`🚨 Auto-created dispute for cycle ${input.cycleId}`);

  return dispute;
}

export async function createDispute(input: CreateDisputeInput) {
  const [dispute] = await db
    .insert(cycleDisputes)
    .values({
      cycleId: input.cycleId,
      reporterId: input.reporterId,
      respondentId: input.respondentId,
      disputeType: input.disputeType,
      status: "open",
      priority: "medium",
      title: input.title,
      description: input.description,
      evidencePhotoUrls: input.evidencePhotoUrls
        ? JSON.stringify(input.evidencePhotoUrls)
        : null,
      conditionReportId: input.conditionReportId,
    })
    .$returningId();

  // Notify respondent if specified
  if (input.respondentId) {
    await db.insert(notifications).values({
      userId: input.respondentId,
      type: "dispute_filed",
      title: "Dispute Filed Against You",
      message: `A dispute has been filed regarding: ${input.title}`,
      actionUrl: `/disputes/${dispute.id}`,
      isRead: false,
    });
  }

  console.log(`🚨 Created dispute ${dispute.id} for cycle ${input.cycleId}`);

  return dispute;
}

export async function getDispute(disputeId: string) {
  const [dispute] = await db
    .select()
    .from(cycleDisputes)
    .where(eq(cycleDisputes.id, disputeId))
    .limit(1);

  if (!dispute) return null;

  // Get messages
  const messages = await db
    .select({
      message: disputeMessages,
      sender: users,
    })
    .from(disputeMessages)
    .innerJoin(users, eq(disputeMessages.senderId, users.id))
    .where(eq(disputeMessages.disputeId, disputeId))
    .orderBy(disputeMessages.createdAt);

  return {
    ...dispute,
    evidencePhotoUrls: dispute.evidencePhotoUrls
      ? JSON.parse(dispute.evidencePhotoUrls)
      : [],
    messages: messages.map((m) => ({
      ...m.message,
      attachmentUrls: m.message.attachmentUrls
        ? JSON.parse(m.message.attachmentUrls)
        : [],
      senderName: m.sender.fullName,
      senderPhoto: m.sender.profilePictureUrl,
    })),
  };
}

export async function getUserDisputes(userId: string) {
  const disputes = await db
    .select({
      dispute: cycleDisputes,
      cycle: swapCycles,
    })
    .from(cycleDisputes)
    .innerJoin(swapCycles, eq(cycleDisputes.cycleId, swapCycles.id))
    .where(
      and(
        eq(cycleDisputes.reporterId, userId),
        eq(cycleDisputes.status, "open")
      )
    )
    .orderBy(desc(cycleDisputes.createdAt));

  return disputes;
}

export async function addDisputeMessage(
  disputeId: string,
  senderId: string,
  message: string,
  attachmentUrls?: string[]
) {
  await db.insert(disputeMessages).values({
    disputeId,
    senderId,
    message,
    isAdminMessage: false,
    attachmentUrls: attachmentUrls ? JSON.stringify(attachmentUrls) : null,
  });

  // Update dispute timestamp
  await db
    .update(cycleDisputes)
    .set({ updatedAt: new Date() })
    .where(eq(cycleDisputes.id, disputeId));
}

export async function resolveDispute(
  disputeId: string,
  resolvedBy: string,
  resolutionType: string,
  resolution: string
) {
  await db
    .update(cycleDisputes)
    .set({
      status: "resolved",
      resolutionType,
      resolution,
      resolvedBy,
      resolvedAt: new Date(),
    })
    .where(eq(cycleDisputes.id, disputeId));

  // Get dispute details to notify reporter
  const [dispute] = await db
    .select()
    .from(cycleDisputes)
    .where(eq(cycleDisputes.id, disputeId))
    .limit(1);

  if (dispute) {
    await db.insert(notifications).values({
      userId: dispute.reporterId,
      type: "dispute_resolved",
      title: "Dispute Resolved",
      message: `Your dispute has been resolved: ${resolutionType}`,
      actionUrl: `/disputes/${disputeId}`,
      isRead: false,
    });
  }

  console.log(`✅ Resolved dispute ${disputeId}: ${resolutionType}`);
}

/* ================================
   PHOTO VERIFICATION
================================ */

export async function verifyDropOffPhotos(
  participantId: string,
  photoUrls: string[]
): Promise<{ verified: boolean; issues: string[] }> {
  const issues: string[] = [];

  // Basic validation
  if (!photoUrls || photoUrls.length === 0) {
    issues.push("No photos provided");
    return { verified: false, issues };
  }

  // Minimum 2 photos recommended (cover + condition)
  if (photoUrls.length < 2) {
    issues.push(
      "Please provide at least 2 photos showing book cover and condition"
    );
  }

  // TODO: Integrate with image analysis service (e.g., Google Vision API)
  // to detect:
  // - Book presence in image
  // - Image quality (blur, lighting)
  // - Potential damage indicators

  const verified = issues.length === 0;

  console.log(
    `📸 Photo verification for participant ${participantId}: ${verified ? "✅ Passed" : "❌ Failed"}`
  );

  return { verified, issues };
}

export async function analyzeBookCondition(
  photoUrls: string[]
): Promise<{ condition: string; confidence: number; details: any }> {
  // TODO: Implement AI-based condition analysis
  // For now, return placeholder

  return {
    condition: "good",
    confidence: 0.85,
    details: {
      cover: "intact",
      pages: "clean",
      binding: "solid",
    },
  };
}

/* ================================
   AUTOMATED QUALITY CHECKS
================================ */

export async function runQualityChecks(cycleId: string) {
  console.log(`🔍 Running quality checks for cycle ${cycleId}`);

  // Get all participants
  const participants = await db
    .select()
    .from(cycleParticipants)
    .where(eq(cycleParticipants.cycleId, cycleId));

  const issues: string[] = [];

  for (const participant of participants) {
    // Check if drop-off photo exists
    if (participant.bookDroppedOff && !participant.dropOffPhotoUrl) {
      issues.push(
        `Participant ${participant.userId} marked drop-off but no photo`
      );
    }

    // Check if collection photo exists
    if (participant.bookCollected && !participant.collectionPhotoUrl) {
      issues.push(
        `Participant ${participant.userId} marked collection but no photo`
      );
    }
  }

  if (issues.length > 0) {
    console.log(`⚠️ Quality check issues found:`, issues);
  } else {
    console.log(`✅ All quality checks passed for cycle ${cycleId}`);
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
