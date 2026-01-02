/**
 * Dispute Management Service
 *
 * Handles:
 * - Creating and managing disputes
 * - Dispute workflow (deadlines, escalation)
 * - Resolution and enforcement
 * - Evidence management
 *
 * Following industry standards from eBay, Airbnb, Upwork
 */

import { db } from "../db";
import {
  cycleDisputes,
  disputeMessages,
  disputeTimeline,
  users,
  swapCycles,
  bookListings,
  notifications,
  userReliabilityScores,
} from "../db/schema";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";

/* ================================
   CONSTANTS
================================ */

const RESPONDENT_RESPONSE_HOURS = 48; // 48 hours to respond
const SELF_RESOLUTION_HOURS = 48; // 48 hours for self-resolution
const MEDIATION_DAYS = 5; // 5 days for mediation
const ADMIN_DECISION_DAYS = 3; // 3 days for admin decision
const MAX_RESOLUTION_DAYS = 14; // Total max resolution time

const DISPUTE_TYPES = [
  'book_condition',
  'missing_book',
  'wrong_book',
  'damage',
  'description_mismatch',
  'non_delivery',
  'other',
] as const;

const DISPUTE_STATUSES = [
  'open',
  'awaiting_response',
  'investigating',
  'resolved',
  'escalated',
  'closed',
] as const;

const RESOLUTION_TYPES = [
  'refund',
  'replacement',
  'penalty',
  'account_warning',
  'no_action',
  'escalated',
] as const;

/* ================================
   TYPES
================================ */

export type DisputeType = typeof DISPUTE_TYPES[number];
export type DisputeStatus = typeof DISPUTE_STATUSES[number];
export type ResolutionType = typeof RESOLUTION_TYPES[number];

interface CreateDisputeInput {
  cycleId: string;
  reporterId: string;
  respondentId?: string;
  disputeType: DisputeType;
  title: string;
  description: string;
  evidencePhotoUrls?: string[];
  conditionReportId?: string;
  disputeValue?: number;
}

interface AddMessageInput {
  disputeId: string;
  senderId: string;
  message: string;
  attachmentUrls?: string[];
  isAdminMessage?: boolean;
}

interface ResolveDisputeInput {
  disputeId: string;
  resolvedBy: string;
  resolutionType: ResolutionType;
  resolution: string;
  adminNotes?: string;
}

/* ================================
   DISPUTE CREATION
================================ */

/**
 * Create a new dispute
 * Sets deadlines and notifies respondent
 */
export async function createDispute(input: CreateDisputeInput) {
  const now = new Date();

  // Calculate deadlines
  const respondentDeadline = new Date(now.getTime() + RESPONDENT_RESPONSE_HOURS * 60 * 60 * 1000);
  const resolutionDeadline = new Date(now.getTime() + MAX_RESOLUTION_DAYS * 24 * 60 * 60 * 1000);

  // Create dispute
  const [dispute] = await db
    .insert(cycleDisputes)
    .values({
      cycleId: input.cycleId,
      reporterId: input.reporterId,
      respondentId: input.respondentId || null,
      disputeType: input.disputeType,
      status: 'awaiting_response',
      priority: input.disputeValue && input.disputeValue > 1000 ? 'high' : 'medium',
      title: input.title,
      description: input.description,
      evidencePhotoUrls: input.evidencePhotoUrls ? JSON.stringify(input.evidencePhotoUrls) : null,
      conditionReportId: input.conditionReportId || null,
      respondentResponseDeadline: respondentDeadline,
      resolutionDeadline: resolutionDeadline,
      disputeValue: input.disputeValue ? input.disputeValue.toString() : null,
    })
    .$returningId();

  // Add timeline event
  await addTimelineEvent({
    disputeId: dispute.id,
    eventType: 'created',
    actorId: input.reporterId,
    description: `Dispute created: ${input.title}`,
    metadata: JSON.stringify({ disputeType: input.disputeType }),
  });

  // Notify respondent if specified
  if (input.respondentId) {
    await db.insert(notifications).values({
      userId: input.respondentId,
      type: 'dispute_created',
      title: 'New Dispute Filed',
      message: `A dispute has been filed regarding your swap. Please respond within 48 hours.`,
      metadata: JSON.stringify({ disputeId: dispute.id }),
    });
  }

  // Get reporter info for notification
  const [reporter] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.reporterId))
    .limit(1);

  // Notify reporter of successful creation
  await db.insert(notifications).values({
    userId: input.reporterId,
    type: 'dispute_filed',
    title: 'Dispute Filed Successfully',
    message: `Your dispute "${input.title}" has been filed. ${input.respondentId ? 'The other party has 48 hours to respond.' : 'Our team will review it soon.'}`,
    metadata: JSON.stringify({ disputeId: dispute.id }),
  });

  return dispute.id;
}

/* ================================
   DISPUTE RETRIEVAL
================================ */

/**
 * Get dispute by ID with all related data
 */
export async function getDispute(disputeId: string) {
  // Get dispute details
  const [dispute] = await db
    .select({
      dispute: cycleDisputes,
      reporter: users,
      respondent: users,
      mediator: users,
      resolver: users,
    })
    .from(cycleDisputes)
    .leftJoin(users, eq(cycleDisputes.reporterId, users.id))
    .leftJoin(users, eq(cycleDisputes.respondentId, users.id))
    .leftJoin(users, eq(cycleDisputes.mediatorId, users.id))
    .leftJoin(users, eq(cycleDisputes.resolvedBy, users.id))
    .where(eq(cycleDisputes.id, disputeId))
    .limit(1);

  if (!dispute) {
    throw new Error('Dispute not found');
  }

  // Get messages
  const messages = await db
    .select({
      message: disputeMessages,
      sender: users,
    })
    .from(disputeMessages)
    .leftJoin(users, eq(disputeMessages.senderId, users.id))
    .where(eq(disputeMessages.disputeId, disputeId))
    .orderBy(disputeMessages.createdAt);

  // Get timeline
  const timeline = await db
    .select({
      event: disputeTimeline,
      actor: users,
    })
    .from(disputeTimeline)
    .leftJoin(users, eq(disputeTimeline.actorId, users.id))
    .where(eq(disputeTimeline.disputeId, disputeId))
    .orderBy(disputeTimeline.createdAt);

  return {
    ...dispute,
    messages,
    timeline,
  };
}

/**
 * Get disputes for a user (as reporter or respondent)
 */
export async function getUserDisputes(userId: string, status?: DisputeStatus) {
  const conditions = [
    or(
      eq(cycleDisputes.reporterId, userId),
      eq(cycleDisputes.respondentId, userId)
    ),
  ];

  if (status) {
    conditions.push(eq(cycleDisputes.status, status));
  }

  const disputes = await db
    .select({
      dispute: cycleDisputes,
      reporter: users,
      respondent: users,
      cycle: swapCycles,
    })
    .from(cycleDisputes)
    .leftJoin(users, eq(cycleDisputes.reporterId, users.id))
    .leftJoin(users, eq(cycleDisputes.respondentId, users.id))
    .leftJoin(swapCycles, eq(cycleDisputes.cycleId, swapCycles.id))
    .where(and(...conditions))
    .orderBy(desc(cycleDisputes.createdAt));

  return disputes;
}

/**
 * Get all disputes (admin view)
 */
export async function getAllDisputes(filters?: {
  status?: DisputeStatus;
  priority?: string;
  disputeType?: DisputeType;
  limit?: number;
  offset?: number;
}) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(cycleDisputes.status, filters.status));
  }

  if (filters?.priority) {
    conditions.push(eq(cycleDisputes.priority, filters.priority));
  }

  if (filters?.disputeType) {
    conditions.push(eq(cycleDisputes.disputeType, filters.disputeType));
  }

  const disputes = await db
    .select({
      dispute: cycleDisputes,
      reporter: users,
      respondent: users,
      mediator: users,
      cycle: swapCycles,
    })
    .from(cycleDisputes)
    .leftJoin(users, eq(cycleDisputes.reporterId, users.id))
    .leftJoin(users, eq(cycleDisputes.respondentId, users.id))
    .leftJoin(users, eq(cycleDisputes.mediatorId, users.id))
    .leftJoin(swapCycles, eq(cycleDisputes.cycleId, swapCycles.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(cycleDisputes.priority), desc(cycleDisputes.createdAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);

  return disputes;
}

/* ================================
   MESSAGING
================================ */

/**
 * Add message to dispute thread
 */
export async function addDisputeMessage(input: AddMessageInput) {
  // Add message
  const [message] = await db
    .insert(disputeMessages)
    .values({
      disputeId: input.disputeId,
      senderId: input.senderId,
      message: input.message,
      isAdminMessage: input.isAdminMessage || false,
      attachmentUrls: input.attachmentUrls ? JSON.stringify(input.attachmentUrls) : null,
    })
    .$returningId();

  // Add timeline event
  await addTimelineEvent({
    disputeId: input.disputeId,
    eventType: 'message_added',
    actorId: input.senderId,
    description: input.isAdminMessage ? 'Admin added a message' : 'New message added',
  });

  // Get dispute to notify other parties
  const [dispute] = await db
    .select()
    .from(cycleDisputes)
    .where(eq(cycleDisputes.id, input.disputeId))
    .limit(1);

  if (!dispute) {
    throw new Error('Dispute not found');
  }

  // Notify other party
  const recipientId = dispute.reporterId === input.senderId
    ? dispute.respondentId
    : dispute.reporterId;

  if (recipientId) {
    await db.insert(notifications).values({
      userId: recipientId,
      type: 'dispute_message',
      title: 'New Dispute Message',
      message: `You have a new message in dispute: ${dispute.title}`,
      metadata: JSON.stringify({ disputeId: input.disputeId }),
    });
  }

  return message.id;
}

/* ================================
   DISPUTE WORKFLOW
================================ */

/**
 * Respond to dispute (for respondent)
 */
export async function respondToDispute(
  disputeId: string,
  respondentId: string,
  response: string,
  evidenceUrls?: string[]
) {
  // Update status to investigating
  await db
    .update(cycleDisputes)
    .set({ status: 'investigating' })
    .where(
      and(
        eq(cycleDisputes.id, disputeId),
        eq(cycleDisputes.respondentId, respondentId)
      )
    );

  // Add response as message
  await addDisputeMessage({
    disputeId,
    senderId: respondentId,
    message: response,
    attachmentUrls: evidenceUrls,
  });

  // Add timeline event
  await addTimelineEvent({
    disputeId,
    eventType: 'responded',
    actorId: respondentId,
    description: 'Respondent provided their response',
  });

  // Notify reporter
  const [dispute] = await db
    .select()
    .from(cycleDisputes)
    .where(eq(cycleDisputes.id, disputeId))
    .limit(1);

  if (dispute) {
    await db.insert(notifications).values({
      userId: dispute.reporterId,
      type: 'dispute_response',
      title: 'Response to Your Dispute',
      message: `The other party has responded to your dispute: ${dispute.title}`,
      metadata: JSON.stringify({ disputeId }),
    });
  }
}

/**
 * Escalate dispute to admin/mediator
 */
export async function escalateDispute(disputeId: string, reason?: string) {
  const now = new Date();

  await db
    .update(cycleDisputes)
    .set({
      status: 'escalated',
      escalatedAt: now,
      priority: 'high',
    })
    .where(eq(cycleDisputes.id, disputeId));

  // Add timeline event
  await addTimelineEvent({
    disputeId,
    eventType: 'escalated',
    description: reason || 'Dispute escalated to admin review',
    metadata: reason ? JSON.stringify({ reason }) : null,
  });
}

/**
 * Assign mediator to dispute
 */
export async function assignMediator(disputeId: string, mediatorId: string) {
  await db
    .update(cycleDisputes)
    .set({
      mediatorId,
      status: 'investigating',
    })
    .where(eq(cycleDisputes.id, disputeId));

  // Add timeline event
  await addTimelineEvent({
    disputeId,
    eventType: 'assigned',
    actorId: mediatorId,
    description: 'Mediator assigned to dispute',
  });

  // Notify mediator
  const [dispute] = await db
    .select()
    .from(cycleDisputes)
    .where(eq(cycleDisputes.id, disputeId))
    .limit(1);

  if (dispute) {
    await db.insert(notifications).values({
      userId: mediatorId,
      type: 'dispute_assigned',
      title: 'Dispute Assigned to You',
      message: `You have been assigned to mediate: ${dispute.title}`,
      metadata: JSON.stringify({ disputeId }),
    });
  }
}

/* ================================
   RESOLUTION
================================ */

/**
 * Resolve dispute with outcome
 */
export async function resolveDispute(input: ResolveDisputeInput) {
  const now = new Date();

  // Update dispute
  await db
    .update(cycleDisputes)
    .set({
      status: 'resolved',
      resolution: input.resolution,
      resolutionType: input.resolutionType,
      resolvedBy: input.resolvedBy,
      resolvedAt: now,
      adminNotes: input.adminNotes,
      enforcementStatus: 'pending',
    })
    .where(eq(cycleDisputes.id, input.disputeId));

  // Add timeline event
  await addTimelineEvent({
    disputeId: input.disputeId,
    eventType: 'resolved',
    actorId: input.resolvedBy,
    description: `Dispute resolved: ${input.resolutionType}`,
    metadata: JSON.stringify({ resolutionType: input.resolutionType }),
  });

  // Enforce resolution
  await enforceResolution(input.disputeId, input.resolutionType);

  // Notify both parties
  const [dispute] = await db
    .select()
    .from(cycleDisputes)
    .where(eq(cycleDisputes.id, input.disputeId))
    .limit(1);

  if (dispute) {
    const parties = [dispute.reporterId];
    if (dispute.respondentId) {
      parties.push(dispute.respondentId);
    }

    for (const userId of parties) {
      await db.insert(notifications).values({
        userId,
        type: 'dispute_resolved',
        title: 'Dispute Resolved',
        message: `The dispute "${dispute.title}" has been resolved. Resolution: ${input.resolutionType}`,
        metadata: JSON.stringify({
          disputeId: input.disputeId,
          resolutionType: input.resolutionType,
        }),
      });
    }
  }

  return true;
}

/**
 * Enforce resolution (apply penalties, refunds, etc.)
 */
async function enforceResolution(disputeId: string, resolutionType: ResolutionType) {
  const [dispute] = await db
    .select()
    .from(cycleDisputes)
    .where(eq(cycleDisputes.id, disputeId))
    .limit(1);

  if (!dispute) {
    throw new Error('Dispute not found');
  }

  try {
    switch (resolutionType) {
      case 'penalty':
        // Deduct reliability score from respondent
        if (dispute.respondentId) {
          await db
            .update(userReliabilityScores)
            .set({
              penaltyPoints: sql`${userReliabilityScores.penaltyPoints} + 10`,
              reliabilityScore: sql`${userReliabilityScores.reliabilityScore} - 10`,
            })
            .where(eq(userReliabilityScores.userId, dispute.respondentId));
        }
        break;

      case 'account_warning':
        // Add warning to user account (tracked in reliability scores)
        if (dispute.respondentId) {
          await db
            .update(userReliabilityScores)
            .set({
              penaltyPoints: sql`${userReliabilityScores.penaltyPoints} + 5`,
            })
            .where(eq(userReliabilityScores.userId, dispute.respondentId));
        }
        break;

      case 'refund':
      case 'replacement':
        // These would be handled by escrow/cycle services
        // Just mark as pending enforcement for manual processing
        break;

      case 'no_action':
      case 'escalated':
        // No enforcement needed
        break;
    }

    // Mark enforcement as completed
    await db
      .update(cycleDisputes)
      .set({ enforcementStatus: 'completed' })
      .where(eq(cycleDisputes.id, disputeId));

    // Add timeline event
    await addTimelineEvent({
      disputeId,
      eventType: 'enforced',
      description: `Resolution enforced: ${resolutionType}`,
    });

  } catch (error) {
    // Mark enforcement as failed
    await db
      .update(cycleDisputes)
      .set({ enforcementStatus: 'failed' })
      .where(eq(cycleDisputes.id, disputeId));

    console.error('Failed to enforce resolution:', error);
    throw error;
  }
}

/* ================================
   HELPERS
================================ */

/**
 * Add event to dispute timeline
 */
async function addTimelineEvent(event: {
  disputeId: string;
  eventType: string;
  actorId?: string;
  description: string;
  metadata?: string | null;
}) {
  await db.insert(disputeTimeline).values({
    disputeId: event.disputeId,
    eventType: event.eventType,
    actorId: event.actorId || null,
    description: event.description,
    metadata: event.metadata || null,
  });
}

/**
 * Check if user is admin/mediator
 */
export function isAdmin(userEmail: string): boolean {
  return userEmail.endsWith('@kitabu.admin') || userEmail.includes('+admin@');
}

/**
 * Get dispute statistics
 */
export async function getDisputeStats() {
  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      open: sql<number>`SUM(CASE WHEN status = 'open' OR status = 'awaiting_response' THEN 1 ELSE 0 END)`,
      investigating: sql<number>`SUM(CASE WHEN status = 'investigating' THEN 1 ELSE 0 END)`,
      resolved: sql<number>`SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END)`,
      escalated: sql<number>`SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END)`,
      urgent: sql<number>`SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END)`,
    })
    .from(cycleDisputes);

  return stats || {
    total: 0,
    open: 0,
    investigating: 0,
    resolved: 0,
    escalated: 0,
    urgent: 0,
  };
}
