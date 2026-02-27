import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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

// Mock the graph module
vi.mock("@/lib/agent/graph", () => ({
    createGraph: vi.fn(),
}));

import { POST } from "@/app/api/chat/route";
import { createGraph } from "@/lib/agent/graph";

function makeRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
}

describe("POST /api/chat", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("returns 400 for missing messages", async () => {
        const req = makeRequest({});
        const res = await POST(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe("Invalid messages array");
    });

    it("returns 400 for non-array messages", async () => {
        const req = makeRequest({ messages: "not an array" });
        const res = await POST(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe("Invalid messages array");
    });

    it("returns 400 for null messages", async () => {
        const req = makeRequest({ messages: null });
        const res = await POST(req);

        expect(res.status).toBe(400);
    });

    it("returns successful response for valid chat request", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            messages: [
                { content: "Hello!" },
                { content: "Router decision" },
                {
                    content:
                        "Hello! I am Gyanu, your friendly elephant tutor! 🐘",
                },
            ],
            requiresHeavyReasoning: false,
            reasoningResult: "",
        });

        vi.mocked(createGraph).mockReturnValue({
            invoke: mockInvoke,
        } as never);

        const req = makeRequest({
            messages: [{ role: "user", text: "Hello Gyanu!" }],
            userContext: { classGrade: "6", subject: "Science" },
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.role).toBe("assistant");
        expect(data.text).toContain("Gyanu");
        expect(data.metadata).toBeDefined();
    });

    it("passes user context to the graph", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            messages: [{ content: "Response" }],
            requiresHeavyReasoning: false,
            reasoningResult: "",
        });

        vi.mocked(createGraph).mockReturnValue({
            invoke: mockInvoke,
        } as never);

        const userContext = {
            classGrade: "8",
            subject: "Math",
            chapter: "Algebra",
        };
        const req = makeRequest({
            messages: [{ role: "user", text: "What is algebra?" }],
            userContext,
        });

        await POST(req);

        expect(mockInvoke).toHaveBeenCalledWith(
            expect.objectContaining({
                userContext,
            })
        );
    });

    it("uses default user context when not provided", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            messages: [{ content: "Response" }],
            requiresHeavyReasoning: false,
            reasoningResult: "",
        });

        vi.mocked(createGraph).mockReturnValue({
            invoke: mockInvoke,
        } as never);

        const req = makeRequest({
            messages: [{ role: "user", text: "Hi" }],
        });

        await POST(req);

        expect(mockInvoke).toHaveBeenCalledWith(
            expect.objectContaining({
                userContext: { classGrade: "6", subject: "Science" },
            })
        );
    });

    it("returns metadata with routing information", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            messages: [{ content: "Deep explanation" }],
            requiresHeavyReasoning: true,
            reasoningResult: "Step-by-step solution",
        });

        vi.mocked(createGraph).mockReturnValue({
            invoke: mockInvoke,
        } as never);

        const req = makeRequest({
            messages: [{ role: "user", text: "Solve integral" }],
        });

        const res = await POST(req);
        const data = await res.json();

        expect(data.metadata.routedTo).toBe("Heavy Reasoning (DeepSeek)");
    });

    it("returns 500 on graph invocation error", async () => {
        vi.mocked(createGraph).mockReturnValue({
            invoke: vi.fn().mockRejectedValue(new Error("LLM timeout")),
        } as never);

        const req = makeRequest({
            messages: [{ role: "user", text: "test" }],
        });

        const res = await POST(req);
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.error).toBe("LLM timeout");
    });

    it("returns generic error message for non-Error exceptions", async () => {
        vi.mocked(createGraph).mockReturnValue({
            invoke: vi.fn().mockRejectedValue("something broke"),
        } as never);

        const req = makeRequest({
            messages: [{ role: "user", text: "test" }],
        });

        const res = await POST(req);
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.error).toContain("Something went wrong");
    });

    it("uses the last message text from the messages array", async () => {
        const mockInvoke = vi.fn().mockResolvedValue({
            messages: [{ content: "Response" }],
            requiresHeavyReasoning: false,
            reasoningResult: "",
        });

        vi.mocked(createGraph).mockReturnValue({
            invoke: mockInvoke,
        } as never);

        const req = makeRequest({
            messages: [
                { role: "user", text: "First message" },
                { role: "assistant", text: "Bot response" },
                { role: "user", text: "Second message" },
            ],
        });

        await POST(req);

        // The invoke should be called with a HumanMessage containing "Second message"
        const invokeArgs = mockInvoke.mock.calls[0][0];
        expect(invokeArgs.messages[0].content).toBe("Second message");
    });
});
