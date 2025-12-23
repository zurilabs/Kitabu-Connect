/**
 * Cache Service
 *
 * In-memory caching for frequently accessed data:
 * - School location data
 * - User reliability scores
 * - Active swap listings
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every 5 minutes
    this.startCleanup();
  }

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, data: T, ttlMs: number = 15 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Get cache entry (returns null if expired or not found)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Cache cleanup: Removed ${removed} expired entries`);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Stop cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();

/* ================================
   HELPER FUNCTIONS
================================ */

/**
 * School location cache (15 minute TTL)
 */
export function cacheSchoolLocation(schoolId: string, data: any): void {
  cacheService.set(`school:${schoolId}`, data, 15 * 60 * 1000);
}

export function getCachedSchoolLocation(schoolId: string): any | null {
  return cacheService.get(`school:${schoolId}`);
}

/**
 * User reliability score cache (5 minute TTL)
 */
export function cacheReliabilityScore(userId: string, data: any): void {
  cacheService.set(`reliability:${userId}`, data, 5 * 60 * 1000);
}

export function getCachedReliabilityScore(userId: string): any | null {
  return cacheService.get(`reliability:${userId}`);
}

/**
 * Active swap listings cache (2 minute TTL)
 */
export function cacheActiveListings(data: any[]): void {
  cacheService.set('active:listings', data, 2 * 60 * 1000);
}

export function getCachedActiveListings(): any[] | null {
  return cacheService.get('active:listings');
}

/**
 * Cycle detection results cache (30 minute TTL)
 */
export function cacheCycleDetection(userId: string, data: any): void {
  cacheService.set(`cycles:${userId}`, data, 30 * 60 * 1000);
}

export function getCachedCycleDetection(userId: string): any | null {
  return cacheService.get(`cycles:${userId}`);
}

/**
 * Invalidate user-specific caches when data changes
 */
export function invalidateUserCache(userId: string): void {
  cacheService.delete(`reliability:${userId}`);
  cacheService.delete(`cycles:${userId}`);
  console.log(`🔄 Invalidated cache for user ${userId}`);
}

/**
 * Invalidate school cache when data changes
 */
export function invalidateSchoolCache(schoolId: string): void {
  cacheService.delete(`school:${schoolId}`);
  console.log(`🔄 Invalidated cache for school ${schoolId}`);
}
