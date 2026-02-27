import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock env module
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

// Mock the embeddings module
const mockGenerateEmbedding = vi.fn();
vi.mock("@/lib/agent/embeddings", () => ({
    generateEmbedding: (...args: unknown[]) => mockGenerateEmbedding(...args),
}));

// Mock Supabase client
const mockRpc = vi.fn();
const mockCreateClient = vi.fn(() => ({
    rpc: mockRpc,
}));
vi.mock("@supabase/supabase-js", () => ({
    createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { similaritySearch, type ChunkRow } from "@/lib/rag/vectorStore";

describe("similaritySearch", () => {
    const fakeEmbedding = [0.1, 0.2, 0.3];

    beforeEach(() => {
        vi.clearAllMocks();
        mockGenerateEmbedding.mockResolvedValue(fakeEmbedding);
    });

    it("generates an embedding for the query", async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });

        await similaritySearch("photosynthesis");

        expect(mockGenerateEmbedding).toHaveBeenCalledWith("photosynthesis");
    });

    it("calls the match_chapter_chunks RPC with correct parameters", async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });

        await similaritySearch("test query", 3, {
            subject: "Science",
            grade: "6",
            chapter: "Chapter 1",
        });

        expect(mockRpc).toHaveBeenCalledWith("match_chapter_chunks", {
            query_embedding: fakeEmbedding,
            match_count: 3,
            filter_subject: "Science",
            filter_grade: "6",
            filter_chapter: "Chapter 1",
        });
    });

    it("passes null for missing filters", async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });

        await similaritySearch("test query", 5, {});

        expect(mockRpc).toHaveBeenCalledWith("match_chapter_chunks", {
            query_embedding: fakeEmbedding,
            match_count: 5,
            filter_subject: null,
            filter_grade: null,
            filter_chapter: null,
        });
    });

    it("uses default topK of 5 when not specified", async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });

        await similaritySearch("test query");

        expect(mockRpc).toHaveBeenCalledWith(
            "match_chapter_chunks",
            expect.objectContaining({ match_count: 5 }),
        );
    });

    it("returns chunk rows from the database", async () => {
        const mockChunks: ChunkRow[] = [
            {
                id: "uuid-1",
                content: "Photosynthesis is the process...",
                subject: "Science",
                grade: "6",
                chapter: "Chapter 1",
                heading_hierarchy: ["Biology", "Photosynthesis"],
                similarity: 0.95,
            },
            {
                id: "uuid-2",
                content: "Plants use sunlight to make food...",
                subject: "Science",
                grade: "6",
                chapter: "Chapter 1",
                heading_hierarchy: ["Biology", "Photosynthesis", "Process"],
                similarity: 0.87,
            },
        ];
        mockRpc.mockResolvedValue({ data: mockChunks, error: null });

        const result = await similaritySearch("photosynthesis", 5, {
            subject: "Science",
        });

        expect(result).toEqual(mockChunks);
        expect(result).toHaveLength(2);
        expect(result[0].similarity).toBe(0.95);
    });

    it("returns empty array when no results match", async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });

        const result = await similaritySearch("nonexistent topic");

        expect(result).toEqual([]);
    });

    it("returns empty array when data is null", async () => {
        mockRpc.mockResolvedValue({ data: null, error: null });

        const result = await similaritySearch("test query");

        expect(result).toEqual([]);
    });

    it("throws an error when the RPC call fails", async () => {
        mockRpc.mockResolvedValue({
            data: null,
            error: { message: "relation does not exist" },
        });

        await expect(similaritySearch("test")).rejects.toThrow(
            "Vector search failed: relation does not exist",
        );
    });

    it("propagates embedding generation errors", async () => {
        mockGenerateEmbedding.mockRejectedValue(
            new Error("Embedding request failed with status 500"),
        );

        await expect(similaritySearch("test")).rejects.toThrow(
            "Embedding request failed with status 500",
        );
    });

    it("creates Supabase client with correct credentials", async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });

        await similaritySearch("test");

        expect(mockCreateClient).toHaveBeenCalledWith(
            "http://localhost:54321",
            "test-key",
        );
    });

    it("handles partial filters (only subject)", async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });

        await similaritySearch("query", 3, { subject: "Math" });

        expect(mockRpc).toHaveBeenCalledWith("match_chapter_chunks", {
            query_embedding: fakeEmbedding,
            match_count: 3,
            filter_subject: "Math",
            filter_grade: null,
            filter_chapter: null,
        });
    });

    it("handles partial filters (only grade)", async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });

        await similaritySearch("query", 3, { grade: "10" });

        expect(mockRpc).toHaveBeenCalledWith("match_chapter_chunks", {
            query_embedding: fakeEmbedding,
            match_count: 3,
            filter_subject: null,
            filter_grade: "10",
            filter_chapter: null,
        });
    });
});
