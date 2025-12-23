/**
 * Swap Cycle Detection Service
 *
 * Implements intelligent multilateral swap matching using:
 * - Graph theory (DFS cycle detection)
 * - School location data for geographic optimization
 * - Priority scoring for optimal matches
 *
 * Detects 2-way through 5-way swap cycles and saves them to the database.
 */

import crypto from "crypto";
import { db } from "../db";
import {
  bookListings,
  users,
  schools,
  swapCycles,
  cycleParticipants,
  userReliabilityScores,
  type School,
  type BookListing,
} from "../db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import {
  calculateSchoolDistance,
  calculateGeographicPriority,
  calculateLogisticsCost,
  calculateCycleCost,
  calculateCycleGeographicScore,
  isCycleSameCounty,
  isCycleSameZone,
  getPrimaryCounty,
  getMaxCycleDistance,
  getAvgCycleDistance,
  areBooksCompatible,
  isBookCompatibleWithSchoolLevel,
} from "../utils/geography";
import { getOrCreateDropPoint } from "./dropPoint.service";

/* ================================
   TYPE DEFINITIONS
================================ */

interface SwapNode {
  userId: string;
  userName: string;
  userEmail: string;
  schoolId: string;
  school: {
    id: string;
    name: string;
    level: string;
    county: string;
    district: string;
    zone: string;
    subCounty: string;
    ward: string;
    xCoord: number;
    yCoord: number;
  };
  hasBook: {
    id: number;
    title: string;
    author: string;
    grade: string;
    subject: string;
    condition: string;
  };
  wantsBooks: Array<{
    id: number;
    title: string;
    grade: string;
    subject: string;
  }>;
  reliabilityScore: number;
}

interface DetectedCycle {
  nodes: SwapNode[];
  cycleType: string;
  priorityScore: number;
  geographicScore: number;
  totalCost: number;
  avgCostPerParticipant: number;
  isSameCounty: boolean;
  isSameZone: boolean;
  maxDistance: number;
  avgDistance: number;
  primaryCounty: string;
}

/* ================================
   CYCLE DETECTOR CLASS
================================ */

export class CycleDetector {
  private adjacencyList: Map<string, SwapNode[]> = new Map();
  private allNodes: SwapNode[] = [];
  private userIdToNodes: Map<string, SwapNode[]> = new Map();

  /**
   * Build swap graph from active book listings
   * Creates directed edges: User A -> User B if B has a book A wants
   */
  async buildGraph(): Promise<void> {
    console.log("🔧 Building swap graph from active listings...");

    // Clear previous graph
    this.adjacencyList.clear();
    this.allNodes = [];
    this.userIdToNodes.clear();

    // Get all active swap listings with user and school data
    const swapListings = await db
      .select({
        listing: bookListings,
        user: users,
        school: schools,
      })
      .from(bookListings)
      .innerJoin(users, eq(bookListings.sellerId, users.id))
      .leftJoin(schools, eq(users.schoolId, schools.id))
      .where(
        and(
          eq(bookListings.listingType, "swap"),
          eq(bookListings.listingStatus, "active"),
          isNull(bookListings.soldAt)
        )
      );

    console.log(`📚 Found ${swapListings.length} active swap listings`);

    // Get reliability scores for all users
    const userIds = swapListings.map((s) => s.user.id);
    const reliabilityData = await db
      .select()
      .from(userReliabilityScores)
      .where(inArray(userReliabilityScores.userId, userIds));

    const reliabilityMap = new Map<string, number>();
    reliabilityData.forEach((r) => {
      reliabilityMap.set(r.userId, Number(r.reliabilityScore));
    });

    // Build nodes for each listing
    for (const { listing, user, school } of swapListings) {
      if (!school || !listing.willingToSwapFor) continue;

      // Parse what books they want (comma-separated titles)
      const wantedTitles = listing.willingToSwapFor
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (wantedTitles.length === 0) continue;

      // Create node for this user's listing
      const node: SwapNode = {
        userId: user.id,
        userName: user.fullName || "Unknown",
        userEmail: user.email || "",
        schoolId: school.id,
        school: {
          id: school.id,
          name: school.schoolName,
          level: school.level || "",
          county: school.county || "",
          district: school.district || "",
          zone: school.zone || "",
          subCounty: school.subCounty || "",
          ward: school.ward || "",
          xCoord: Number(school.xCoord) || 0,
          yCoord: Number(school.yCoord) || 0,
        },
        hasBook: {
          id: listing.id,
          title: listing.title,
          author: listing.author || "",
          grade: listing.classGrade || "",
          subject: listing.subject || "",
          condition: listing.condition,
        },
        wantsBooks: wantedTitles.map((title) => ({
          id: 0, // Will be filled when we find matches
          title,
          grade: "",
          subject: "",
        })),
        reliabilityScore: reliabilityMap.get(user.id) || 50,
      };

      this.allNodes.push(node);

      // Index by userId for quick lookup
      if (!this.userIdToNodes.has(user.id)) {
        this.userIdToNodes.set(user.id, []);
      }
      this.userIdToNodes.get(user.id)!.push(node);
    }

    // Build adjacency list (edges)
    for (const node of this.allNodes) {
      for (const wantedBook of node.wantsBooks) {
        // Find all nodes that have this book
        const matchingNodes = this.allNodes.filter((otherNode) => {
          // Skip self
          if (otherNode.userId === node.userId) return false;

          // Check if title matches (case-insensitive partial match)
          const titleMatch = otherNode.hasBook.title
            .toLowerCase()
            .includes(wantedBook.title.toLowerCase());

          if (!titleMatch) return false;

          // Check book compatibility
          const compatible = areBooksCompatible(
            node.hasBook.grade,
            otherNode.hasBook.grade,
            node.hasBook.subject,
            otherNode.hasBook.subject,
            node.hasBook.condition,
            otherNode.hasBook.condition
          );

          if (!compatible) return false;

          // Check school level compatibility
          const levelCompatible = isBookCompatibleWithSchoolLevel(
            otherNode.hasBook.grade,
            node.school.level
          );

          return levelCompatible;
        });

        // Add edges
        for (const matchNode of matchingNodes) {
          const key = `${node.userId}-${node.hasBook.id}`;
          if (!this.adjacencyList.has(key)) {
            this.adjacencyList.set(key, []);
          }
          this.adjacencyList.get(key)!.push(matchNode);
        }
      }
    }

    console.log(`✅ Graph built: ${this.allNodes.length} nodes, ${this.adjacencyList.size} edges`);
  }

  /**
   * Find all swap cycles using Depth-First Search (DFS)
   *
   * @param maxCycleSize Maximum cycle size (default: 5)
   * @returns Array of detected cycles, sorted by priority score
   */
  async findCycles(maxCycleSize: number = 5): Promise<DetectedCycle[]> {
    console.log(`🔍 Detecting swap cycles (max size: ${maxCycleSize})...`);

    await this.buildGraph();

    const detectedCycles: DetectedCycle[] = [];
    const globalVisited = new Set<string>();

    // Try starting DFS from each node
    for (const startNode of this.allNodes) {
      const nodeKey = `${startNode.userId}-${startNode.hasBook.id}`;

      if (globalVisited.has(nodeKey)) continue;

      const path: SwapNode[] = [startNode];
      const pathUserIds = new Set<string>([startNode.userId]);
      const pathNodeKeys = new Set<string>([nodeKey]);

      this.dfs(
        startNode,
        startNode,
        path,
        pathUserIds,
        pathNodeKeys,
        detectedCycles,
        maxCycleSize,
        globalVisited
      );
    }

    console.log(`✨ Found ${detectedCycles.length} potential cycles`);

    // Sort by priority score (highest first)
    detectedCycles.sort((a, b) => b.priorityScore - a.priorityScore);

    // Remove duplicate cycles
    const uniqueCycles = this.removeDuplicateCycles(detectedCycles);

    console.log(`✅ ${uniqueCycles.length} unique cycles after deduplication`);

    return uniqueCycles;
  }

  /**
   * Depth-First Search to find cycles
   */
  private dfs(
    startNode: SwapNode,
    currentNode: SwapNode,
    path: SwapNode[],
    pathUserIds: Set<string>,
    pathNodeKeys: Set<string>,
    cycles: DetectedCycle[],
    maxCycleSize: number,
    globalVisited: Set<string>
  ): void {
    const currentKey = `${currentNode.userId}-${currentNode.hasBook.id}`;

    // Get neighbors (nodes reachable from current)
    const neighbors = this.adjacencyList.get(currentKey) || [];

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.userId}-${neighbor.hasBook.id}`;

      // Found a cycle!
      if (neighbor.userId === startNode.userId && path.length >= 2) {
        const cycle = this.createCycle([...path]);
        if (cycle) {
          cycles.push(cycle);

          // Mark all nodes in this cycle as visited
          path.forEach((node) => {
            globalVisited.add(`${node.userId}-${node.hasBook.id}`);
          });
        }
        continue;
      }

      // Avoid revisiting users in current path
      if (pathUserIds.has(neighbor.userId)) continue;

      // Avoid cycles that are too large
      if (path.length >= maxCycleSize) continue;

      // Continue DFS
      path.push(neighbor);
      pathUserIds.add(neighbor.userId);
      pathNodeKeys.add(neighborKey);

      this.dfs(
        startNode,
        neighbor,
        path,
        pathUserIds,
        pathNodeKeys,
        cycles,
        maxCycleSize,
        globalVisited
      );

      // Backtrack
      path.pop();
      pathUserIds.delete(neighbor.userId);
      pathNodeKeys.delete(neighborKey);
    }
  }

  /**
   * Create cycle object with scoring and metrics
   */
  private createCycle(nodes: SwapNode[]): DetectedCycle | null {
    if (nodes.length < 2) return null;

    // Extract school data
    const schoolData = nodes.map((n) => ({
      school: {
        id: n.school.id,
        county: n.school.county,
        district: n.school.district,
        zone: n.school.zone,
        subCounty: n.school.subCounty,
        ward: n.school.ward,
        xCoord: n.school.xCoord,
        yCoord: n.school.yCoord,
      } as Partial<School>,
      schoolId: n.school.id,
    }));

    // Calculate geographic score
    const geographicScore = calculateCycleGeographicScore(schoolData);

    // Calculate costs
    const costData = nodes.map((n, i) => {
      const nextNode = nodes[(i + 1) % nodes.length];
      return {
        school: schoolData[i].school,
        schoolId: n.school.id,
        nextParticipantSchool: {
          county: nextNode.school.county,
          zone: nextNode.school.zone,
          xCoord: nextNode.school.xCoord,
          yCoord: nextNode.school.yCoord,
        } as Partial<School>,
        nextParticipantSchoolId: nextNode.school.id,
      };
    });

    const { totalCost, avgCostPerParticipant } = calculateCycleCost(costData);

    // Calculate distances
    const schools = nodes.map((n) => n.school as Partial<School>);
    const maxDistance = getMaxCycleDistance(schools);
    const avgDistance = getAvgCycleDistance(schools);

    // Check clustering
    const isSameCounty = isCycleSameCounty(schools);
    const isSameZone = isCycleSameZone(schools);
    const primaryCounty = getPrimaryCounty(schools) || "";

    // Calculate reliability score
    const avgReliabilityScore =
      nodes.reduce((sum, n) => sum + n.reliabilityScore, 0) / nodes.length;

    // Calculate priority score (weighted)
    const priorityScore =
      geographicScore * 0.35 + // 35% weight on geography (same school/county/zone)
      avgReliabilityScore * 0.25 + // 25% weight on user reliability
      (100 - avgCostPerParticipant) * 0.20 + // 20% weight on low cost
      (maxDistance < 10 ? 100 : maxDistance < 50 ? 50 : 20) * 0.15 + // 15% weight on proximity
      (isSameCounty ? 100 : 50) * 0.05; // 5% bonus for same county

    return {
      nodes,
      cycleType: `${nodes.length}-way`,
      priorityScore: Math.round(priorityScore * 100) / 100,
      geographicScore: Math.round(geographicScore * 100) / 100,
      totalCost,
      avgCostPerParticipant,
      isSameCounty,
      isSameZone,
      maxDistance,
      avgDistance,
      primaryCounty,
    };
  }

  /**
   * Remove duplicate cycles (same participants, different order)
   */
  private removeDuplicateCycles(cycles: DetectedCycle[]): DetectedCycle[] {
    const seen = new Set<string>();
    const unique: DetectedCycle[] = [];

    for (const cycle of cycles) {
      // Create a canonical representation (sorted user IDs)
      const userIds = cycle.nodes.map((n) => n.userId).sort();
      const key = userIds.join("-");

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cycle);
      }
    }

    return unique;
  }

  /**
   * Save detected cycles to database
   */
  async saveCycles(cycles: DetectedCycle[]): Promise<void> {
    console.log(`💾 Saving ${cycles.length} cycles to database...`);

    let savedCount = 0;

    for (const cycle of cycles) {
      try {
        const cycleId = crypto.randomUUID();

        // Calculate deadlines
        const now = new Date();
        const confirmationDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
        const completionDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Select optimal drop point for this cycle
        const participants = cycle.nodes.map((node) => ({
          schoolId: node.school.id,
          school: {
            id: node.school.id,
            name: node.school.name,
            county: node.school.county,
            zone: node.school.zone,
            address: node.school.address,
            xCoord: node.school.xCoord,
            yCoord: node.school.yCoord,
          },
        }));

        const dropPoint = await getOrCreateDropPoint(participants);

        // Insert cycle record
        await db.insert(swapCycles).values({
          id: cycleId,
          cycleType: cycle.cycleType,
          status: "pending_confirmation",
          priorityScore: cycle.priorityScore.toString(),
          primaryCounty: cycle.primaryCounty,
          isSameCounty: cycle.isSameCounty,
          isSameZone: cycle.isSameZone,
          totalLogisticsCost: cycle.totalCost.toString(),
          avgCostPerParticipant: cycle.avgCostPerParticipant.toString(),
          maxDistanceKm: cycle.maxDistance.toString(),
          avgDistanceKm: cycle.avgDistance.toString(),
          confirmationDeadline,
          completionDeadline,
          totalParticipantsCount: cycle.nodes.length,
          confirmedParticipantsCount: 0,
          dropPointId: dropPoint.id,
          dropPointName: dropPoint.name,
          dropPointAddress: dropPoint.address,
        });

        // Insert participant records
        for (let i = 0; i < cycle.nodes.length; i++) {
          const node = cycle.nodes[i];
          const nextNode = cycle.nodes[(i + 1) % cycle.nodes.length];

          // Calculate individual logistics cost
          const participantCost = calculateLogisticsCost(
            {
              county: node.school.county,
              zone: node.school.zone,
              xCoord: node.school.xCoord,
              yCoord: node.school.yCoord,
            } as Partial<School>,
            {
              county: nextNode.school.county,
              zone: nextNode.school.zone,
              xCoord: nextNode.school.xCoord,
              yCoord: nextNode.school.yCoord,
            } as Partial<School>,
            node.school.id,
            nextNode.school.id
          );

          await db.insert(cycleParticipants).values({
            cycleId,
            userId: node.userId,
            userSchoolId: node.schoolId,
            positionInCycle: i,
            bookToGiveId: node.hasBook.id,
            bookToReceiveId: nextNode.hasBook.id,
            schoolCounty: node.school.county,
            schoolZone: node.school.zone,
            schoolName: node.school.name,
            schoolCoordinatesX: node.school.xCoord.toString(),
            schoolCoordinatesY: node.school.yCoord.toString(),
            logisticsCost: participantCost.toString(),
            status: "pending",
            collectionQrCode: `CYCLE-${cycleId}-USER-${node.userId}`,
          });
        }

        savedCount++;
      } catch (error) {
        console.error(`❌ Error saving cycle:`, error);
      }
    }

    console.log(`✅ Successfully saved ${savedCount}/${cycles.length} cycles`);
  }

  /**
   * Run complete cycle detection and save to database
   *
   * @param maxCycleSize Maximum cycle size (default: 5)
   * @param topN Number of top cycles to save (default: 50)
   * @returns Number of cycles saved
   */
  async detectAndSave(maxCycleSize: number = 5, topN: number = 50): Promise<number> {
    const cycles = await this.findCycles(maxCycleSize);

    // Take top N highest priority cycles
    const topCycles = cycles.slice(0, topN);

    await this.saveCycles(topCycles);

    return topCycles.length;
  }
}

/**
 * Singleton instance
 */
export const cycleDetector = new CycleDetector();
