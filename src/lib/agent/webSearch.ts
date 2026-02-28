/**
 * Web search utilities for the Gyanu AI agent.
 *
 * Features:
 * - Result re-ranking favouring educational resources
 * - Content summarisation beyond metadata titles
 * - In-memory caching with 5-minute TTL
 * - Multiple SearXNG category filters (general, science, images)
 * - DuckDuckGo API fallback when SearXNG is unavailable
 * - Per-session search count enforcement (max 5)
 * - SEARXNG_URL environment variable validation with setup guidance
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResult {
    title: string;
    content: string;
    url: string;
    score: number;
}

export interface CacheEntry {
    results: SearchResult[];
    timestamp: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_SEARCHES_PER_SESSION = 5;
export const MAX_SUMMARY_LENGTH = 200;
export const MAX_RESULTS = 5;

/** Domains that receive a ranking boost (higher = better). */
export const EDUCATIONAL_DOMAINS: Record<string, number> = {
    "ncert.nic.in": 10,
    "wikipedia.org": 10,
    "khanacademy.org": 9,
    "britannica.com": 8,
    "education.gov": 7,
    "scholarpedia.org": 7,
    "byjus.com": 6,
    "toppr.com": 6,
};

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const searchCache = new Map<string, CacheEntry>();

export function getCachedResults(query: string): SearchResult[] | null {
    const key = query.toLowerCase().trim();
    const entry = searchCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        searchCache.delete(key);
        return null;
    }
    return entry.results;
}

export function setCachedResults(query: string, results: SearchResult[]): void {
    const key = query.toLowerCase().trim();
    searchCache.set(key, { results, timestamp: Date.now() });
}

export function clearCache(): void {
    searchCache.clear();
}

/** Visible only for testing – returns raw cache map size. */
export function cacheSize(): number {
    return searchCache.size;
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

/**
 * Re-rank search results by boosting educational domains.
 * Results from recognised educational sites receive a score bonus.
 */
export function rankResults(results: SearchResult[]): SearchResult[] {
    return results
        .map((r) => {
            let bonus = 0;
            if (r.url) {
                for (const [domain, weight] of Object.entries(EDUCATIONAL_DOMAINS)) {
                    if (r.url.includes(domain)) {
                        bonus = weight;
                        break;
                    }
                }
            }
            return { ...r, score: (r.score || 0) + bonus };
        })
        .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Content summarisation
// ---------------------------------------------------------------------------

/** Truncate content to `maxLength` characters on a word boundary. */
export function summarizeContent(content: string, maxLength: number = MAX_SUMMARY_LENGTH): string {
    if (!content) return "";
    if (content.length <= maxLength) return content;
    const truncated = content.slice(0, maxLength).replace(/\s+\S*$/, "");
    return truncated + "...";
}

// ---------------------------------------------------------------------------
// Search category helpers
// ---------------------------------------------------------------------------

/**
 * Pick SearXNG categories based on the user's subject context.
 * Falls back to `["general"]` when no subject is provided.
 */
export function categoriesToSearch(subject?: string): string[] {
    if (!subject) return ["general"];
    const s = subject.toLowerCase();
    if (["science", "physics", "chemistry", "biology"].includes(s)) {
        return ["general", "science"];
    }
    if (["art", "drawing", "painting"].includes(s)) {
        return ["general", "images"];
    }
    return ["general"];
}

// ---------------------------------------------------------------------------
// SearXNG search
// ---------------------------------------------------------------------------

export async function searchSearXNG(
    searxngUrl: string,
    query: string,
    categories: string[] = ["general"],
): Promise<SearchResult[]> {
    const categoryParam = categories.join(",");
    const url = `${searxngUrl}/search?q=${encodeURIComponent(query)}&format=json&categories=${encodeURIComponent(categoryParam)}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`SearXNG request failed with status ${response.status}`);
    }

    const data = await response.json();
    return (data.results ?? []).map(
        (r: { title?: string; content?: string; url?: string }) => ({
            title: r.title ?? "",
            content: r.content ?? "",
            url: r.url ?? "",
            score: 0,
        }),
    );
}

// ---------------------------------------------------------------------------
// DuckDuckGo fallback
// ---------------------------------------------------------------------------

export async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`DuckDuckGo request failed with status ${response.status}`);
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    if (data.AbstractText) {
        results.push({
            title: data.Heading || query,
            content: data.AbstractText,
            url: data.AbstractURL || "",
            score: 0,
        });
    }

    for (const topic of (data.RelatedTopics ?? []).slice(0, 4)) {
        if (topic.Text && topic.FirstURL) {
            results.push({
                title: topic.Text.slice(0, 100),
                content: topic.Text,
                url: topic.FirstURL,
                score: 0,
            });
        }
    }

    return results;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format ranked results into a human-readable string with source attribution.
 */
export function formatResults(results: SearchResult[], maxResults: number = MAX_RESULTS): string {
    if (results.length === 0) return "No results found on the web.";

    const ranked = rankResults(results);
    const top = ranked.slice(0, maxResults);

    const formatted = top
        .map((r) => {
            const summary = summarizeContent(r.content);
            const source = r.url ? ` (Source: ${r.url})` : "";
            return `- ${r.title}${summary ? `: ${summary}` : ""}${source}`;
        })
        .join("\n");

    return `Top Web Search Results:\n${formatted}`;
}

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

export function validateSearchConfig(searxngUrl?: string): {
    valid: boolean;
    message: string;
} {
    if (!searxngUrl) {
        return {
            valid: false,
            message:
                "SEARXNG_URL is not configured. To enable web search:\n" +
                "1. Install SearXNG: https://docs.searxng.org/admin/installation.html\n" +
                "2. Set SEARXNG_URL in your .env file (e.g., SEARXNG_URL=http://localhost:8080)\n" +
                "3. Restart your development server after updating .env\n" +
                "DuckDuckGo will be used as a fallback when SearXNG is unavailable.",
        };
    }

    try {
        new URL(searxngUrl);
    } catch {
        return {
            valid: false,
            message: `SEARXNG_URL "${searxngUrl}" is not a valid URL. Please provide a valid URL (e.g., http://localhost:8080).`,
        };
    }

    return { valid: true, message: "Search configuration is valid." };
}
