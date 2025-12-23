/**
 * Gamification Service
 *
 * Manages:
 * - User badges and achievements
 * - School leaderboards
 * - Milestone tracking
 * - Reward notifications
 */

import { db } from "../db";
import { userReliabilityScores, users, schools, notifications } from "../db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

/* ================================
   BADGE DEFINITIONS
================================ */

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: any) => boolean;
}

const BADGES: Badge[] = [
  {
    id: "first_swap",
    name: "First Swap",
    description: "Completed your first book swap",
    icon: "🎉",
    condition: (stats) => stats.totalSwapsCompleted >= 1,
  },
  {
    id: "swap_master_5",
    name: "Swap Master",
    description: "Completed 5 successful swaps",
    icon: "⭐",
    condition: (stats) => stats.totalSwapsCompleted >= 5,
  },
  {
    id: "swap_master_10",
    name: "Swap Champion",
    description: "Completed 10 successful swaps",
    icon: "🏆",
    condition: (stats) => stats.totalSwapsCompleted >= 10,
  },
  {
    id: "swap_master_25",
    name: "Swap Legend",
    description: "Completed 25 successful swaps",
    icon: "👑",
    condition: (stats) => stats.totalSwapsCompleted >= 25,
  },
  {
    id: "reliable_100",
    name: "Perfectly Reliable",
    description: "Achieved 100% reliability score",
    icon: "💯",
    condition: (stats) => Number(stats.reliabilityScore) >= 100,
  },
  {
    id: "reliable_90",
    name: "Highly Reliable",
    description: "Maintained 90%+ reliability score",
    icon: "🌟",
    condition: (stats) => Number(stats.reliabilityScore) >= 90,
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Average confirmation time under 6 hours",
    icon: "⏰",
    condition: (stats) =>
      stats.avgConfirmationTimeHours &&
      Number(stats.avgConfirmationTimeHours) < 6,
  },
  {
    id: "cycle_master",
    name: "Cycle Master",
    description: "Completed 5 multi-way swap cycles",
    icon: "🔄",
    condition: (stats) => stats.totalCyclesCompleted >= 5,
  },
  {
    id: "perfect_condition",
    name: "Book Keeper",
    description: "100% book condition accuracy rate",
    icon: "📚",
    condition: (stats) =>
      stats.bookConditionAccuracyRate &&
      Number(stats.bookConditionAccuracyRate) >= 100,
  },
  {
    id: "on_time_delivery",
    name: "Always On Time",
    description: "100% on-time delivery rate",
    icon: "⏱️",
    condition: (stats) =>
      stats.onTimeDeliveryRate && Number(stats.onTimeDeliveryRate) >= 100,
  },
  {
    id: "community_helper",
    name: "Community Helper",
    description: "Helped students from 5+ different schools",
    icon: "🤝",
    condition: (stats) => stats.totalSwapsCompleted >= 5,
  },
  {
    id: "zero_penalties",
    name: "Spotless Record",
    description: "No penalty points",
    icon: "✨",
    condition: (stats) => stats.penaltyPoints === 0 && stats.totalSwapsCompleted >= 3,
  },
];

/* ================================
   BADGE MANAGEMENT
================================ */

export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  // Get user's reliability score
  const [score] = await db
    .select()
    .from(userReliabilityScores)
    .where(eq(userReliabilityScores.userId, userId))
    .limit(1);

  if (!score) return [];

  // Get current badges
  const currentBadges: string[] = score.badges
    ? JSON.parse(score.badges)
    : [];

  // Check which badges should be awarded
  const newBadges: string[] = [];

  for (const badge of BADGES) {
    if (!currentBadges.includes(badge.id) && badge.condition(score)) {
      newBadges.push(badge.id);
      currentBadges.push(badge.id);

      // Send notification
      await db.insert(notifications).values({
        userId,
        type: "achievement_unlocked",
        title: `Achievement Unlocked: ${badge.name}`,
        message: `${badge.icon} ${badge.description}`,
        actionUrl: "/profile",
        isRead: false,
      });

      console.log(`🏅 User ${userId} earned badge: ${badge.name}`);
    }
  }

  // Update user's badges
  if (newBadges.length > 0) {
    await db
      .update(userReliabilityScores)
      .set({ badges: JSON.stringify(currentBadges) })
      .where(eq(userReliabilityScores.userId, userId));
  }

  return newBadges;
}

export function getBadgeInfo(badgeId: string): Badge | undefined {
  return BADGES.find((b) => b.id === badgeId);
}

export function getAllBadges(): Badge[] {
  return BADGES;
}

export async function getUserBadges(userId: string): Promise<Badge[]> {
  const [score] = await db
    .select()
    .from(userReliabilityScores)
    .where(eq(userReliabilityScores.userId, userId))
    .limit(1);

  if (!score || !score.badges) return [];

  const badgeIds: string[] = JSON.parse(score.badges);
  return badgeIds
    .map((id) => getBadgeInfo(id))
    .filter((b): b is Badge => b !== undefined);
}

/* ================================
   LEADERBOARDS
================================ */

export async function getSchoolLeaderboard(
  schoolId: string,
  limit: number = 10
) {
  const leaderboard = await db
    .select({
      user: users,
      score: userReliabilityScores,
    })
    .from(userReliabilityScores)
    .innerJoin(users, eq(userReliabilityScores.userId, users.id))
    .where(eq(users.schoolId, schoolId))
    .orderBy(desc(userReliabilityScores.reliabilityScore))
    .limit(limit);

  return leaderboard.map((entry, index) => ({
    rank: index + 1,
    userId: entry.user.id,
    name: entry.user.fullName,
    profilePicture: entry.user.profilePictureUrl,
    reliabilityScore: Number(entry.score.reliabilityScore),
    totalSwaps: entry.score.totalSwapsCompleted || 0,
    badges: entry.score.badges ? JSON.parse(entry.score.badges) : [],
  }));
}

export async function getGlobalLeaderboard(limit: number = 50) {
  const leaderboard = await db
    .select({
      user: users,
      score: userReliabilityScores,
      school: schools,
    })
    .from(userReliabilityScores)
    .innerJoin(users, eq(userReliabilityScores.userId, users.id))
    .leftJoin(schools, eq(users.schoolId, schools.id))
    .orderBy(desc(userReliabilityScores.reliabilityScore))
    .limit(limit);

  return leaderboard.map((entry, index) => ({
    rank: index + 1,
    userId: entry.user.id,
    name: entry.user.fullName,
    profilePicture: entry.user.profilePictureUrl,
    schoolName: entry.school?.name,
    reliabilityScore: Number(entry.score.reliabilityScore),
    totalSwaps: entry.score.totalSwapsCompleted || 0,
    badges: entry.score.badges ? JSON.parse(entry.score.badges) : [],
  }));
}

export async function getTopSwappersLeaderboard(limit: number = 50) {
  const leaderboard = await db
    .select({
      user: users,
      score: userReliabilityScores,
      school: schools,
    })
    .from(userReliabilityScores)
    .innerJoin(users, eq(userReliabilityScores.userId, users.id))
    .leftJoin(schools, eq(users.schoolId, schools.id))
    .where(gte(userReliabilityScores.totalSwapsCompleted, 1))
    .orderBy(desc(userReliabilityScores.totalSwapsCompleted))
    .limit(limit);

  return leaderboard.map((entry, index) => ({
    rank: index + 1,
    userId: entry.user.id,
    name: entry.user.fullName,
    profilePicture: entry.user.profilePictureUrl,
    schoolName: entry.school?.name,
    reliabilityScore: Number(entry.score.reliabilityScore),
    totalSwaps: entry.score.totalSwapsCompleted || 0,
    badges: entry.score.badges ? JSON.parse(entry.score.badges) : [],
  }));
}

export async function getUserRank(userId: string): Promise<{
  globalRank: number | null;
  schoolRank: number | null;
  totalUsers: number;
}> {
  // Get user's school
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { globalRank: null, schoolRank: null, totalUsers: 0 };
  }

  // Get user's score
  const [userScore] = await db
    .select()
    .from(userReliabilityScores)
    .where(eq(userReliabilityScores.userId, userId))
    .limit(1);

  if (!userScore) {
    return { globalRank: null, schoolRank: null, totalUsers: 0 };
  }

  const reliabilityScore = Number(userScore.reliabilityScore);

  // Get global rank
  const higherScoresGlobal = await db
    .select()
    .from(userReliabilityScores)
    .where(gte(userReliabilityScores.reliabilityScore, reliabilityScore.toString()));

  const globalRank = higherScoresGlobal.length;

  // Get school rank
  let schoolRank: number | null = null;
  if (user.schoolId) {
    const schoolUsers = await db
      .select({
        score: userReliabilityScores,
        user: users,
      })
      .from(userReliabilityScores)
      .innerJoin(users, eq(userReliabilityScores.userId, users.id))
      .where(
        and(
          eq(users.schoolId, user.schoolId),
          gte(userReliabilityScores.reliabilityScore, reliabilityScore.toString())
        )
      );

    schoolRank = schoolUsers.length;
  }

  // Get total users
  const allScores = await db.select().from(userReliabilityScores);
  const totalUsers = allScores.length;

  return { globalRank, schoolRank, totalUsers };
}

/* ================================
   MILESTONE TRACKING
================================ */

export async function checkMilestones(userId: string): Promise<void> {
  const [score] = await db
    .select()
    .from(userReliabilityScores)
    .where(eq(userReliabilityScores.userId, userId))
    .limit(1);

  if (!score) return;

  // Check for milestone achievements
  const milestones = [
    { count: 1, message: "Congratulations on your first swap!" },
    { count: 5, message: "You've completed 5 swaps! Keep it up!" },
    { count: 10, message: "10 swaps completed! You're a swap champion!" },
    { count: 25, message: "25 swaps! You're a swap legend!" },
    { count: 50, message: "50 swaps! You're making a real impact!" },
    { count: 100, message: "100 swaps! You're a community hero!" },
  ];

  const totalSwaps = score.totalSwapsCompleted || 0;

  for (const milestone of milestones) {
    if (totalSwaps === milestone.count) {
      await db.insert(notifications).values({
        userId,
        type: "milestone",
        title: `Milestone Reached! 🎉`,
        message: milestone.message,
        actionUrl: "/profile",
        isRead: false,
      });

      console.log(`🎯 User ${userId} reached milestone: ${milestone.count} swaps`);
    }
  }

  // Check and award badges
  await checkAndAwardBadges(userId);
}
