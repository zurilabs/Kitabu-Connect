/**
 * Referral Service
 *
 * Manages non-monetary referral system with:
 * - Dynamic referral link generation
 * - Fraud prevention (IP/device fingerprinting)
 * - Badge and feature rewards
 * - School-based leaderboards
 * - Activity tracking
 */

import { db } from "../db";
import {
  referrals,
  referralStats,
  referralActivityLog,
  users,
  userReliabilityScores,
  orders,
  swapOrders,
} from "../db/schema";
import { eq, and, desc, gte, sql, count } from "drizzle-orm";
import crypto from "crypto";

/* ================================
   TYPES & CONSTANTS
================================ */

const MAX_REFERRALS_PER_MONTH = 10;
const COOLDOWN_HOURS = 48;
const QUALIFICATION_PERIOD_DAYS = 30;

interface CreateReferralCodeInput {
  userId: string;
}

interface TrackReferralSignupInput {
  referralCode: string;
  newUserId: string;
  ipAddress: string;
  deviceFingerprint: string;
  userAgent: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

interface FraudCheckResult {
  isSuspicious: boolean;
  reasons: string[];
  shouldBlock: boolean;
}

/* ================================
   REFERRAL CODE GENERATION
================================ */

/**
 * Generate unique referral code in format: FIRSTNAME-ABC123
 */
function generateReferralCode(firstName: string): string {
  const sanitizedName = firstName
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .substring(0, 8);

  const randomPart = crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()
    .substring(0, 6);

  return `${sanitizedName}-${randomPart}`;
}

/**
 * Create or get referral code for a user
 */
export async function createOrGetReferralCode(
  input: CreateReferralCodeInput
): Promise<{ success: boolean; referralCode?: string; referralLink?: string; message?: string }> {
  try {
    const { userId } = input;

    // Check if user already has a code
    const existing = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.referrerId, userId),
        eq(referrals.status, "pending")
      ))
      .limit(1);

    if (existing.length > 0 && !existing[0].refereeId) {
      // User has unused referral code entry
      const code = existing[0].referralCode;
      return {
        success: true,
        referralCode: code,
        referralLink: `${process.env.CLIENT_URL || "https://kitabuconnect.com"}/ref/${code}`,
      };
    }

    // Get user details for code generation
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Generate unique code using first part of full name
    const firstName = user.fullName?.split(' ')[0] || 'USER';
    let referralCode = generateReferralCode(firstName);
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure uniqueness
    while (attempts < maxAttempts) {
      const existingCode = await db
        .select()
        .from(referrals)
        .where(eq(referrals.referralCode, referralCode))
        .limit(1);

      if (existingCode.length === 0) break;

      // Generate new code with more randomness
      referralCode = generateReferralCode(firstName) + Math.floor(Math.random() * 99);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return { success: false, message: "Failed to generate unique referral code" };
    }

    // Create referral entry
    await db.insert(referrals).values({
      referralCode,
      referrerId: userId,
      referrerSchoolId: null, // School ID is not in users table
      status: "pending",
    });

    // Initialize referral stats if not exists
    const existingStats = await db
      .select()
      .from(referralStats)
      .where(eq(referralStats.userId, userId))
      .limit(1);

    if (existingStats.length === 0) {
      await db.insert(referralStats).values({
        userId,
        totalReferrals: 0,
        qualifiedReferrals: 0,
        pendingReferrals: 0,
        invalidReferrals: 0,
        referralsThisMonth: 0,
      });
    }

    // Log activity
    await logReferralActivity({
      referralCode,
      eventType: "code_generated",
      eventDescription: `Referral code ${referralCode} generated for user ${userId}`,
    });

    const referralLink = `${process.env.CLIENT_URL || "https://kitabuconnect.com"}/ref/${referralCode}`;

    return {
      success: true,
      referralCode,
      referralLink,
    };
  } catch (error) {
    console.error("[ReferralService] Create referral code error:", error);
    return { success: false, message: "Failed to create referral code" };
  }
}

/* ================================
   FRAUD DETECTION
================================ */

/**
 * Check for fraudulent referral patterns
 */
async function performFraudCheck(input: TrackReferralSignupInput): Promise<FraudCheckResult> {
  const reasons: string[] = [];
  let shouldBlock = false;

  try {
    const { referralCode, newUserId, ipAddress, deviceFingerprint } = input;

    // Get referrer details
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referralCode, referralCode))
      .limit(1);

    if (!referral) {
      return { isSuspicious: false, reasons: [], shouldBlock: false };
    }

    // Check 1: Self-referral (same user)
    if (referral.referrerId === newUserId) {
      reasons.push("Self-referral detected");
      shouldBlock = true;
    }

    // Check 2: Same IP address as referrer (within last 24h)
    const recentReferralsFromSameIP = await db
      .select()
      .from(referrals)
      .where(
        and(
          eq(referrals.referrerId, referral.referrerId),
          eq(referrals.refereeIpAddress, ipAddress),
          gte(referrals.signupCompletedAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      );

    if (recentReferralsFromSameIP.length > 0) {
      reasons.push("Multiple signups from same IP within 24h");
      // Don't block, but flag as suspicious
    }

    // Check 3: Same device fingerprint
    const sameDeviceReferrals = await db
      .select()
      .from(referrals)
      .where(
        and(
          eq(referrals.referrerId, referral.referrerId),
          eq(referrals.refereeDeviceFingerprint, deviceFingerprint)
        )
      );

    if (sameDeviceReferrals.length > 0) {
      reasons.push("Same device fingerprint detected");
      shouldBlock = true;
    }

    // Check 4: Rate limiting - check monthly limit
    const stats = await db
      .select()
      .from(referralStats)
      .where(eq(referralStats.userId, referral.referrerId))
      .limit(1);

    if (stats.length > 0) {
      const stat = stats[0];

      // Reset monthly counter if needed
      const lastReset = new Date(stat.lastReferralMonthReset);
      const now = new Date();
      const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceReset < 30 && stat.referralsThisMonth >= MAX_REFERRALS_PER_MONTH) {
        reasons.push(`Monthly referral limit exceeded (${MAX_REFERRALS_PER_MONTH} max)`);
        shouldBlock = true;
      }

      // Check 5: Cooldown period
      if (stat.lastReferralAt) {
        const hoursSinceLastReferral = (now.getTime() - new Date(stat.lastReferralAt).getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastReferral < COOLDOWN_HOURS) {
          reasons.push(`Cooldown period active (${COOLDOWN_HOURS}h between referrals)`);
          shouldBlock = true;
        }
      }
    }

    // Check 6: Pattern detection - too many referrals in short time
    const recentReferrals = await db
      .select()
      .from(referrals)
      .where(
        and(
          eq(referrals.referrerId, referral.referrerId),
          gte(referrals.signupCompletedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        )
      );

    if (recentReferrals.length >= 5) {
      reasons.push("Suspicious referral velocity (5+ in 7 days)");
      // Flag but don't block
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
      shouldBlock,
    };
  } catch (error) {
    console.error("[ReferralService] Fraud check error:", error);
    return { isSuspicious: false, reasons: ["Fraud check failed"], shouldBlock: false };
  }
}

/* ================================
   REFERRAL TRACKING
================================ */

/**
 * Track when a user signs up using a referral code
 */
export async function trackReferralSignup(
  input: TrackReferralSignupInput
): Promise<{ success: boolean; message?: string }> {
  try {
    const { referralCode, newUserId, ipAddress, deviceFingerprint, userAgent, utmSource, utmMedium, utmCampaign } = input;

    // Find the referral code
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referralCode, referralCode))
      .limit(1);

    if (!referral) {
      return { success: false, message: "Invalid referral code" };
    }

    // Check if code already used
    if (referral.refereeId) {
      return { success: false, message: "Referral code already used" };
    }

    // Perform fraud check
    const fraudCheck = await performFraudCheck(input);

    if (fraudCheck.shouldBlock) {
      // Log fraud attempt
      await db.insert(referralActivityLog).values({
        referralId: referral.id,
        eventType: "fraud_flagged",
        eventDescription: `Signup blocked: ${fraudCheck.reasons.join(", ")}`,
        ipAddress,
        userAgent,
        metadata: JSON.stringify({ reasons: fraudCheck.reasons }),
      });

      return {
        success: false,
        message: "Referral signup blocked due to suspicious activity",
      };
    }

    // Get referee school
    const [referee] = await db
      .select()
      .from(users)
      .where(eq(users.id, newUserId))
      .limit(1);

    // Update referral record
    await db
      .update(referrals)
      .set({
        refereeId: newUserId,
        refereeSchoolId: referee?.schoolId,
        signupCompletedAt: new Date(),
        refereeIpAddress: ipAddress,
        refereeDeviceFingerprint: deviceFingerprint,
        refereeUserAgent: userAgent,
        utmSource,
        utmMedium,
        utmCampaign,
        isFraudulent: fraudCheck.isSuspicious && !fraudCheck.shouldBlock,
        fraudReason: fraudCheck.isSuspicious ? fraudCheck.reasons.join("; ") : null,
      })
      .where(eq(referrals.id, referral.id));

    // Update referrer stats
    const [stats] = await db
      .select()
      .from(referralStats)
      .where(eq(referralStats.userId, referral.referrerId))
      .limit(1);

    if (stats) {
      // Check if monthly counter needs reset
      const lastReset = new Date(stats.lastReferralMonthReset);
      const now = new Date();
      const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

      const needsReset = daysSinceReset >= 30;

      await db
        .update(referralStats)
        .set({
          totalReferrals: sql`${referralStats.totalReferrals} + 1`,
          pendingReferrals: sql`${referralStats.pendingReferrals} + 1`,
          referralsThisMonth: needsReset ? 1 : sql`${referralStats.referralsThisMonth} + 1`,
          lastReferralMonthReset: needsReset ? now : stats.lastReferralMonthReset,
          lastReferralAt: now,
          invalidReferrals: fraudCheck.isSuspicious
            ? sql`${referralStats.invalidReferrals} + 1`
            : stats.invalidReferrals,
        })
        .where(eq(referralStats.userId, referral.referrerId));
    }

    // Grant "Invited Member" badge to referee
    await grantRefereeBadges(newUserId, referral.id);

    // Log activity
    await db.insert(referralActivityLog).values({
      referralId: referral.id,
      eventType: "signup_completed",
      eventDescription: `User ${newUserId} signed up using code ${referralCode}`,
      ipAddress,
      userAgent,
      metadata: JSON.stringify({
        utmSource,
        utmMedium,
        utmCampaign,
        suspicious: fraudCheck.isSuspicious,
      }),
    });

    console.log(`[ReferralService] Referral signup tracked: ${referralCode} -> ${newUserId}`);

    return { success: true, message: "Referral tracked successfully" };
  } catch (error) {
    console.error("[ReferralService] Track referral signup error:", error);
    return { success: false, message: "Failed to track referral signup" };
  }
}

/**
 * Track when referee completes their first transaction (qualification event)
 */
export async function qualifyReferral(
  userId: string,
  transactionType: "order" | "swap_order"
): Promise<{ success: boolean; message?: string }> {
  try {
    // Find referral where this user is the referee
    const [referral] = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.refereeId, userId),
        eq(referrals.status, "pending")
      ))
      .limit(1);

    if (!referral) {
      // User wasn't referred or already qualified
      return { success: true, message: "No pending referral found" };
    }

    // Check qualification period (30 days from signup)
    const signupDate = referral.signupCompletedAt;
    if (!signupDate) {
      return { success: false, message: "Signup date not found" };
    }

    const daysSinceSignup = Math.floor(
      (new Date().getTime() - new Date(signupDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSignup > QUALIFICATION_PERIOD_DAYS) {
      // Outside qualification window - mark as invalid
      await db
        .update(referrals)
        .set({ status: "invalid" })
        .where(eq(referrals.id, referral.id));

      return { success: false, message: "Qualification period expired" };
    }

    // Mark as qualified
    await db
      .update(referrals)
      .set({
        status: "qualified",
        firstTransactionAt: new Date(),
      })
      .where(eq(referrals.id, referral.id));

    // Update stats
    await db
      .update(referralStats)
      .set({
        qualifiedReferrals: sql`${referralStats.qualifiedReferrals} + 1`,
        pendingReferrals: sql`${referralStats.pendingReferrals} - 1`,
      })
      .where(eq(referralStats.userId, referral.referrerId));

    // Grant rewards to referrer
    await grantReferrerRewards(referral.referrerId, referral.id);

    // Log activity
    await db.insert(referralActivityLog).values({
      referralId: referral.id,
      eventType: "transaction_completed",
      eventDescription: `Referee ${userId} completed first ${transactionType}, referral qualified`,
      metadata: JSON.stringify({ transactionType }),
    });

    console.log(`[ReferralService] Referral qualified: ${referral.referralCode}`);

    return { success: true, message: "Referral qualified" };
  } catch (error) {
    console.error("[ReferralService] Qualify referral error:", error);
    return { success: false, message: "Failed to qualify referral" };
  }
}

/* ================================
   REWARD GRANTING
================================ */

/**
 * Grant badges and features to referrer based on total qualified referrals
 */
async function grantReferrerRewards(referrerId: string, referralId: number): Promise<void> {
  try {
    // Get referrer's stats
    const [stats] = await db
      .select()
      .from(referralStats)
      .where(eq(referralStats.userId, referrerId))
      .limit(1);

    if (!stats) return;

    const qualifiedCount = stats.qualifiedReferrals;
    const badges: string[] = [];
    const features: string[] = [];
    const updates: any = {};

    // Badge tiers
    if (qualifiedCount >= 3 && !stats.hasVerifiedCommunityBadge) {
      badges.push("networker_3");
      features.push("featured_seller");
      updates.hasVerifiedCommunityBadge = true;
      updates.hasFeaturedSeller = true;
    }

    if (qualifiedCount >= 5 && !stats.hasReducedEscrowHold) {
      badges.push("community_builder_5");
      features.push("reduced_escrow");
      updates.hasReducedEscrowHold = true;
    }

    if (qualifiedCount >= 10 && !stats.hasPriorityListing) {
      badges.push("community_builder_10");
      features.push("priority_listing");
      updates.hasPriorityListing = true;
    }

    if (qualifiedCount >= 25) {
      badges.push("campus_legend_25");
    }

    // Update stats
    if (Object.keys(updates).length > 0) {
      await db
        .update(referralStats)
        .set(updates)
        .where(eq(referralStats.userId, referrerId));
    }

    // Update referral record with granted rewards
    if (badges.length > 0 || features.length > 0) {
      const [referral] = await db
        .select()
        .from(referrals)
        .where(eq(referrals.id, referralId))
        .limit(1);

      const existingBadges = referral?.referrerRewardsBadges
        ? JSON.parse(referral.referrerRewardsBadges)
        : [];
      const existingFeatures = referral?.referrerRewardsFeatures
        ? JSON.parse(referral.referrerRewardsFeatures)
        : [];

      await db
        .update(referrals)
        .set({
          status: "rewarded",
          referrerRewardsBadges: JSON.stringify([...existingBadges, ...badges]),
          referrerRewardsFeatures: JSON.stringify([...existingFeatures, ...features]),
        })
        .where(eq(referrals.id, referralId));

      // Send notification
      const { notificationService } = await import("./notification.service");
      await notificationService.createNotification({
        userId: referrerId,
        type: "referral_reward",
        title: "Referral Rewards Unlocked!",
        message: `You've earned ${badges.length} new badge(s) and ${features.length} feature(s) from your referrals!`,
        actionUrl: "/dashboard/referrals",
      });

      // Log activity
      await db.insert(referralActivityLog).values({
        referralId,
        eventType: "reward_granted",
        eventDescription: `Granted ${badges.length} badges and ${features.length} features to referrer`,
        metadata: JSON.stringify({ badges, features }),
      });
    }
  } catch (error) {
    console.error("[ReferralService] Grant referrer rewards error:", error);
  }
}

/**
 * Grant badges to referee (new user who signed up via referral)
 */
async function grantRefereeBadges(refereeId: string, referralId: number): Promise<void> {
  try {
    const badges = ["invited_member"];

    await db
      .update(referrals)
      .set({
        refereeRewardsBadges: JSON.stringify(badges),
      })
      .where(eq(referrals.id, referralId));

    // Send welcome notification
    const { notificationService } = await import("./notification.service");
    await notificationService.createNotification({
      userId: refereeId,
      type: "welcome",
      title: "Welcome to Kitabu Connect!",
      message: "You've been invited by a community member. Complete your first swap to unlock more rewards!",
      actionUrl: "/explore",
    });

    console.log(`[ReferralService] Granted referee badges to ${refereeId}`);
  } catch (error) {
    console.error("[ReferralService] Grant referee badges error:", error);
  }
}

/* ================================
   RETRIEVAL & STATS
================================ */

/**
 * Get user's referral statistics and status
 */
export async function getUserReferralStats(userId: string): Promise<{
  success: boolean;
  stats?: any;
  referralCode?: string;
  referralLink?: string;
  referrals?: any[];
  message?: string;
}> {
  try {
    // Get or create referral code
    const codeResult = await createOrGetReferralCode({ userId });

    if (!codeResult.success) {
      return { success: false, message: codeResult.message };
    }

    // Get stats
    const [stats] = await db
      .select()
      .from(referralStats)
      .where(eq(referralStats.userId, userId))
      .limit(1);

    // Get referral history
    const referralHistory = await db
      .select({
        id: referrals.id,
        referralCode: referrals.referralCode,
        refereeId: referrals.refereeId,
        signupCompletedAt: referrals.signupCompletedAt,
        firstTransactionAt: referrals.firstTransactionAt,
        status: referrals.status,
        isFraudulent: referrals.isFraudulent,
        refereeName: users.fullName,
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.refereeId, users.id))
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));

    return {
      success: true,
      stats: stats || {
        totalReferrals: 0,
        qualifiedReferrals: 0,
        pendingReferrals: 0,
        invalidReferrals: 0,
        hasReducedEscrowHold: false,
        hasFeaturedSeller: false,
        hasPriorityListing: false,
        hasVerifiedCommunityBadge: false,
      },
      referralCode: codeResult.referralCode,
      referralLink: codeResult.referralLink,
      referrals: referralHistory,
    };
  } catch (error) {
    console.error("[ReferralService] Get user referral stats error:", error);
    return { success: false, message: "Failed to get referral stats" };
  }
}

/**
 * Get referral leaderboard
 */
export async function getReferralLeaderboard(
  limit: number = 10
): Promise<{ success: boolean; leaderboard?: any[]; message?: string }> {
  try {
    let query = db
      .select({
        userId: referralStats.userId,
        userName: users.fullName,
        qualifiedReferrals: referralStats.qualifiedReferrals,
        totalReferrals: referralStats.totalReferrals,
        hasReducedEscrowHold: referralStats.hasReducedEscrowHold,
        hasFeaturedSeller: referralStats.hasFeaturedSeller,
        hasPriorityListing: referralStats.hasPriorityListing,
      })
      .from(referralStats)
      .innerJoin(users, eq(referralStats.userId, users.id));

    const leaderboard = await query
      .orderBy(desc(referralStats.qualifiedReferrals))
      .limit(limit);

    return { success: true, leaderboard };
  } catch (error) {
    console.error("[ReferralService] Get leaderboard error:", error);
    return { success: false, message: "Failed to get leaderboard" };
  }
}

/* ================================
   UTILITY FUNCTIONS
================================ */

/**
 * Log referral activity for audit trail
 */
async function logReferralActivity(params: {
  referralCode: string;
  eventType: string;
  eventDescription: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}): Promise<void> {
  try {
    const { referralCode, eventType, eventDescription, ipAddress, userAgent, metadata } = params;

    // Get referral ID
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referralCode, referralCode))
      .limit(1);

    if (!referral) return;

    await db.insert(referralActivityLog).values({
      referralId: referral.id,
      eventType,
      eventDescription,
      ipAddress,
      userAgent,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (error) {
    console.error("[ReferralService] Log activity error:", error);
  }
}

/**
 * Check if user has reduced escrow hold privilege
 */
export async function hasReducedEscrowHold(userId: string): Promise<boolean> {
  try {
    const [stats] = await db
      .select()
      .from(referralStats)
      .where(eq(referralStats.userId, userId))
      .limit(1);

    return stats?.hasReducedEscrowHold || false;
  } catch (error) {
    console.error("[ReferralService] Check escrow hold error:", error);
    return false;
  }
}
