import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the env module
vi.mock("@/lib/env", () => ({
    clientEnv: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
    },
    serverEnv: {
        OLLAMA_CLOUD_API_KEY: "test-api-key",
        OLLAMA_CLOUD_ENDPOINT: "http://localhost:11434",
        SEARXNG_URL: undefined,
    },
}));

import { generateEmbedding } from "@/lib/agent/embeddings";

describe("generateEmbedding", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("sends correct request to the embeddings endpoint", async () => {
        const fakeEmbedding = Array.from({ length: 768 }, (_, i) => i * 0.001);
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: [{ embedding: fakeEmbedding }] }),
        });
        global.fetch = mockFetch;

        const result = await generateEmbedding("test text");

        expect(mockFetch).toHaveBeenCalledWith(
            "http://localhost:11434/embeddings",
            expect.objectContaining({
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer test-api-key",
                },
                body: JSON.stringify({
                    model: "nomic-embed-text",
                    input: "test text",
                }),
            }),
        );
        expect(result).toEqual(fakeEmbedding);
    });

    it("returns a number array from the response", async () => {
        const fakeEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: [{ embedding: fakeEmbedding }] }),
        });

        const result = await generateEmbedding("hello world");

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(5);
        expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });

    it("throws an error when the API returns a non-OK response", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
        });

        await expect(generateEmbedding("test")).rejects.toThrow(
            "Embedding request failed with status 500",
        );
    });

    it("throws an error when the API returns 401", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
        });

        await expect(generateEmbedding("test")).rejects.toThrow(
            "Embedding request failed with status 401",
        );
    });

    it("propagates network errors from fetch", async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

        await expect(generateEmbedding("test")).rejects.toThrow("Network error");
    });

    it("handles empty string input", async () => {
        const fakeEmbedding = [0.0, 0.0, 0.0];
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: [{ embedding: fakeEmbedding }] }),
        });

        const result = await generateEmbedding("");

        expect(result).toEqual([0.0, 0.0, 0.0]);
        expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                body: JSON.stringify({
                    model: "nomic-embed-text",
                    input: "",
                }),
            }),
        );
    });

    it("handles long text input", async () => {
        const longText = "word ".repeat(10000);
        const fakeEmbedding = [0.5];
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: [{ embedding: fakeEmbedding }] }),
        });

        const result = await generateEmbedding(longText);
        expect(result).toEqual([0.5]);
    });
});
