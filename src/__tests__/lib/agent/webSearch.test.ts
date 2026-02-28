import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    rankResults,
    summarizeContent,
    getCachedResults,
    setCachedResults,
    clearCache,
    cacheSize,
    searchSearXNG,
    searchDuckDuckGo,
    formatResults,
    validateSearchConfig,
    categoriesToSearch,
    CACHE_TTL_MS,
    MAX_SEARCHES_PER_SESSION,
    MAX_SUMMARY_LENGTH,
    MAX_RESULTS,
    EDUCATIONAL_DOMAINS,
    type SearchResult,
} from "@/lib/agent/webSearch";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
    return {
        title: "Test Result",
        content: "Some content here",
        url: "https://example.com",
        score: 0,
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// rankResults
// ---------------------------------------------------------------------------

describe("rankResults", () => {
    it("boosts results from wikipedia.org", () => {
        const results = [
            makeResult({ title: "Blog", url: "https://randomblog.com/post", score: 0 }),
            makeResult({ title: "Wiki", url: "https://en.wikipedia.org/wiki/Test", score: 0 }),
        ];
        const ranked = rankResults(results);
        expect(ranked[0].title).toBe("Wiki");
        expect(ranked[0].score).toBe(EDUCATIONAL_DOMAINS["wikipedia.org"]);
    });

    it("boosts results from ncert.nic.in", () => {
        const results = [
            makeResult({ title: "Random", url: "https://random.com", score: 0 }),
            makeResult({ title: "NCERT", url: "https://ncert.nic.in/textbook.php", score: 0 }),
        ];
        const ranked = rankResults(results);
        expect(ranked[0].title).toBe("NCERT");
        expect(ranked[0].score).toBe(10);
    });

    it("boosts results from khanacademy.org", () => {
        const results = [
            makeResult({ title: "Other", url: "https://other.com", score: 0 }),
            makeResult({ title: "Khan", url: "https://www.khanacademy.org/math", score: 0 }),
        ];
        const ranked = rankResults(results);
        expect(ranked[0].title).toBe("Khan");
        expect(ranked[0].score).toBe(9);
    });

    it("preserves original score alongside bonus", () => {
        const results = [
            makeResult({ title: "High Score", url: "https://other.com", score: 20 }),
            makeResult({ title: "Wiki", url: "https://en.wikipedia.org/wiki/X", score: 5 }),
        ];
        const ranked = rankResults(results);
        // High Score: 20 + 0 = 20, Wiki: 5 + 10 = 15
        expect(ranked[0].title).toBe("High Score");
        expect(ranked[0].score).toBe(20);
        expect(ranked[1].score).toBe(15);
    });

    it("sorts by descending score", () => {
        const results = [
            makeResult({ title: "Low", url: "https://low.com", score: 1 }),
            makeResult({ title: "Mid", url: "https://britannica.com/article", score: 0 }),
            makeResult({ title: "High", url: "https://ncert.nic.in/page", score: 2 }),
        ];
        const ranked = rankResults(results);
        expect(ranked.map(r => r.title)).toEqual(["High", "Mid", "Low"]);
    });

    it("handles empty array", () => {
        expect(rankResults([])).toEqual([]);
    });

    it("handles results with missing url gracefully", () => {
        const results = [makeResult({ title: "No URL", url: "", score: 5 })];
        const ranked = rankResults(results);
        expect(ranked[0].score).toBe(5);
    });

    it("only applies one domain bonus per result", () => {
        // URL can't contain two domains, but ensure loop breaks after first match
        const results = [
            makeResult({ url: "https://wikipedia.org/khanacademy.org", score: 0 }),
        ];
        const ranked = rankResults(results);
        // Should only get the wikipedia bonus (10), not both
        expect(ranked[0].score).toBe(10);
    });
});

// ---------------------------------------------------------------------------
// summarizeContent
// ---------------------------------------------------------------------------

describe("summarizeContent", () => {
    it("returns empty string for empty input", () => {
        expect(summarizeContent("")).toBe("");
    });

    it("returns content unchanged if within max length", () => {
        const short = "Hello world";
        expect(summarizeContent(short)).toBe(short);
    });

    it("returns content unchanged at exactly max length", () => {
        const exact = "a".repeat(MAX_SUMMARY_LENGTH);
        expect(summarizeContent(exact)).toBe(exact);
    });

    it("truncates long content on word boundary with ellipsis", () => {
        const long = "word ".repeat(100); // 500 chars
        const result = summarizeContent(long);
        expect(result.length).toBeLessThanOrEqual(MAX_SUMMARY_LENGTH + 5); // +5 for "..."
        expect(result.endsWith("...")).toBe(true);
    });

    it("respects custom maxLength parameter", () => {
        const text = "The quick brown fox jumps over the lazy dog";
        const result = summarizeContent(text, 20);
        expect(result.length).toBeLessThanOrEqual(25); // 20 + "..."
        expect(result.endsWith("...")).toBe(true);
    });

    it("handles single long word by truncating", () => {
        const text = "a".repeat(300);
        const result = summarizeContent(text, 50);
        expect(result.endsWith("...")).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Cache: getCachedResults / setCachedResults / clearCache / cacheSize
// ---------------------------------------------------------------------------

describe("search cache", () => {
    beforeEach(() => {
        clearCache();
    });

    it("returns null for uncached query", () => {
        expect(getCachedResults("unknown query")).toBeNull();
    });

    it("stores and retrieves results", () => {
        const results = [makeResult({ title: "Cached" })];
        setCachedResults("my query", results);
        const cached = getCachedResults("my query");
        expect(cached).toEqual(results);
    });

    it("is case-insensitive", () => {
        setCachedResults("PhotoSynthesis", [makeResult()]);
        expect(getCachedResults("photosynthesis")).not.toBeNull();
        expect(getCachedResults("PHOTOSYNTHESIS")).not.toBeNull();
    });

    it("trims whitespace from keys", () => {
        setCachedResults("  hello  ", [makeResult()]);
        expect(getCachedResults("hello")).not.toBeNull();
    });

    it("expires entries after CACHE_TTL_MS", () => {
        const results = [makeResult()];
        setCachedResults("test", results);

        // Advance time past TTL
        const now = Date.now();
        vi.spyOn(Date, "now").mockReturnValue(now + CACHE_TTL_MS + 1);

        expect(getCachedResults("test")).toBeNull();

        vi.restoreAllMocks();
    });

    it("returns cached results within TTL window", () => {
        const results = [makeResult()];
        setCachedResults("test", results);

        const now = Date.now();
        vi.spyOn(Date, "now").mockReturnValue(now + CACHE_TTL_MS - 1000);

        expect(getCachedResults("test")).toEqual(results);

        vi.restoreAllMocks();
    });

    it("clearCache removes all entries", () => {
        setCachedResults("a", [makeResult()]);
        setCachedResults("b", [makeResult()]);
        expect(cacheSize()).toBe(2);

        clearCache();
        expect(cacheSize()).toBe(0);
    });

    it("cacheSize returns correct count", () => {
        expect(cacheSize()).toBe(0);
        setCachedResults("one", [makeResult()]);
        expect(cacheSize()).toBe(1);
        setCachedResults("two", [makeResult()]);
        expect(cacheSize()).toBe(2);
    });

    it("removes expired entry from cache map on access", () => {
        setCachedResults("old", [makeResult()]);
        expect(cacheSize()).toBe(1);

        const now = Date.now();
        vi.spyOn(Date, "now").mockReturnValue(now + CACHE_TTL_MS + 1);
        getCachedResults("old"); // triggers cleanup
        expect(cacheSize()).toBe(0);

        vi.restoreAllMocks();
    });
});

// ---------------------------------------------------------------------------
// categoriesToSearch
// ---------------------------------------------------------------------------

describe("categoriesToSearch", () => {
    it("returns ['general'] when no subject provided", () => {
        expect(categoriesToSearch()).toEqual(["general"]);
        expect(categoriesToSearch(undefined)).toEqual(["general"]);
    });

    it("returns ['general', 'science'] for science subjects", () => {
        expect(categoriesToSearch("Science")).toEqual(["general", "science"]);
        expect(categoriesToSearch("physics")).toEqual(["general", "science"]);
        expect(categoriesToSearch("Chemistry")).toEqual(["general", "science"]);
        expect(categoriesToSearch("BIOLOGY")).toEqual(["general", "science"]);
    });

    it("returns ['general', 'images'] for art subjects", () => {
        expect(categoriesToSearch("Art")).toEqual(["general", "images"]);
        expect(categoriesToSearch("drawing")).toEqual(["general", "images"]);
        expect(categoriesToSearch("Painting")).toEqual(["general", "images"]);
    });

    it("returns ['general'] for other subjects", () => {
        expect(categoriesToSearch("History")).toEqual(["general"]);
        expect(categoriesToSearch("Math")).toEqual(["general"]);
        expect(categoriesToSearch("English")).toEqual(["general"]);
    });
});

// ---------------------------------------------------------------------------
// searchSearXNG
// ---------------------------------------------------------------------------

describe("searchSearXNG", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("calls SearXNG API with correct URL and categories", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                results: [
                    { title: "Result 1", content: "Content 1", url: "https://example.com/1" },
                ],
            }),
        });
        global.fetch = mockFetch;

        await searchSearXNG("http://search.local", "test query", ["general", "science"]);

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("http://search.local/search"),
        );
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("q=test%20query"),
        );
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("categories=general%2Cscience"),
        );
    });

    it("returns mapped SearchResult objects", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                results: [
                    { title: "Title", content: "Content", url: "https://example.com" },
                ],
            }),
        });

        const results = await searchSearXNG("http://search.local", "query");
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({
            title: "Title",
            content: "Content",
            url: "https://example.com",
            score: 0,
        });
    });

    it("handles missing fields in SearXNG results", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                results: [{ title: "Only Title" }],
            }),
        });

        const results = await searchSearXNG("http://search.local", "query");
        expect(results[0].content).toBe("");
        expect(results[0].url).toBe("");
    });

    it("throws on non-OK response", async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

        await expect(
            searchSearXNG("http://search.local", "query"),
        ).rejects.toThrow("SearXNG request failed");
    });

    it("returns empty array when no results field", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });

        const results = await searchSearXNG("http://search.local", "query");
        expect(results).toEqual([]);
    });

    it("defaults categories to ['general']", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ results: [] }),
        });
        global.fetch = mockFetch;

        await searchSearXNG("http://search.local", "query");

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("categories=general"),
        );
    });
});

// ---------------------------------------------------------------------------
// searchDuckDuckGo
// ---------------------------------------------------------------------------

describe("searchDuckDuckGo", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("calls DuckDuckGo API with correct URL", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                AbstractText: "The answer",
                Heading: "Test",
                AbstractURL: "https://ddg.com",
                RelatedTopics: [],
            }),
        });
        global.fetch = mockFetch;

        await searchDuckDuckGo("photosynthesis");

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("api.duckduckgo.com"),
        );
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("q=photosynthesis"),
        );
    });

    it("returns AbstractText as first result", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                AbstractText: "Plants convert sunlight",
                Heading: "Photosynthesis",
                AbstractURL: "https://en.wikipedia.org/wiki/Photosynthesis",
                RelatedTopics: [],
            }),
        });

        const results = await searchDuckDuckGo("photosynthesis");
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe("Photosynthesis");
        expect(results[0].content).toBe("Plants convert sunlight");
        expect(results[0].url).toBe("https://en.wikipedia.org/wiki/Photosynthesis");
    });

    it("includes RelatedTopics in results", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                AbstractText: "",
                RelatedTopics: [
                    { Text: "Topic 1 text", FirstURL: "https://url1.com" },
                    { Text: "Topic 2 text", FirstURL: "https://url2.com" },
                ],
            }),
        });

        const results = await searchDuckDuckGo("query");
        expect(results).toHaveLength(2);
        expect(results[0].content).toBe("Topic 1 text");
        expect(results[1].url).toBe("https://url2.com");
    });

    it("limits RelatedTopics to 4", async () => {
        const topics = Array.from({ length: 10 }, (_, i) => ({
            Text: `Topic ${i}`,
            FirstURL: `https://url${i}.com`,
        }));

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ AbstractText: "", RelatedTopics: topics }),
        });

        const results = await searchDuckDuckGo("query");
        expect(results).toHaveLength(4);
    });

    it("skips RelatedTopics without Text or FirstURL", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                AbstractText: "",
                RelatedTopics: [
                    { Text: "Valid", FirstURL: "https://valid.com" },
                    { Text: "", FirstURL: "https://empty-text.com" },
                    { FirstURL: "https://no-text.com" },
                    { Text: "No URL" },
                ],
            }),
        });

        const results = await searchDuckDuckGo("query");
        expect(results).toHaveLength(1);
        expect(results[0].content).toBe("Valid");
    });

    it("throws on non-OK response", async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 });

        await expect(searchDuckDuckGo("query")).rejects.toThrow("DuckDuckGo request failed");
    });

    it("returns empty array when no abstract and no topics", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ AbstractText: "", RelatedTopics: [] }),
        });

        const results = await searchDuckDuckGo("query");
        expect(results).toEqual([]);
    });

    it("uses query as title fallback when Heading is missing", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                AbstractText: "Some text",
                Heading: "",
                AbstractURL: "https://test.com",
                RelatedTopics: [],
            }),
        });

        const results = await searchDuckDuckGo("my query");
        expect(results[0].title).toBe("my query");
    });
});

// ---------------------------------------------------------------------------
// formatResults
// ---------------------------------------------------------------------------

describe("formatResults", () => {
    it("returns no-results message for empty array", () => {
        expect(formatResults([])).toBe("No results found on the web.");
    });

    it("formats results with titles and content summaries", () => {
        const results = [
            makeResult({ title: "Test Title", content: "Short content", url: "https://test.com" }),
        ];
        const formatted = formatResults(results);
        expect(formatted).toContain("Top Web Search Results:");
        expect(formatted).toContain("Test Title");
        expect(formatted).toContain("Short content");
        expect(formatted).toContain("(Source: https://test.com)");
    });

    it("ranks educational results higher", () => {
        const results = [
            makeResult({ title: "Blog", url: "https://blog.com", content: "Blog post", score: 0 }),
            makeResult({ title: "Wiki", url: "https://wikipedia.org/article", content: "Wiki article", score: 0 }),
        ];
        const formatted = formatResults(results);
        // Wiki should appear before Blog due to ranking
        const wikiPos = formatted.indexOf("Wiki");
        const blogPos = formatted.indexOf("Blog");
        expect(wikiPos).toBeLessThan(blogPos);
    });

    it("limits to maxResults", () => {
        const results = Array.from({ length: 10 }, (_, i) =>
            makeResult({ title: `Result ${i}`, content: `Content ${i}` }),
        );
        const formatted = formatResults(results, 3);
        const matches = formatted.match(/^- /gm);
        expect(matches).toHaveLength(3);
    });

    it("uses MAX_RESULTS by default", () => {
        const results = Array.from({ length: 10 }, (_, i) =>
            makeResult({ title: `Result ${i}`, content: `Content ${i}` }),
        );
        const formatted = formatResults(results);
        const matches = formatted.match(/^- /gm);
        expect(matches!.length).toBeLessThanOrEqual(MAX_RESULTS);
    });

    it("truncates long content in summaries", () => {
        const longContent = "word ".repeat(100);
        const results = [makeResult({ title: "Long", content: longContent })];
        const formatted = formatResults(results);
        expect(formatted).toContain("...");
        // Should not contain the full content
        expect(formatted.length).toBeLessThan(longContent.length + 100);
    });

    it("handles results with empty URL", () => {
        const results = [makeResult({ title: "No URL", url: "", content: "Content" })];
        const formatted = formatResults(results);
        expect(formatted).not.toContain("Source:");
        expect(formatted).toContain("No URL");
    });
});

// ---------------------------------------------------------------------------
// validateSearchConfig
// ---------------------------------------------------------------------------

describe("validateSearchConfig", () => {
    it("returns invalid when no URL is provided", () => {
        const result = validateSearchConfig(undefined);
        expect(result.valid).toBe(false);
        expect(result.message).toContain("SEARXNG_URL is not configured");
        expect(result.message).toContain("SearXNG");
        expect(result.message).toContain("DuckDuckGo");
    });

    it("returns invalid for empty string", () => {
        const result = validateSearchConfig("");
        expect(result.valid).toBe(false);
    });

    it("returns invalid for malformed URL", () => {
        const result = validateSearchConfig("not-a-url");
        expect(result.valid).toBe(false);
        expect(result.message).toContain("not a valid URL");
    });

    it("returns valid for correct URL", () => {
        const result = validateSearchConfig("http://localhost:8080");
        expect(result.valid).toBe(true);
        expect(result.message).toContain("valid");
    });

    it("returns valid for HTTPS URL", () => {
        const result = validateSearchConfig("https://search.example.com");
        expect(result.valid).toBe(true);
    });

    it("includes setup guidance in invalid message", () => {
        const result = validateSearchConfig(undefined);
        expect(result.message).toContain("Install SearXNG");
        expect(result.message).toContain(".env");
        expect(result.message).toContain("Restart");
    });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("constants", () => {
    it("CACHE_TTL_MS is 5 minutes", () => {
        expect(CACHE_TTL_MS).toBe(5 * 60 * 1000);
    });

    it("MAX_SEARCHES_PER_SESSION is 5", () => {
        expect(MAX_SEARCHES_PER_SESSION).toBe(5);
    });

    it("MAX_SUMMARY_LENGTH is 200", () => {
        expect(MAX_SUMMARY_LENGTH).toBe(200);
    });

    it("MAX_RESULTS is 5", () => {
        expect(MAX_RESULTS).toBe(5);
    });

    it("EDUCATIONAL_DOMAINS has expected entries", () => {
        expect(EDUCATIONAL_DOMAINS).toHaveProperty("wikipedia.org");
        expect(EDUCATIONAL_DOMAINS).toHaveProperty("ncert.nic.in");
        expect(EDUCATIONAL_DOMAINS).toHaveProperty("khanacademy.org");
        expect(EDUCATIONAL_DOMAINS).toHaveProperty("britannica.com");
    });
});
