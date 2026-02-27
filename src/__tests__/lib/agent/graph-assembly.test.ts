import { describe, it, expect, vi } from "vitest";

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

// Mock LLM module
vi.mock("@/lib/agent/llm", () => ({
    getQwenRouter: vi.fn().mockReturnValue({
        withStructuredOutput: vi.fn(),
        invoke: vi.fn(),
    }),
    getDeepseekReasoner: vi.fn().mockReturnValue({
        invoke: vi.fn(),
    }),
}));

import { createGraph } from "@/lib/agent/graph";

describe("createGraph", () => {
    it("returns a compiled graph object", () => {
        const graph = createGraph();

        expect(graph).toBeDefined();
        expect(typeof graph.invoke).toBe("function");
    });

    it("creates a graph with invoke method", () => {
        const graph = createGraph();

        // The compiled graph should have an invoke method
        expect(graph).toHaveProperty("invoke");
    });

    it("returns a new graph instance on each call", () => {
        const graph1 = createGraph();
        const graph2 = createGraph();

        expect(graph1).not.toBe(graph2);
    });
});
