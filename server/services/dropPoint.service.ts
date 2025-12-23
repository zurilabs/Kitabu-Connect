/**
 * Drop Point Selection Service
 *
 * Intelligently selects optimal drop points for swap cycles based on:
 * - School clustering (minimize total distance for all participants)
 * - Existing drop point availability
 * - Geographic centrality
 */

import { db } from "../db";
import { dropPoints, schools, type School } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { calculateSchoolDistance } from "../utils/geography";

interface ParticipantSchool {
  schoolId: string;
  school: Partial<School>;
}

interface DropPointCandidate {
  id?: string;
  name: string;
  address: string;
  county: string;
  zone: string;
  coordinates: { x: number; y: number } | null;
  totalDistance: number;
  avgDistance: number;
  maxDistance: number;
  isExisting: boolean;
  schoolId?: string;
}

/**
 * Select optimal drop point for a swap cycle
 */
export async function selectOptimalDropPoint(
  participants: ParticipantSchool[]
): Promise<DropPointCandidate> {
  console.log(
    `📍 Selecting drop point for ${participants.length} participants...`
  );

  // Strategy 1: Check if all participants are from the same school
  const schoolIds = participants.map((p) => p.schoolId);
  const uniqueSchoolIds = [...new Set(schoolIds)];

  if (uniqueSchoolIds.length === 1) {
    // All same school - use that school as drop point
    const schoolId = uniqueSchoolIds[0];
    const school = participants[0].school;

    return {
      name: `${school.name} - Library`,
      address: school.address || school.county || "School premises",
      county: school.county || "",
      zone: school.zone || "",
      coordinates: school.xCoord && school.yCoord
        ? { x: Number(school.xCoord), y: Number(school.yCoord) }
        : null,
      totalDistance: 0,
      avgDistance: 0,
      maxDistance: 0,
      isExisting: false,
      schoolId,
    };
  }

  // Strategy 2: Check for existing drop points in the area
  const counties = participants
    .map((p) => p.school.county)
    .filter((c): c is string => !!c);
  const primaryCounty = getMostFrequentCounty(counties);

  if (primaryCounty) {
    const existingDropPoints = await db
      .select()
      .from(dropPoints)
      .where(
        and(eq(dropPoints.county, primaryCounty), eq(dropPoints.isActive, true))
      );

    if (existingDropPoints.length > 0) {
      // Evaluate each existing drop point
      const candidates = existingDropPoints.map((dp) => {
        const distances = calculateDistancesToDropPoint(participants, {
          x: Number(dp.coordinatesX),
          y: Number(dp.coordinatesY),
        });

        return {
          id: dp.id,
          name: dp.name,
          address: dp.address,
          county: dp.county,
          zone: dp.zone,
          coordinates: { x: Number(dp.coordinatesX), y: Number(dp.coordinatesY) },
          totalDistance: distances.total,
          avgDistance: distances.avg,
          maxDistance: distances.max,
          isExisting: true,
        };
      });

      // Return the one with lowest average distance
      candidates.sort((a, b) => a.avgDistance - b.avgDistance);
      return candidates[0];
    }
  }

  // Strategy 3: Calculate geographic centroid
  const centroid = calculateCentroid(participants);

  // Find the school closest to centroid
  const schoolDistances = participants.map((p) => {
    const school = p.school;
    if (!school.xCoord || !school.yCoord || !centroid) {
      return { participant: p, distance: Infinity };
    }

    const distance = calculateDistance(
      Number(school.xCoord),
      Number(school.yCoord),
      centroid.x,
      centroid.y
    );

    return { participant: p, distance };
  });

  schoolDistances.sort((a, b) => a.distance - b.distance);
  const centralSchool = schoolDistances[0].participant.school;

  // Use central school as drop point
  const distances = calculateDistancesToDropPoint(participants, {
    x: Number(centralSchool.xCoord),
    y: Number(centralSchool.yCoord),
  });

  return {
    name: `${centralSchool.name} - Recommended Drop Point`,
    address: centralSchool.address || centralSchool.county || "School premises",
    county: centralSchool.county || "",
    zone: centralSchool.zone || "",
    coordinates: centralSchool.xCoord && centralSchool.yCoord
      ? { x: Number(centralSchool.xCoord), y: Number(centralSchool.yCoord) }
      : null,
    totalDistance: distances.total,
    avgDistance: distances.avg,
    maxDistance: distances.max,
    isExisting: false,
    schoolId: centralSchool.id,
  };
}

/**
 * Create a new drop point in the database
 */
export async function createDropPoint(
  name: string,
  address: string,
  county: string,
  zone: string,
  coordinatesX: number,
  coordinatesY: number,
  schoolId?: string
): Promise<string> {
  const [result] = await db
    .insert(dropPoints)
    .values({
      name,
      address,
      county,
      zone,
      coordinatesX: coordinatesX.toString(),
      coordinatesY: coordinatesY.toString(),
      isActive: true,
      schoolId: schoolId || null,
    })
    .$returningId();

  console.log(`✅ Created drop point: ${name}`);
  return result.id;
}

/**
 * Get or create drop point for a cycle
 */
export async function getOrCreateDropPoint(
  participants: ParticipantSchool[]
): Promise<{ id: string; name: string; address: string }> {
  const optimal = await selectOptimalDropPoint(participants);

  // If it's an existing drop point, return it
  if (optimal.isExisting && optimal.id) {
    return {
      id: optimal.id,
      name: optimal.name,
      address: optimal.address,
    };
  }

  // If it's a school-based drop point, check if it already exists
  if (optimal.schoolId) {
    const [existing] = await db
      .select()
      .from(dropPoints)
      .where(
        and(
          eq(dropPoints.schoolId, optimal.schoolId),
          eq(dropPoints.isActive, true)
        )
      )
      .limit(1);

    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        address: existing.address,
      };
    }
  }

  // Create new drop point
  if (!optimal.coordinates) {
    throw new Error("Cannot create drop point without coordinates");
  }

  const id = await createDropPoint(
    optimal.name,
    optimal.address,
    optimal.county,
    optimal.zone,
    optimal.coordinates.x,
    optimal.coordinates.y,
    optimal.schoolId
  );

  return {
    id,
    name: optimal.name,
    address: optimal.address,
  };
}

/* ================================
   HELPER FUNCTIONS
================================ */

function getMostFrequentCounty(counties: string[]): string | null {
  if (counties.length === 0) return null;

  const counts = new Map<string, number>();
  for (const county of counties) {
    counts.set(county, (counts.get(county) || 0) + 1);
  }

  let maxCount = 0;
  let mostFrequent: string | null = null;

  for (const [county, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = county;
    }
  }

  return mostFrequent;
}

function calculateCentroid(
  participants: ParticipantSchool[]
): { x: number; y: number } | null {
  const validSchools = participants.filter(
    (p) => p.school.xCoord && p.school.yCoord
  );

  if (validSchools.length === 0) return null;

  const sumX = validSchools.reduce(
    (sum, p) => sum + Number(p.school.xCoord),
    0
  );
  const sumY = validSchools.reduce(
    (sum, p) => sum + Number(p.school.yCoord),
    0
  );

  return {
    x: sumX / validSchools.length,
    y: sumY / validSchools.length,
  };
}

function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(y2 - y1);
  const dLon = toRadians(x2 - x1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(y1)) *
      Math.cos(toRadians(y2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function calculateDistancesToDropPoint(
  participants: ParticipantSchool[],
  dropPoint: { x: number; y: number }
): { total: number; avg: number; max: number } {
  const distances = participants
    .filter((p) => p.school.xCoord && p.school.yCoord)
    .map((p) =>
      calculateDistance(
        Number(p.school.xCoord),
        Number(p.school.yCoord),
        dropPoint.x,
        dropPoint.y
      )
    );

  if (distances.length === 0) {
    return { total: 0, avg: 0, max: 0 };
  }

  const total = distances.reduce((sum, d) => sum + d, 0);
  const avg = total / distances.length;
  const max = Math.max(...distances);

  return { total, avg, max };
}
