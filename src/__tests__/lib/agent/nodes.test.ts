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

import {
    routerNode,
    textbookRetrievalNode,
    webSearchNode,
    heavyReasoningNode,
    synthesisNode,
} from "@/lib/agent/nodes";
import { serverEnv } from "@/lib/env";

describe("textbookRetrievalNode", () => {
    it("returns placeholder context", async () => {
        const state = {
            messages: [new HumanMessage("What is photosynthesis?")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await textbookRetrievalNode(state);

        expect(result).toHaveProperty("retrievedContext");
        expect(result.retrievedContext).toContain("placeholder");
        expect(result.retrievedContext).toContain("NCERT");
    });
});

describe("webSearchNode", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("returns placeholder when SEARXNG_URL is not set", async () => {
        const state = {
            messages: [new HumanMessage("latest news")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await webSearchNode(state);

        expect(result).toHaveProperty("webSearchContext");
        expect(result.webSearchContext).toContain("Placeholder");
    });

    it("includes the query in placeholder result", async () => {
        const state = {
            messages: [new HumanMessage("climate change 2024")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await webSearchNode(state);
        expect(result.webSearchContext).toContain("climate change 2024");
    });

    it("extracts search query from router system message", async () => {
        const state = {
            messages: [
                new HumanMessage("What are current events?"),
                new SystemMessage(
                    "ROUTER DECISION: Web search required for: current events today"
                ),
            ],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await webSearchNode(state);
        expect(result.webSearchContext).toContain("current events today");
    });

    it("calls SearXNG API when URL is configured", async () => {
        // Temporarily set SEARXNG_URL
        const originalUrl = (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL;
        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL =
            "http://localhost:8080";

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                results: [
                    { title: "Result 1", content: "Content 1" },
                    { title: "Result 2", content: "Content 2" },
                ],
            }),
        });
        global.fetch = mockFetch;

        const state = {
            messages: [new HumanMessage("test query")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await webSearchNode(state);

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("http://localhost:8080/search")
        );
        expect(result.webSearchContext).toContain("Result 1");
        expect(result.webSearchContext).toContain("Result 2");

        // Restore
        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL = originalUrl;
    });

    it("handles SearXNG API failure gracefully", async () => {
        const originalUrl = (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL;
        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL =
            "http://localhost:8080";

        global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

        const state = {
            messages: [new HumanMessage("test query")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await webSearchNode(state);
        expect(result.webSearchContext).toContain("Web search failed");

        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL = originalUrl;
    });

    it("handles SearXNG non-OK response", async () => {
        const originalUrl = (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL;
        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL =
            "http://localhost:8080";

        global.fetch = vi.fn().mockResolvedValue({ ok: false });

        const state = {
            messages: [new HumanMessage("test query")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await webSearchNode(state);
        expect(result.webSearchContext).toContain("Web search failed");

        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL = originalUrl;
    });

    it("handles empty search results", async () => {
        const originalUrl = (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL;
        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL =
            "http://localhost:8080";

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ results: [] }),
        });

        const state = {
            messages: [new HumanMessage("obscure query")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        const result = await webSearchNode(state);
        expect(result.webSearchContext).toContain("No results found");

        (serverEnv as { SEARXNG_URL?: string }).SEARXNG_URL = originalUrl;
    });
});

describe("routerNode", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("routes to heavy_reasoning for complex math questions", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            intent: "heavy_reasoning",
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
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].content).toContain("Heavy reasoning");
    });

    it("routes to web_search for current events", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            intent: "web_search",
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
        expect(result.messages[0].content).toContain("Web search");
    });

    it("routes to textbook for curriculum topics", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            intent: "textbook",
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
        expect(result.messages[0].content).toContain("Textbook retrieval");
    });

    it("falls back to user message when reasoning_prompt is absent", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            intent: "heavy_reasoning",
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
            "Class student"
        );
    });
});
