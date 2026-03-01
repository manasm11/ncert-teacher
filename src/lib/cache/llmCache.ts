/**
 * LLM Cache Layer for Gyanu AI
 *
 * Provides in-memory caching for LLM responses with chapter-based keys and TTL support.
 * Caches identical questions per chapter to avoid redundant API calls.
 *
 * Cache TTLs:
 * - Textbook queries: 24 hours
 * - Web search queries: 1 hour
 *
 * Key format: `chapter:{chapterId}:{normalizedQuery}`
 */

// ---------------------------------------------------------------------------//
// Types
// ---------------------------------------------------------------------------

export interface CacheEntry<T = unknown> {
    value: T;
    timestamp: number;
    ttl: number; // in milliseconds
    cacheType: CacheType;
}

export type CacheType = "textbook" | "web_search";

// ---------------------------------------------------------------------------//
// Constants
// ---------------------------------------------------------------------------

/** 24 hours in milliseconds for textbook query caching */
export const TEXTBOOK_TTL_MS = 24 * 60 * 60 * 1000;

/** 1 hour in milliseconds for web search caching */
export const WEB_SEARCH_TTL_MS = 60 * 60 * 1000;

// ---------------------------------------------------------------------------//
// In-Memory Cache Store
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

// ---------------------------------------------------------------------------//
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Normalizes a query string for cache key generation.
 * - Converts to lowercase
 * - Trims whitespace
 * - Removes extra spaces
 */
export function normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Generates a cache key for textbook/LLM queries.
 * Format: `chapter:{chapterId}:{normalizedQuery}`
 */
export function generateCacheKey(chapterId: string | number, query: string): string {
    const normalized = normalizeQuery(query);
    return `chapter:${chapterId}:${normalized}`;
}

/**
 * Generates a cache key for web search queries.
 * Format: `web_search:{normalizedQuery}`
 */
export function generateWebSearchCacheKey(query: string): string {
    const normalized = normalizeQuery(query);
    return `web_search:${normalized}`;
}

// ---------------------------------------------------------------------------//
// Cache Operations
// ---------------------------------------------------------------------------

/**
 * Retrieves a value from the cache if it exists and hasn't expired.
 * @param key - The cache key to look up
 * @returns The cached value if valid, or null if expired/missing
 */
export function getCache<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
        // Expired - remove from cache
        cache.delete(key);
        return null;
    }

    return entry.value as T;
}

/**
 * Retrieves a value from the cache if it exists and hasn't expired (generic version).
 * @param key - The cache key to look up
 * @param ttl - The TTL to use for expiration check
 * @returns The cached value if valid, or null if expired/missing
 */
export function getCacheWithTTL<T>(key: string, ttl: number): T | null {
    const entry = cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > ttl) {
        cache.delete(key);
        return null;
    }

    return entry.value as T;
}

/**
 * Stores a value in the cache.
 * @param key - The cache key
 * @param value - The value to cache
 * @param ttl - Time-to-live in milliseconds
 * @param cacheType - The type of cache entry (for tracking)
 */
export function setCache<T>(
    key: string,
    value: T,
    ttl: number = TEXTBOOK_TTL_MS,
    cacheType: CacheType = "textbook"
): void {
    cache.set(key, {
        value,
        timestamp: Date.now(),
        ttl,
        cacheType,
    });
}

/**
 * Checks if a cache entry exists and is not expired.
 * @param key - The cache key to check
 * @returns true if the cache entry exists and is valid
 */
export function hasCache(key: string): boolean {
    const entry = cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
        cache.delete(key);
        return false;
    }

    return true;
}

/**
 * Deletes a specific cache entry.
 * @param key - The cache key to delete
 * @returns true if the entry was deleted, false if it didn't exist
 */
export function deleteCache(key: string): boolean {
    return cache.delete(key);
}

/**
 * Deletes all cache entries matching a prefix pattern.
 * Useful for clearing cache for a specific chapter.
 * @param prefix - The prefix to match
 * @returns Number of entries deleted
 */
export function deleteCacheByPrefix(prefix: string): number {
    let deleted = 0;
    const keys = Array.from(cache.keys());
    for (const key of keys) {
        if (key.startsWith(prefix)) {
            cache.delete(key);
            deleted++;
        }
    }
    return deleted;
}

/**
 * Clears all cache entries.
 */
export function clearCache(): void {
    cache.clear();
}

// ---------------------------------------------------------------------------//
// Statistics & Monitoring
// ---------------------------------------------------------------------------

/**
 * Gets cache statistics for monitoring.
 */
export function getCacheStats(): {
    size: number;
    textbookCount: number;
    webSearchCount: number;
    approximateSizeBytes: number;
} {
    let textbookCount = 0;
    let webSearchCount = 0;
    let totalBytes = 0;

    cache.forEach((entry) => {
        if (entry.cacheType === "textbook") {
            textbookCount++;
        } else {
            webSearchCount++;
        }

        // Approximate size calculation (JSON stringified size)
        totalBytes += JSON.stringify(entry).length;
    });

    return {
        size: cache.size,
        textbookCount,
        webSearchCount,
        approximateSizeBytes: totalBytes,
    };
}

/**
 * Gets the number of expired entries in the cache without removing them.
 * Note: This is a O(n) operation.
 */
export function countExpiredEntries(): number {
    let expired = 0;
    const now = Date.now();

    cache.forEach((entry) => {
        if (now - entry.timestamp > entry.ttl) {
            expired++;
        }
    });

    return expired;
}

// ---------------------------------------------------------------------------//
// Export
// ---------------------------------------------------------------------------

export default {
    getCache,
    getCacheWithTTL,
    setCache,
    hasCache,
    deleteCache,
    deleteCacheByPrefix,
    clearCache,
    getCacheStats,
    countExpiredEntries,
    normalizeQuery,
    generateCacheKey,
    generateWebSearchCacheKey,
    TEXTBOOK_TTL_MS,
    WEB_SEARCH_TTL_MS,
};
