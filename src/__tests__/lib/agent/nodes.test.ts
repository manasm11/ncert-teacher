import { describe, it, expect, vi, beforeEach } from "vitest";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// Clear all mock call history before every test
beforeEach(() => {
    vi.clearAllMocks();
});

// Mock LLM instances
const mockQwenRouter = {
    withStructuredOutput: vi.fn(),
    invoke: vi.fn(),
};
const mockDeepseekReasoner = {
    invoke: vi.fn(),
};

// Mock the LLM module before importing nodes
vi.mock("@/lib/agent/llm", () => ({
    getQwenRouter: () => mockQwenRouter,
    getDeepseekReasoner: () => mockDeepseekReasoner,
}));

// Mock the env module
vi.mock("@/lib/env", () => ({
    clientEnv: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
    },
    serverEnv: {
        OLLAMA_CLOUD_API_KEY: "test-key",
        OLLAMA_CLOUD_ENDPOINT: "http://localhost:11434",
        SEARXNG_URL: undefined,
    },
}));

// Mock the vector store module used by textbookRetrievalNode
const mockSimilaritySearch = vi.fn();
vi.mock("@/lib/rag/vectorStore", () => ({
    similaritySearch: (...args: unknown[]) => mockSimilaritySearch(...args),
}));

// Mock the webSearch module used by webSearchNode
const mockGetCachedResults = vi.fn();
const mockSetCachedResults = vi.fn();
const mockSearchSearXNG = vi.fn();
const mockSearchDuckDuckGo = vi.fn();
const mockFormatResults = vi.fn();
const mockValidateSearchConfig = vi.fn();
const mockCategoriesToSearch = vi.fn();
vi.mock("@/lib/agent/webSearch", () => ({
    getCachedResults: (...args: unknown[]) => mockGetCachedResults(...args),
    setCachedResults: (...args: unknown[]) => mockSetCachedResults(...args),
    searchSearXNG: (...args: unknown[]) => mockSearchSearXNG(...args),
    searchDuckDuckGo: (...args: unknown[]) => mockSearchDuckDuckGo(...args),
    formatResults: (...args: unknown[]) => mockFormatResults(...args),
    validateSearchConfig: (...args: unknown[]) => mockValidateSearchConfig(...args),
    categoriesToSearch: (...args: unknown[]) => mockCategoriesToSearch(...args),
    MAX_SEARCHES_PER_SESSION: 5,
}));

import {
    routerNode,
    textbookRetrievalNode,
    webSearchNode,
    heavyReasoningNode,
    synthesisNode,
} from "@/lib/agent/nodes";
import { serverEnv } from "@/lib/env";

describe("textbookRetrievalNode", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calls similaritySearch with user query and context filters", async () => {
        mockSimilaritySearch.mockResolvedValue([
            {
                id: "uuid-1",
                content: "Photosynthesis is the process by which plants make food.",
                subject: "Science",
                grade: "6",
                chapter: "Chapter 1",
                heading_hierarchy: ["Biology", "Photosynthesis"],
                similarity: 0.95,
            },
        ]);

        const state = {
            messages: [new HumanMessage("What is photosynthesis?")],
            userContext: { subject: "Science", classGrade: "6", chapter: "Chapter 1" },
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await textbookRetrievalNode(state);

        expect(mockSimilaritySearch).toHaveBeenCalledWith(
            "What is photosynthesis?",
            5,
            { subject: "Science", grade: "6", chapter: "Chapter 1" },
        );
        expect(result.retrievedContext).toContain("Photosynthesis is the process");
    });

    it("extracts query from router system message", async () => {
        mockSimilaritySearch.mockResolvedValue([
            {
                id: "uuid-1",
                content: "Content about the topic.",
                subject: "Science",
                grade: "6",
                chapter: "Chapter 1",
                heading_hierarchy: [],
                similarity: 0.9,
            },
        ]);

        const state = {
            messages: [
                new HumanMessage("Tell me about cells"),
                new SystemMessage("ROUTER DECISION: Textbook retrieval for: cell biology basics"),
            ],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        await textbookRetrievalNode(state);

        expect(mockSimilaritySearch).toHaveBeenCalledWith(
            "cell biology basics",
            5,
            expect.any(Object),
        );
    });

    it("formats multiple results with indices and heading hierarchy", async () => {
        mockSimilaritySearch.mockResolvedValue([
            {
                id: "uuid-1",
                content: "First chunk content.",
                subject: "Science",
                grade: "6",
                chapter: "Ch1",
                heading_hierarchy: ["Biology", "Cells"],
                similarity: 0.95,
            },
            {
                id: "uuid-2",
                content: "Second chunk content.",
                subject: "Science",
                grade: "6",
                chapter: "Ch1",
                heading_hierarchy: ["Biology", "Cells", "Types"],
                similarity: 0.88,
            },
        ]);

        const state = {
            messages: [new HumanMessage("Tell me about cells")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await textbookRetrievalNode(state);

        expect(result.retrievedContext).toContain("[1]");
        expect(result.retrievedContext).toContain("[2]");
        expect(result.retrievedContext).toContain("Biology > Cells");
        expect(result.retrievedContext).toContain("Biology > Cells > Types");
        expect(result.retrievedContext).toContain("First chunk content.");
        expect(result.retrievedContext).toContain("Second chunk content.");
    });

    it("returns no-results message when search returns empty", async () => {
        mockSimilaritySearch.mockResolvedValue([]);

        const state = {
            messages: [new HumanMessage("obscure topic")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await textbookRetrievalNode(state);

        expect(result.retrievedContext).toContain("No relevant textbook content found");
    });

    it("handles error from similaritySearch gracefully", async () => {
        mockSimilaritySearch.mockRejectedValue(new Error("Database connection failed"));

        const state = {
            messages: [new HumanMessage("test query")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await textbookRetrievalNode(state);

        expect(result.retrievedContext).toContain("Textbook retrieval encountered an error");
    });

    it("handles chunks with empty heading hierarchy", async () => {
        mockSimilaritySearch.mockResolvedValue([
            {
                id: "uuid-1",
                content: "Content without headings.",
                subject: "Science",
                grade: "6",
                chapter: "Ch1",
                heading_hierarchy: [],
                similarity: 0.85,
            },
        ]);

        const state = {
            messages: [new HumanMessage("test")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await textbookRetrievalNode(state);

        expect(result.retrievedContext).toContain("[1]");
        expect(result.retrievedContext).toContain("Content without headings.");
        // Should not contain " > " since hierarchy is empty
        expect(result.retrievedContext).not.toContain(" > ");
    });

    it("passes undefined filters when userContext is empty", async () => {
        mockSimilaritySearch.mockResolvedValue([]);

        const state = {
            messages: [new HumanMessage("test")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        await textbookRetrievalNode(state);

        expect(mockSimilaritySearch).toHaveBeenCalledWith("test", 5, {
            subject: undefined,
            grade: undefined,
            chapter: undefined,
        });
    });
});

describe("webSearchNode", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCachedResults.mockReturnValue(null);
        mockValidateSearchConfig.mockReturnValue({ valid: false, message: "not set" });
        mockCategoriesToSearch.mockReturnValue(["general"]);
        mockFormatResults.mockImplementation((results: unknown[]) =>
            results.length ? "Top Web Search Results:\n- Formatted" : "No results found on the web.",
        );
    });

    it("uses DuckDuckGo when SEARXNG_URL is not set", async () => {
        const ddgResults = [{ title: "DDG Result", content: "Content", url: "https://ddg.com", score: 0 }];
        mockSearchDuckDuckGo.mockResolvedValue(ddgResults);

        const state = {
            messages: [new HumanMessage("latest news")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
            searchCount: 0,
        };

        const result = await webSearchNode(state);

        expect(mockSearchDuckDuckGo).toHaveBeenCalledWith("latest news");
        expect(mockSearchSearXNG).not.toHaveBeenCalled();
        expect(result).toHaveProperty("webSearchContext");
        expect(result.searchCount).toBe(1);
    });

    it("extracts search query from router system message", async () => {
        mockSearchDuckDuckGo.mockResolvedValue([]);

        const state = {
            messages: [
                new HumanMessage("What are current events?"),
                new SystemMessage("ROUTER DECISION: Web search required for: current events today"),
            ],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
            searchCount: 0,
        };

        await webSearchNode(state);

        expect(mockSearchDuckDuckGo).toHaveBeenCalledWith("current events today");
    });

    it("calls SearXNG when URL is configured", async () => {
        const originalUrl = (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL;
        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL = "http://localhost:8080";
        mockValidateSearchConfig.mockReturnValue({ valid: true, message: "ok" });

        const searxResults = [{ title: "SearX Result", content: "Content", url: "https://ex.com", score: 0 }];
        mockSearchSearXNG.mockResolvedValue(searxResults);

        const state = {
            messages: [new HumanMessage("test query")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
            searchCount: 0,
        };

        const result = await webSearchNode(state);

        expect(mockSearchSearXNG).toHaveBeenCalledWith("http://localhost:8080", "test query", ["general"]);
        expect(mockSetCachedResults).toHaveBeenCalledWith("test query", searxResults);
        expect(result.searchCount).toBe(1);

        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL = originalUrl;
    });

    it("falls back to DuckDuckGo when SearXNG fails", async () => {
        const originalUrl = (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL;
        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL = "http://localhost:8080";

        mockSearchSearXNG.mockRejectedValue(new Error("SearXNG error"));
        const ddgResults = [{ title: "DDG Fallback", content: "Content", url: "https://ddg.com", score: 0 }];
        mockSearchDuckDuckGo.mockResolvedValue(ddgResults);

        const state = {
            messages: [new HumanMessage("test query")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
            searchCount: 0,
        };

        const result = await webSearchNode(state);

        expect(mockSearchSearXNG).toHaveBeenCalled();
        expect(mockSearchDuckDuckGo).toHaveBeenCalledWith("test query");
        expect(result.searchCount).toBe(1);

        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL = originalUrl;
    });

    it("returns cached results without incrementing searchCount", async () => {
        const cachedResults = [{ title: "Cached", content: "Content", url: "https://cached.com", score: 5 }];
        mockGetCachedResults.mockReturnValue(cachedResults);

        const state = {
            messages: [new HumanMessage("cached query")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
            searchCount: 2,
        };

        const result = await webSearchNode(state);

        expect(mockGetCachedResults).toHaveBeenCalledWith("cached query");
        expect(mockSearchSearXNG).not.toHaveBeenCalled();
        expect(mockSearchDuckDuckGo).not.toHaveBeenCalled();
        expect(result.searchCount).toBe(2); // Not incremented
    });

    it("enforces max searches per session", async () => {
        const state = {
            messages: [new HumanMessage("another query")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
            searchCount: 5,
        };

        const result = await webSearchNode(state);

        expect(result.webSearchContext).toContain("Search limit reached");
        expect(result.searchCount).toBe(5);
        expect(mockSearchSearXNG).not.toHaveBeenCalled();
        expect(mockSearchDuckDuckGo).not.toHaveBeenCalled();
    });

    it("handles both SearXNG and DuckDuckGo failing", async () => {
        const originalUrl = (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL;
        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL = "http://localhost:8080";

        mockSearchSearXNG.mockRejectedValue(new Error("SearXNG down"));
        mockSearchDuckDuckGo.mockRejectedValue(new Error("DDG down"));

        const state = {
            messages: [new HumanMessage("test query")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
            searchCount: 0,
        };

        const result = await webSearchNode(state);
        expect(result.webSearchContext).toContain("Web search failed");
        expect(result.searchCount).toBe(1);

        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL = originalUrl;
    });

    it("passes user subject to categoriesToSearch", async () => {
        mockSearchDuckDuckGo.mockResolvedValue([]);
        mockCategoriesToSearch.mockReturnValue(["general", "science"]);

        const state = {
            messages: [new HumanMessage("test")],
            userContext: { subject: "Physics" },
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
            searchCount: 0,
        };

        await webSearchNode(state);
        expect(mockCategoriesToSearch).toHaveBeenCalledWith("Physics");
    });

    it("increments searchCount on successful search", async () => {
        mockSearchDuckDuckGo.mockResolvedValue([]);

        const state = {
            messages: [new HumanMessage("test")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
            searchCount: 3,
        };

        const result = await webSearchNode(state);
        expect(result.searchCount).toBe(4);
    });

    it("defaults searchCount to 0 when undefined", async () => {
        mockSearchDuckDuckGo.mockResolvedValue([]);

        const state = {
            messages: [new HumanMessage("test")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
            searchCount: undefined as unknown as number,
        };

        const result = await webSearchNode(state);
        expect(result.searchCount).toBe(1);
    });

    it("calls validateSearchConfig with SEARXNG_URL", async () => {
        mockSearchDuckDuckGo.mockResolvedValue([]);

        const state = {
            messages: [new HumanMessage("test")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
            searchCount: 0,
        };

        await webSearchNode(state);
        expect(mockValidateSearchConfig).toHaveBeenCalled();
    });
});

describe("routerNode", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("routes to heavy_reasoning for complex math questions", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            intent: "heavy_reasoning",
            confidence: 0.95,
            reasoning_prompt: "Solve the integral of x^2",
        });

        mockQwenRouter.withStructuredOutput.mockReturnValue({
            invoke: mockInvoke,
        });

        const state = {
            messages: [new HumanMessage("Solve the integral of x^2")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await routerNode(state);

        expect(result.requiresHeavyReasoning).toBe(true);
        expect(result.routingMetadata.intent).toBe("heavy_reasoning");
        expect(result.routingMetadata.confidence).toBe(0.95);
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].content).toContain("Heavy reasoning");
    });

    it("routes to web_search for current events", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            intent: "web_search",
            confidence: 0.85,
            search_query: "latest climate news",
        });

        mockQwenRouter.withStructuredOutput.mockReturnValue({
            invoke: mockInvoke,
        });

        const state = {
            messages: [new HumanMessage("What is the latest climate news?")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await routerNode(state);

        expect(result.requiresHeavyReasoning).toBe(false);
        expect(result.routingMetadata.intent).toBe("web_search");
        expect(result.routingMetadata.confidence).toBe(0.85);
        expect(result.messages[0].content).toContain("Web search");
    });

    it("routes to textbook for curriculum topics", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            intent: "textbook",
            confidence: 0.9,
            search_query: "photosynthesis process",
        });

        mockQwenRouter.withStructuredOutput.mockReturnValue({
            invoke: mockInvoke,
        });

        const state = {
            messages: [new HumanMessage("What is photosynthesis?")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await routerNode(state);

        expect(result.requiresHeavyReasoning).toBe(false);
        expect(result.routingMetadata.intent).toBe("textbook");
        expect(result.routingMetadata.confidence).toBe(0.9);
        expect(result.messages[0].content).toContain("Textbook retrieval");
    });

    it("routes to greeting for casual messages", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            intent: "greeting",
            confidence: 0.98,
        });

        mockQwenRouter.withStructuredOutput.mockReturnValue({
            invoke: mockInvoke,
        });

        const state = {
            messages: [new HumanMessage("Hi there!")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await routerNode(state);

        expect(result.requiresHeavyReasoning).toBe(false);
        expect(result.routingMetadata.intent).toBe("greeting");
        expect(result.routingMetadata.confidence).toBe(0.98);
        expect(result.messages[0].content).toContain("Greeting detected");
    });

    it("routes to follow_up for follow-up questions", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            intent: "follow_up",
            confidence: 0.88,
        });

        mockQwenRouter.withStructuredOutput.mockReturnValue({
            invoke: mockInvoke,
        });

        const state = {
            messages: [
                new HumanMessage("What is photosynthesis?"),
                new SystemMessage("ROUTER DECISION: Textbook retrieval for: photosynthesis process"),
                new HumanMessage("Can you explain it more?")
            ],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await routerNode(state);

        expect(result.requiresHeavyReasoning).toBe(false);
        expect(result.routingMetadata.intent).toBe("follow_up");
        expect(result.routingMetadata.confidence).toBe(0.88);
        expect(result.messages[0].content).toContain("Follow-up question detected");
    });

    it("routes to off_topic for unrelated questions", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            intent: "off_topic",
            confidence: 0.92,
        });

        mockQwenRouter.withStructuredOutput.mockReturnValue({
            invoke: mockInvoke,
        });

        const state = {
            messages: [new HumanMessage("What's your favorite movie?")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await routerNode(state);

        expect(result.requiresHeavyReasoning).toBe(false);
        expect(result.routingMetadata.intent).toBe("off_topic");
        expect(result.routingMetadata.confidence).toBe(0.92);
        expect(result.messages[0].content).toContain("Off-topic detected");
    });

    it("falls back to user message when reasoning_prompt is absent", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            intent: "heavy_reasoning",
            confidence: 0.9,
        });

        mockQwenRouter.withStructuredOutput.mockReturnValue({
            invoke: mockInvoke,
        });

        const state = {
            messages: [new HumanMessage("What is 2+2?")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await routerNode(state);
        expect(result.messages[0].content).toContain("What is 2+2?");
    });
});

describe("heavyReasoningNode", () => {
    it("invokes deepseek with system prompt and user messages", async () => {
        mockDeepseekReasoner.invoke.mockResolvedValue({
            content: "Step 1: ... Step 2: ... The answer is 42.",
        });

        const state = {
            messages: [new HumanMessage("What is the meaning of life?")],
            userContext: {},
            requiresHeavyReasoning: true,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await heavyReasoningNode(state);

        expect(mockDeepseekReasoner.invoke).toHaveBeenCalled();
        expect(result.reasoningResult).toContain("42");
    });
});

describe("synthesisNode", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("synthesizes response with textbook context", async () => {
        mockQwenRouter.invoke.mockResolvedValue({
            content:
                "Photosynthesis is the process by which plants make food! 🐘🌿",
        } as never);

        const state = {
            messages: [new HumanMessage("What is photosynthesis?")],
            userContext: { classGrade: "6", subject: "Science" },
            requiresHeavyReasoning: false,
            retrievedContext: "Photosynthesis is the process...",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await synthesisNode(state);

        expect(mockQwenRouter.invoke).toHaveBeenCalled();
        expect(result.messages).toHaveLength(1);
    });

    it("includes reasoning result in knowledge payload", async () => {
        mockQwenRouter.invoke.mockResolvedValue({
            content: "The answer to the integral is x^3/3 + C 🐘",
        } as never);

        const state = {
            messages: [new HumanMessage("Solve integral of x^2")],
            userContext: { classGrade: "12" },
            requiresHeavyReasoning: true,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "∫x² dx = x³/3 + C",
        };

        const result = await synthesisNode(state);

        // Verify the invoke was called with system message containing reasoning
        const invokeArgs = mockQwenRouter.invoke.mock.calls[0][0];
        const systemMsg = invokeArgs[0];
        expect(typeof systemMsg.content === "string" && systemMsg.content).toContain(
            "Expert Reasoning Result"
        );
        expect(result.messages).toHaveLength(1);
    });

    it("includes web search context in knowledge payload", async () => {
        mockQwenRouter.invoke.mockResolvedValue({
            content: "Based on recent news... 🐘",
        } as never);

        const state = {
            messages: [new HumanMessage("Latest news?")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "Top Web Search Results:\n- News Item 1",
            reasoningResult: "",
        };

        const result = await synthesisNode(state);

        const invokeArgs = mockQwenRouter.invoke.mock.calls[0][0];
        const systemMsg = invokeArgs[0];
        expect(typeof systemMsg.content === "string" && systemMsg.content).toContain(
            "Web Search Context"
        );
        expect(result.messages).toHaveLength(1);
    });

    it("uses default class grade when not provided", async () => {
        mockQwenRouter.invoke.mockResolvedValue({
            content: "Hello! 🐘",
        } as never);

        const state = {
            messages: [new HumanMessage("Hi")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        await synthesisNode(state);

        const invokeArgs = mockQwenRouter.invoke.mock.calls[0][0];
        const systemMsg = invokeArgs[0];
        expect(typeof systemMsg.content === "string" && systemMsg.content).toContain(
            "Class 8"
        );
    });
});
