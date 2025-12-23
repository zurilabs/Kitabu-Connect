# Multilateral Swap Algorithm Implementation Guide

## Overview
This document outlines the complete implementation strategy for Kitabu Connect's intelligent multilateral swap matching system. The algorithm detects 2-way through 5-way book swap cycles and leverages Kenya's school location data to optimize logistics, reduce costs, and improve user experience.

---

## Table of Contents
1. [Core Concept](#core-concept)
2. [School Data Integration](#school-data-integration)
3. [Implementation Phases](#implementation-phases)
4. [Database Schema](#database-schema)
5. [Algorithm Design](#algorithm-design)
6. [API Specifications](#api-specifications)
7. [Frontend Components](#frontend-components)
8. [Cost Structure](#cost-structure)
9. [State Machine Workflow](#state-machine-workflow)
10. [Quality Control](#quality-control)
11. [Testing Strategy](#testing-strategy)
12. [Performance Optimization](#performance-optimization)

---

## Core Concept

### What is Multilateral Swapping?

Instead of limiting users to direct 1-to-1 swaps, the system detects **swap cycles** where multiple users can exchange books in a circular pattern:

**Example 2-Way Swap:**
- User A (has Book X, wants Book Y)
- User B (has Book Y, wants Book X)
- Result: A → B → A

**Example 3-Way Swap:**
- User A (has Book X, wants Book Y)
- User B (has Book Y, wants Book Z)
- User C (has Book Z, wants Book X)
- Result: A → B → C → A

**Example 5-Way Swap:**
- User A (has Book 1, wants Book 2)
- User B (has Book 2, wants Book 3)
- User C (has Book 3, wants Book 4)
- User D (has Book 4, wants Book 5)
- User E (has Book 5, wants Book 1)
- Result: A → B → C → D → E → A

### Key Benefits

1. **Higher Match Rate**: Users find swaps even when direct matches don't exist
2. **Geographic Optimization**: Prioritize same-school swaps (free logistics)
3. **Cost Efficiency**: Minimize transportation costs using school proximity
4. **Faster Fulfillment**: Nearby schools = quicker exchanges
5. **Scalability**: County-based clustering handles millions of users
6. **Trust & Safety**: School verification adds credibility

---

## School Data Integration

### Available School Fields (from schools table)

```typescript
interface School {
  id: string;
  code: number;                    // Official school code
  schoolName: string;              // School name
  level: string;                   // "Primary" | "Secondary"
  status: string;                  // "Public" | "Private"

  // Administrative Hierarchy (Kenya structure)
  county: string;                  // 47 counties
  district: string;                // District level
  zone: string;                    // Educational zone
  subCounty: string;               // Sub-county
  ward: string;                    // Ward (smallest unit)

  // Geographic Coordinates
  xCoord: decimal;                 // Longitude
  yCoord: decimal;                 // Latitude

  source: string;                  // "Ministry of Education, 2016"
}
```

### How Each Field Enhances Matching

#### 1. **Geographic Coordinates (xCoord, yCoord)**
- **Purpose**: Calculate actual distance between schools
- **Method**: Haversine formula
- **Use Case**:
  ```
  Distance between School A and School B = 3.2 km
  → Logistics Cost = KES 50 (nearby school rate)
  ```

#### 2. **Administrative Hierarchy**
- **Purpose**: Geographic clustering and priority scoring
- **Hierarchy**: County > District > Zone > Sub-County > Ward
- **Priority Scores**:
  ```
  Same school     → 100 points (FREE logistics)
  Same ward       → 90 points
  Same zone       → 80 points
  Same sub-county → 70 points
  Same district   → 60 points
  Same county     → 50 points
  Different county→ 20 points
  ```

#### 3. **School Level (Primary/Secondary)**
- **Purpose**: Book appropriateness filtering
- **Logic**:
  ```
  If user from Primary school:
    - Prioritize Primary school books
    - Filter out Secondary-only books

  Universal books (dictionaries, atlases):
    - Available to both levels
  ```

#### 4. **School Status (Public/Private)**
- **Purpose**: Optional user preference filtering
- **Use Case**: Some users prefer swapping within similar school types

---

## Implementation Phases

### Phase 1: Database Schema (Week 1)

#### 1.1 Create swap_cycles Table
Stores detected swap cycles.

```sql
CREATE TABLE swap_cycles (
  id VARCHAR(36) PRIMARY KEY,
  cycle_type VARCHAR(20) NOT NULL,              -- '2-way', '3-way', '4-way', '5-way'
  status VARCHAR(30) NOT NULL,                   -- 'pending_confirmation', 'confirmed', 'active', 'completed', 'cancelled', 'timeout'
  priority_score DECIMAL(5,2) NOT NULL,          -- Calculated score (0-100)

  -- Geographic clustering info
  primary_county VARCHAR(100),                   -- Main county for the cycle
  is_same_county BOOLEAN DEFAULT FALSE,          -- All participants in same county
  is_same_zone BOOLEAN DEFAULT FALSE,            -- All participants in same zone

  -- Cost breakdown
  total_logistics_cost DECIMAL(10,2),            -- Total cost across all participants
  avg_cost_per_participant DECIMAL(10,2),        -- Average cost

  -- Distance metrics
  max_distance_km DECIMAL(10,2),                 -- Longest distance in cycle
  avg_distance_km DECIMAL(10,2),                 -- Average distance

  -- Timeouts and deadlines
  confirmation_deadline DATETIME,                -- 48 hours from creation
  completion_deadline DATETIME,                  -- 7 days from confirmation

  -- Tracking
  confirmed_participants_count INT DEFAULT 0,
  total_participants_count INT NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME,
  completed_at DATETIME,
  cancelled_at DATETIME,

  INDEX idx_status (status),
  INDEX idx_county (primary_county),
  INDEX idx_priority (priority_score DESC),
  INDEX idx_confirmation_deadline (confirmation_deadline)
);
```

#### 1.2 Create cycle_participants Table
Tracks each user's role in a cycle.

```sql
CREATE TABLE cycle_participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cycle_id VARCHAR(36) NOT NULL,

  -- User info
  user_id VARCHAR(36) NOT NULL,
  user_school_id VARCHAR(36) NOT NULL,           -- For quick school lookups

  -- Position in cycle
  position_in_cycle INT NOT NULL,                -- 0, 1, 2, 3, 4 (for visualization)

  -- Books involved
  book_to_give_id INT NOT NULL,                  -- Book they're offering
  book_to_receive_id INT NOT NULL,               -- Book they'll receive

  -- Geographic info (denormalized for performance)
  school_county VARCHAR(100),
  school_zone VARCHAR(100),
  school_name VARCHAR(255),
  school_coordinates_x DECIMAL(10,7),
  school_coordinates_y DECIMAL(10,7),

  -- Drop-off/Collection tracking
  assigned_drop_point_id INT,                    -- Where they drop their book
  assigned_collection_point_id INT,              -- Where they collect new book

  logistics_cost DECIMAL(10,2) DEFAULT 0.00,     -- Their individual cost

  -- Status tracking
  status VARCHAR(30) DEFAULT 'pending',          -- 'pending', 'confirmed', 'book_dropped', 'book_collected', 'completed'
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at DATETIME,

  book_dropped BOOLEAN DEFAULT FALSE,
  dropped_at DATETIME,
  drop_verification_photo_url TEXT,

  book_collected BOOLEAN DEFAULT FALSE,
  collected_at DATETIME,
  collection_verification_photo_url TEXT,
  collection_qr_code VARCHAR(100),               -- Unique QR for collection

  -- Quality verification
  condition_verified BOOLEAN DEFAULT FALSE,
  condition_dispute BOOLEAN DEFAULT FALSE,
  dispute_reason TEXT,

  FOREIGN KEY (cycle_id) REFERENCES swap_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_school_id) REFERENCES schools(id),
  FOREIGN KEY (book_to_give_id) REFERENCES book_listings(id),
  FOREIGN KEY (book_to_receive_id) REFERENCES book_listings(id),

  INDEX idx_cycle (cycle_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_school (user_school_id)
);
```

#### 1.3 Create drop_points Table
Manages physical exchange locations.

```sql
CREATE TABLE drop_points (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cycle_id VARCHAR(36) NOT NULL,

  -- Location info
  school_id VARCHAR(36),                         -- If using school as drop point
  school_name VARCHAR(255),

  -- Address details
  county VARCHAR(100),
  district VARCHAR(100),
  zone VARCHAR(100),
  address_line TEXT,

  coordinates_x DECIMAL(10,7),
  coordinates_y DECIMAL(10,7),

  -- Type of drop point
  point_type VARCHAR(30),                        -- 'school_hub', 'central_location', 'courier_pickup'

  -- Participants using this drop point
  serving_participant_ids JSON,                  -- Array of user IDs

  -- Operating details
  operating_hours VARCHAR(100),                  -- "Mon-Fri 8AM-4PM"
  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),

  -- Status
  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (cycle_id) REFERENCES swap_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id),

  INDEX idx_cycle (cycle_id),
  INDEX idx_school (school_id),
  INDEX idx_county (county)
);
```

#### 1.4 Create user_reliability_scores Table
Gamification and trust scoring.

```sql
CREATE TABLE user_reliability_scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) UNIQUE NOT NULL,

  -- Overall score (0-100)
  reliability_score DECIMAL(5,2) DEFAULT 50.00,

  -- Statistics
  total_swaps_completed INT DEFAULT 0,
  total_swaps_cancelled INT DEFAULT 0,
  total_swaps_disputed INT DEFAULT 0,

  -- Cycle-specific stats
  total_cycles_joined INT DEFAULT 0,
  total_cycles_completed INT DEFAULT 0,
  total_cycles_timeout INT DEFAULT 0,

  -- Timing metrics
  avg_confirmation_time_hours DECIMAL(6,2),      -- How fast they confirm
  avg_drop_off_time_hours DECIMAL(6,2),          -- How fast they drop books

  -- Quality metrics
  on_time_delivery_rate DECIMAL(5,2),            -- % of on-time deliveries
  book_condition_accuracy_rate DECIMAL(5,2),     -- % where condition matched description

  -- Achievements
  badges JSON,                                    -- Array of earned badges

  -- Penalties
  penalty_points INT DEFAULT 0,                  -- Accumulated penalties
  is_suspended BOOLEAN DEFAULT FALSE,
  suspension_reason TEXT,
  suspended_until DATETIME,

  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_reliability_score (reliability_score DESC),
  INDEX idx_user (user_id)
);
```

#### 1.5 Migration File

**File**: `server/db/migrations/003_swap_cycles_schema.sql`

```sql
-- Migration: Multilateral Swap Cycles System
-- Date: 2025-01-22
-- Description: Creates tables for intelligent swap cycle detection and management

-- Drop existing tables (if re-running migration)
DROP TABLE IF EXISTS user_reliability_scores;
DROP TABLE IF EXISTS drop_points;
DROP TABLE IF EXISTS cycle_participants;
DROP TABLE IF EXISTS swap_cycles;

-- Create swap_cycles table
CREATE TABLE swap_cycles (
  -- [Full SQL from above]
);

-- Create cycle_participants table
CREATE TABLE cycle_participants (
  -- [Full SQL from above]
);

-- Create drop_points table
CREATE TABLE drop_points (
  -- [Full SQL from above]
);

-- Create user_reliability_scores table
CREATE TABLE user_reliability_scores (
  -- [Full SQL from above]
);

-- Initialize reliability scores for existing users
INSERT INTO user_reliability_scores (user_id, reliability_score)
SELECT id, 50.00
FROM users
WHERE id NOT IN (SELECT user_id FROM user_reliability_scores);
```

---

### Phase 2: Utility Functions (Week 1-2)

#### 2.1 Haversine Distance Calculator

**File**: `server/utils/geography.ts`

```typescript
/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of point 1 (yCoord from schools table)
 * @param lon1 Longitude of point 1 (xCoord from schools table)
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two schools using their coordinates
 */
export function calculateSchoolDistance(school1: School, school2: School): number {
  if (!school1.xCoord || !school1.yCoord || !school2.xCoord || !school2.yCoord) {
    return Infinity; // No coordinates available
  }

  return calculateDistance(
    Number(school1.yCoord),
    Number(school1.xCoord),
    Number(school2.yCoord),
    Number(school2.xCoord)
  );
}
```

#### 2.2 Geographic Priority Scoring

```typescript
interface School {
  county?: string;
  district?: string;
  zone?: string;
  subCounty?: string;
  ward?: string;
  xCoord?: string | number;
  yCoord?: string | number;
}

/**
 * Calculate geographic priority score based on administrative hierarchy
 * Returns 0-100, where 100 = same school, 0 = very far
 */
export function calculateGeographicPriority(
  school1: School,
  school2: School,
  school1Id: string,
  school2Id: string
): number {
  // Same school = highest priority
  if (school1Id === school2Id) return 100;

  // Same ward = very high priority
  if (school1.ward && school2.ward && school1.ward === school2.ward) {
    return 90;
  }

  // Same zone = high priority
  if (school1.zone && school2.zone && school1.zone === school2.zone) {
    return 80;
  }

  // Same sub-county = good priority
  if (school1.subCounty && school2.subCounty && school1.subCounty === school2.subCounty) {
    return 70;
  }

  // Same district = moderate priority
  if (school1.district && school2.district && school1.district === school2.district) {
    return 60;
  }

  // Same county = acceptable priority
  if (school1.county && school2.county && school1.county === school2.county) {
    return 50;
  }

  // Different county = low priority
  return 20;
}

/**
 * Calculate average geographic priority for a cycle
 */
export function calculateCycleGeographicScore(
  schools: Array<{ school: School; schoolId: string }>
): number {
  if (schools.length < 2) return 0;

  let totalScore = 0;
  let comparisons = 0;

  // Compare each pair of schools in the cycle
  for (let i = 0; i < schools.length; i++) {
    for (let j = i + 1; j < schools.length; j++) {
      totalScore += calculateGeographicPriority(
        schools[i].school,
        schools[j].school,
        schools[i].schoolId,
        schools[j].schoolId
      );
      comparisons++;
    }
  }

  return comparisons > 0 ? totalScore / comparisons : 0;
}
```

#### 2.3 Logistics Cost Calculator

```typescript
/**
 * Calculate logistics cost based on school proximity
 */
export function calculateLogisticsCost(
  school1: School,
  school2: School,
  school1Id: string,
  school2Id: string
): number {
  // Same school = FREE
  if (school1Id === school2Id) return 0;

  // Calculate distance
  const distance = calculateSchoolDistance(school1, school2);

  // If we have coordinates, use distance-based pricing
  if (distance !== Infinity) {
    if (distance <= 5) return 50;    // Within 5km
    if (distance <= 20) return 100;  // Within 20km
    if (distance <= 50) return 200;  // Within 50km
    return 300;                       // Over 50km
  }

  // Fallback to administrative hierarchy if no coordinates
  if (school1.ward === school2.ward) return 50;
  if (school1.zone === school2.zone) return 100;
  if (school1.county === school2.county) return 200;

  return 300; // Different counties
}

/**
 * Calculate total logistics cost for a swap cycle
 */
export function calculateCycleCost(
  participants: Array<{
    school: School;
    schoolId: string;
    nextParticipantSchool: School;
    nextParticipantSchoolId: string;
  }>
): {
  totalCost: number;
  avgCostPerParticipant: number;
  costBreakdown: number[];
} {
  const costs = participants.map(p =>
    calculateLogisticsCost(p.school, p.nextParticipantSchool, p.schoolId, p.nextParticipantSchoolId)
  );

  const totalCost = costs.reduce((sum, cost) => sum + cost, 0);
  const avgCostPerParticipant = totalCost / participants.length;

  return {
    totalCost,
    avgCostPerParticipant: Math.round(avgCostPerParticipant * 100) / 100,
    costBreakdown: costs,
  };
}
```

#### 2.4 School Level Compatibility

```typescript
/**
 * Check if book is appropriate for school level
 */
export function isBookCompatibleWithSchoolLevel(
  bookGrade: string,
  schoolLevel: string
): boolean {
  const primaryGrades = ['1', '2', '3', '4', '5', '6', '7', '8', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
  const secondaryGrades = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
  const universalGrades = ['All Grades', 'General', 'Universal'];

  // Universal books work for everyone
  if (universalGrades.includes(bookGrade)) return true;

  // Primary school
  if (schoolLevel.toLowerCase().includes('primary')) {
    return primaryGrades.some(grade => bookGrade.includes(grade));
  }

  // Secondary school
  if (schoolLevel.toLowerCase().includes('secondary')) {
    return secondaryGrades.some(grade => bookGrade.includes(grade));
  }

  return true; // Default to compatible
}
```

---

### Phase 3: Core Algorithm (Week 2-3)

#### 3.1 Graph Construction

**File**: `server/services/swapCycle.service.ts`

```typescript
import { db } from "../db";
import { bookListings, users, schools, swapCycles, cycleParticipants } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  calculateDistance,
  calculateGeographicPriority,
  calculateLogisticsCost,
  calculateCycleCost,
  isBookCompatibleWithSchoolLevel,
} from "../utils/geography";

interface SwapNode {
  userId: string;
  userName: string;
  schoolId: string;
  school: {
    id: string;
    name: string;
    level: string;
    county: string;
    zone: string;
    xCoord: number;
    yCoord: number;
  };
  hasBook: {
    id: number;
    title: string;
    grade: string;
    condition: string;
  };
  wantsBook: {
    id: number;
    title: string;
    grade: string;
  };
  reliabilityScore: number;
}

interface SwapCycle {
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
}

export class CycleDetector {
  private graph: Map<string, SwapNode[]> = new Map();
  private allNodes: SwapNode[] = [];

  /**
   * Build swap graph from active book listings
   */
  async buildGraph(): Promise<void> {
    // Get all swap-type book listings with status 'active'
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
          eq(bookListings.listingStatus, "active")
        )
      );

    // For each listing, parse what books they want (from willingToSwapFor field)
    for (const { listing, user, school } of swapListings) {
      if (!school || !listing.willingToSwapFor) continue;

      // Parse willingToSwapFor (could be comma-separated titles or IDs)
      const wantedBookTitles = listing.willingToSwapFor
        .split(',')
        .map(s => s.trim().toLowerCase());

      // Find matching books
      const matchingBooks = await db
        .select()
        .from(bookListings)
        .where(
          and(
            eq(bookListings.listingType, "swap"),
            eq(bookListings.listingStatus, "active")
          )
        );

      for (const matchedBook of matchingBooks) {
        // Skip self-matches
        if (matchedBook.sellerId === user.id) continue;

        // Check if title matches what user wants
        const titleMatch = wantedBookTitles.some(wanted =>
          matchedBook.title.toLowerCase().includes(wanted)
        );

        if (titleMatch) {
          const node: SwapNode = {
            userId: user.id,
            userName: user.fullName || 'Unknown',
            schoolId: school.id,
            school: {
              id: school.id,
              name: school.schoolName,
              level: school.level || '',
              county: school.county || '',
              zone: school.zone || '',
              xCoord: Number(school.xCoord) || 0,
              yCoord: Number(school.yCoord) || 0,
            },
            hasBook: {
              id: listing.id,
              title: listing.title,
              grade: listing.classGrade || '',
              condition: listing.condition,
            },
            wantsBook: {
              id: matchedBook.id,
              title: matchedBook.title,
              grade: matchedBook.classGrade || '',
            },
            reliabilityScore: 50, // TODO: Get from user_reliability_scores table
          };

          // Add edge to graph: user -> wantsBookOwnerId
          const key = `${user.id}-${matchedBook.id}`;
          if (!this.graph.has(key)) {
            this.graph.set(key, []);
          }
          this.graph.get(key)!.push(node);
          this.allNodes.push(node);
        }
      }
    }
  }

  /**
   * Find all swap cycles using DFS
   */
  async findCycles(maxCycleSize: number = 5): Promise<SwapCycle[]> {
    await this.buildGraph();

    const cycles: SwapCycle[] = [];
    const visited = new Set<string>();

    // Try starting from each node
    for (const startNode of this.allNodes) {
      if (visited.has(startNode.userId)) continue;

      const path: SwapNode[] = [startNode];
      const pathUserIds = new Set<string>([startNode.userId]);

      this.dfs(startNode, startNode, path, pathUserIds, cycles, maxCycleSize, visited);
    }

    // Sort cycles by priority score
    cycles.sort((a, b) => b.priorityScore - a.priorityScore);

    return cycles;
  }

  /**
   * Depth-first search to find cycles
   */
  private dfs(
    startNode: SwapNode,
    currentNode: SwapNode,
    path: SwapNode[],
    pathUserIds: Set<string>,
    cycles: SwapCycle[],
    maxCycleSize: number,
    visited: Set<string>
  ): void {
    // Get neighbors (users who have the book current user wants)
    const neighbors = this.getNeighbors(currentNode);

    for (const neighbor of neighbors) {
      // Found a cycle!
      if (neighbor.userId === startNode.userId && path.length >= 2) {
        const cycle = this.createCycle([...path]);
        if (cycle) {
          cycles.push(cycle);
        }
        continue;
      }

      // Avoid revisiting nodes in current path
      if (pathUserIds.has(neighbor.userId)) continue;

      // Avoid cycles that are too large
      if (path.length >= maxCycleSize) continue;

      // Continue DFS
      path.push(neighbor);
      pathUserIds.add(neighbor.userId);

      this.dfs(startNode, neighbor, path, pathUserIds, cycles, maxCycleSize, visited);

      // Backtrack
      path.pop();
      pathUserIds.delete(neighbor.userId);
    }
  }

  /**
   * Get neighbors (users who have the book this user wants)
   */
  private getNeighbors(node: SwapNode): SwapNode[] {
    const neighbors: SwapNode[] = [];

    for (const otherNode of this.allNodes) {
      // Check if otherNode has the book that currentNode wants
      if (otherNode.hasBook.id === node.wantsBook.id) {
        neighbors.push(otherNode);
      }
    }

    return neighbors;
  }

  /**
   * Create swap cycle object with scoring
   */
  private createCycle(nodes: SwapNode[]): SwapCycle | null {
    if (nodes.length < 2) return null;

    // Calculate geographic score
    const schoolData = nodes.map(n => ({
      school: {
        county: n.school.county,
        zone: n.school.zone,
        xCoord: n.school.xCoord,
        yCoord: n.school.yCoord,
      } as any,
      schoolId: n.school.id,
    }));

    const geographicScore = this.calculateCycleGeographicScore(schoolData);

    // Calculate costs
    const costData = nodes.map((n, i) => {
      const nextNode = nodes[(i + 1) % nodes.length];
      return {
        school: {
          county: n.school.county,
          zone: n.school.zone,
          xCoord: n.school.xCoord,
          yCoord: n.school.yCoord,
        } as any,
        schoolId: n.school.id,
        nextParticipantSchool: {
          county: nextNode.school.county,
          zone: nextNode.school.zone,
          xCoord: nextNode.school.xCoord,
          yCoord: nextNode.school.yCoord,
        } as any,
        nextParticipantSchoolId: nextNode.school.id,
      };
    });

    const { totalCost, avgCostPerParticipant } = calculateCycleCost(costData);

    // Calculate distances
    const distances: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const nextNode = nodes[(i + 1) % nodes.length];
      const dist = calculateDistance(
        nodes[i].school.yCoord,
        nodes[i].school.xCoord,
        nextNode.school.yCoord,
        nextNode.school.xCoord
      );
      if (dist !== Infinity) distances.push(dist);
    }

    const maxDistance = distances.length > 0 ? Math.max(...distances) : 0;
    const avgDistance = distances.length > 0
      ? distances.reduce((sum, d) => sum + d, 0) / distances.length
      : 0;

    // Check if same county/zone
    const counties = [...new Set(nodes.map(n => n.school.county))];
    const zones = [...new Set(nodes.map(n => n.school.zone))];

    const isSameCounty = counties.length === 1;
    const isSameZone = zones.length === 1;

    // Calculate priority score (weighted)
    const reliabilityScore = nodes.reduce((sum, n) => sum + n.reliabilityScore, 0) / nodes.length;

    const priorityScore =
      (geographicScore * 0.4) +          // 40% weight on geography
      (reliabilityScore * 0.2) +         // 20% weight on reliability
      ((100 - avgCostPerParticipant) * 0.25) + // 25% weight on cost (inverted)
      ((maxDistance < 10 ? 100 : 50) * 0.15);  // 15% weight on distance

    return {
      nodes,
      cycleType: `${nodes.length}-way`,
      priorityScore: Math.round(priorityScore * 100) / 100,
      geographicScore: Math.round(geographicScore * 100) / 100,
      totalCost,
      avgCostPerParticipant,
      isSameCounty,
      isSameZone,
      maxDistance: Math.round(maxDistance * 100) / 100,
      avgDistance: Math.round(avgDistance * 100) / 100,
    };
  }

  private calculateCycleGeographicScore(
    schools: Array<{ school: any; schoolId: string }>
  ): number {
    if (schools.length < 2) return 0;

    let totalScore = 0;
    let comparisons = 0;

    for (let i = 0; i < schools.length; i++) {
      for (let j = i + 1; j < schools.length; j++) {
        totalScore += calculateGeographicPriority(
          schools[i].school,
          schools[j].school,
          schools[i].schoolId,
          schools[j].schoolId
        );
        comparisons++;
      }
    }

    return comparisons > 0 ? totalScore / comparisons : 0;
  }

  /**
   * Save detected cycles to database
   */
  async saveCycles(cycles: SwapCycle[]): Promise<void> {
    for (const cycle of cycles) {
      // Create cycle record
      const cycleId = crypto.randomUUID();

      await db.insert(swapCycles).values({
        id: cycleId,
        cycleType: cycle.cycleType,
        status: 'pending_confirmation',
        priorityScore: cycle.priorityScore.toString(),
        primaryCounty: cycle.nodes[0].school.county,
        isSameCounty: cycle.isSameCounty,
        isSameZone: cycle.isSameZone,
        totalLogisticsCost: cycle.totalCost.toString(),
        avgCostPerParticipant: cycle.avgCostPerParticipant.toString(),
        maxDistanceKm: cycle.maxDistance.toString(),
        avgDistanceKm: cycle.avgDistance.toString(),
        confirmationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        totalParticipantsCount: cycle.nodes.length,
      });

      // Create participant records
      for (let i = 0; i < cycle.nodes.length; i++) {
        const node = cycle.nodes[i];
        const nextNode = cycle.nodes[(i + 1) % cycle.nodes.length];

        const participantCost = calculateLogisticsCost(
          {
            county: node.school.county,
            zone: node.school.zone,
            xCoord: node.school.xCoord,
            yCoord: node.school.yCoord,
          } as any,
          {
            county: nextNode.school.county,
            zone: nextNode.school.zone,
            xCoord: nextNode.school.xCoord,
            yCoord: nextNode.school.yCoord,
          } as any,
          node.school.id,
          nextNode.school.id
        );

        await db.insert(cycleParticipants).values({
          cycleId,
          userId: node.userId,
          userSchoolId: node.schoolId,
          positionInCycle: i,
          bookToGiveId: node.hasBook.id,
          bookToReceiveId: node.wantsBook.id,
          schoolCounty: node.school.county,
          schoolZone: node.school.zone,
          schoolName: node.school.name,
          schoolCoordinatesX: node.school.xCoord.toString(),
          schoolCoordinatesY: node.school.yCoord.toString(),
          logisticsCost: participantCost.toString(),
          status: 'pending',
          collectionQrCode: `CYCLE-${cycleId}-USER-${node.userId}`,
        });
      }
    }
  }
}

export const cycleDetector = new CycleDetector();
```

---

### Phase 4: Matching Logic (Week 3)

#### 4.1 Book Compatibility Matching

```typescript
/**
 * Check if two books are compatible for swapping
 */
function areBooksCompatible(book1: BookListing, book2: BookListing): boolean {
  // Subject compatibility
  if (book1.subject && book2.subject && book1.subject !== book2.subject) {
    return false;
  }

  // Grade compatibility (should be within 1-2 grades)
  const grade1 = extractGradeNumber(book1.classGrade);
  const grade2 = extractGradeNumber(book2.classGrade);

  if (grade1 && grade2 && Math.abs(grade1 - grade2) > 2) {
    return false;
  }

  // Condition compatibility (don't swap "New" for "Fair")
  const conditionRanks = { "New": 4, "Like New": 3, "Good": 2, "Fair": 1 };
  const rank1 = conditionRanks[book1.condition] || 0;
  const rank2 = conditionRanks[book2.condition] || 0;

  if (Math.abs(rank1 - rank2) > 2) {
    return false;
  }

  return true;
}

function extractGradeNumber(gradeStr: string): number | null {
  const match = gradeStr.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}
```

---

### Phase 5: API Routes (Week 4)

**File**: `server/routes/cycles.ts`

```typescript
import { Router } from "express";
import { cycleDetector } from "../services/swapCycle.service";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * POST /api/cycles/detect
 * Run cycle detection algorithm
 */
router.post("/detect", requireAuth, async (req, res) => {
  try {
    const { maxCycleSize = 5 } = req.body;

    const cycles = await cycleDetector.findCycles(maxCycleSize);
    await cycleDetector.saveCycles(cycles);

    res.json({
      success: true,
      message: `Found ${cycles.length} potential swap cycles`,
      cycles: cycles.slice(0, 10), // Return top 10
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/cycles/:id
 * Get cycle details
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Fetch cycle details from database

    res.json({
      success: true,
      cycle: {}, // Cycle data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/cycles/:id/confirm
 * User confirms participation in cycle
 */
router.post("/:id/confirm", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // TODO: Update participant confirmation status

    res.json({
      success: true,
      message: "Cycle participation confirmed",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
```

---

## Cost Structure

### Logistics Cost Tiers

| Distance/Location | Cost per Participant | Description |
|-------------------|---------------------|-------------|
| Same school | **KES 0** (FREE) | Students exchange in person |
| Within 5km | **KES 50** | Nearby schools, easy delivery |
| Within 20km | **KES 100** | Same zone/district |
| Within 50km | **KES 200** | Same county |
| Over 50km | **KES 300** | Different counties, courier required |

### Example Calculations

**3-Way Swap (All Same School)**
- User A → User B → User C → User A
- All at Nairobi Primary School
- Cost: KES 0 × 3 = **KES 0 total** ✅

**3-Way Swap (Same County, Different Schools)**
- User A (Nairobi) → User B (Kiambu, 15km)
- User B (Kiambu) → User C (Nairobi, 15km)
- User C (Nairobi) → User A (Nairobi, same school)
- Cost: KES 100 + KES 100 + KES 0 = **KES 200 total** (KES 67/person)

**5-Way Swap (Cross-County)**
- Nairobi → Mombasa (500km) = KES 300
- Mombasa → Kisumu (600km) = KES 300
- Kisumu → Nakuru (100km) = KES 300
- Nakuru → Eldoret (150km) = KES 300
- Eldoret → Nairobi (300km) = KES 300
- Total: **KES 1,500** (KES 300/person)

---

## State Machine Workflow

```
┌─────────────────────┐
│ CYCLE DETECTED      │
│ (Algorithm finds    │
│  potential match)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ PENDING_CONFIRMATION│◄─────┐
│ • Notify all users  │      │
│ • 48hr deadline     │      │ User confirms
└──────────┬──────────┘      │
           │                 │
           │ All confirmed   │
           ▼                 │
┌─────────────────────┐      │
│ CONFIRMED           │──────┘
│ • Calculate costs   │
│ • Assign drop points│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ ACTIVE (DROP-OFF)   │
│ • Users drop books  │
│ • Photo verification│
│ • 7-day deadline    │
└──────────┬──────────┘
           │
           │ All dropped
           ▼
┌─────────────────────┐
│ ACTIVE (COLLECTION) │
│ • Users collect books│
│ • QR code scan      │
│ • Condition check   │
└──────────┬──────────┘
           │
           │ All collected
           ▼
┌─────────────────────┐
│ COMPLETED           │
│ • Update reliability│
│ • Award badges      │
│ • Release escrow    │
└─────────────────────┘
```

---

## Frontend Components

### CycleMatchCard Component

```typescript
interface CycleMatchCardProps {
  cycle: {
    id: string;
    cycleType: string;
    priorityScore: number;
    participants: Array<{
      userName: string;
      schoolName: string;
      bookToGive: string;
      bookToReceive: string;
    }>;
    totalCost: number;
    avgCostPerParticipant: number;
    isSameSchool: boolean;
  };
  onConfirm: (cycleId: string) => void;
}

// Shows potential swap match with priority score
```

---

## Testing Strategy

1. **Unit Tests**: Test geographic calculations
2. **Integration Tests**: Test full cycle workflow
3. **Performance Tests**: Test with 40,000+ schools
4. **Real Data Tests**: Use actual school coordinates

---

## Next Steps

Start with **Phase 1: Database Schema** by:
1. Adding tables to `server/db/schema/index.ts`
2. Creating migration file `003_swap_cycles_schema.sql`
3. Running migration

Would you like me to begin implementation?
