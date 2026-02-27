import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the env module
vi.mock("@/lib/env", () => ({
    serverEnv: {
        OLLAMA_CLOUD_API_KEY: "test-api-key",
        OLLAMA_CLOUD_ENDPOINT: "http://localhost:11434",
    },
}));

// Track constructor calls
const constructorCalls: Record<string, unknown>[] = [];

vi.mock("@langchain/openai", () => ({
    ChatOpenAI: class MockChatOpenAI {
        modelName: string;
        temperature: number;
        constructor(config: Record<string, unknown>) {
            constructorCalls.push(config);
            this.modelName = config.modelName as string;
            this.temperature = config.temperature as number;
        }
    },
}));

describe("LLM singletons", () => {
    beforeEach(() => {
        constructorCalls.length = 0;
        // Reset the module cache so singletons are fresh each test
        vi.resetModules();
    });

    it("getQwenRouter creates a ChatOpenAI with correct config", async () => {
        const { getQwenRouter } = await import("@/lib/agent/llm");

        const router = getQwenRouter();

        expect(constructorCalls).toHaveLength(1);
        expect(constructorCalls[0]).toEqual(
            expect.objectContaining({
                modelName: "qwen:3.5",
                openAIApiKey: "test-api-key",
                temperature: 0.7,
                configuration: { baseURL: "http://localhost:11434" },
            })
        );
        expect(router).toBeDefined();
    });

    it("getQwenRouter returns the same instance on subsequent calls", async () => {
        const { getQwenRouter } = await import("@/lib/agent/llm");

        const first = getQwenRouter();
        const second = getQwenRouter();

        expect(first).toBe(second);
        expect(constructorCalls).toHaveLength(1);
    });

    it("getDeepseekReasoner creates a ChatOpenAI with correct config", async () => {
        const { getDeepseekReasoner } = await import("@/lib/agent/llm");

        const reasoner = getDeepseekReasoner();

        expect(constructorCalls).toHaveLength(1);
        expect(constructorCalls[0]).toEqual(
            expect.objectContaining({
                modelName: "deepseek-v3.1:671b-cloud",
                openAIApiKey: "test-api-key",
                temperature: 0.2,
                configuration: { baseURL: "http://localhost:11434" },
            })
        );
        expect(reasoner).toBeDefined();
    });

    it("getDeepseekReasoner returns the same instance on subsequent calls", async () => {
        const { getDeepseekReasoner } = await import("@/lib/agent/llm");

        const first = getDeepseekReasoner();
        const second = getDeepseekReasoner();

        expect(first).toBe(second);
        expect(constructorCalls).toHaveLength(1);
    });

    it("getGptOssReasoner creates a ChatOpenAI with correct config", async () => {
        const { getGptOssReasoner } = await import("@/lib/agent/llm");

        const reasoner = getGptOssReasoner();

        expect(constructorCalls).toHaveLength(1);
        expect(constructorCalls[0]).toEqual(
            expect.objectContaining({
                modelName: "gpt-oss:120b-cloud",
                openAIApiKey: "test-api-key",
                temperature: 0.2,
                configuration: { baseURL: "http://localhost:11434" },
            })
        );
        expect(reasoner).toBeDefined();
    });

    it("getGptOssReasoner returns the same instance on subsequent calls", async () => {
        const { getGptOssReasoner } = await import("@/lib/agent/llm");

        const first = getGptOssReasoner();
        const second = getGptOssReasoner();

        expect(first).toBe(second);
        expect(constructorCalls).toHaveLength(1);
    });

    it("each getter creates independent singletons", async () => {
        const { getQwenRouter, getDeepseekReasoner, getGptOssReasoner } =
            await import("@/lib/agent/llm");

        const qwen = getQwenRouter();
        const deepseek = getDeepseekReasoner();
        const gptoss = getGptOssReasoner();

        expect(qwen).not.toBe(deepseek);
        expect(qwen).not.toBe(gptoss);
        expect(deepseek).not.toBe(gptoss);
        expect(constructorCalls).toHaveLength(3);
    });
});
