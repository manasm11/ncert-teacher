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

// Mock the safety modules
vi.mock("@/lib/safety/inputModeration", () => ({
    moderateInput: vi.fn().mockReturnValue({ allowed: true, message: "OK", needsReview: false, reportId: "test" }),
    createModerationReport: vi.fn().mockReturnValue({ id: "test-report", score: 0, patternsMatched: [] }),
}));

vi.mock("@/lib/safety/outputModeration", () => ({
    evaluateResponse: vi.fn().mockReturnValue({ isApproved: true, violations: [] }),
}));

vi.mock("@/lib/safety/flaggedContent", () => ({
    getFlaggedContentService: vi.fn().mockReturnValue({
        createReport: vi.fn().mockResolvedValue({}),
    }),
    createReportFromModeration: vi.fn().mockReturnValue({}),
    ReportType: { USER_INPUT: "user_input", AI_OUTPUT: "ai_output" },
    ContentCategory: { HARASSMENT: "harassment" },
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

    it("returns successful SSE response for valid chat request", async () => {
        vi.mocked(createGraph).mockReturnValue({
            stream: vi.fn().mockResolvedValue(
                (async function*() {
                    yield { synthesis: { messages: [{ content: "Hello!" }] } };
                })()
            ),
        } as never);

        const req = makeRequest({
            messages: [{ role: "user", text: "Hello Gyanu!" }],
            userContext: { classGrade: "6", subject: "Science" },
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    });

    it("returns SSE response with routing metadata", async () => {
        vi.mocked(createGraph).mockReturnValue({
            stream: vi.fn().mockResolvedValue(
                (async function*() {
                    yield { heavy_reasoning: { reasoningResult: "Solution" } };
                    yield { synthesis: { messages: [{ content: "Deep explanation" }] } };
                })()
            ),
        } as never);

        const req = makeRequest({
            messages: [{ role: "user", text: "Solve integral" }],
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    });

    it("returns 200 when graph stream rejects (error handled in stream)", async () => {
        vi.mocked(createGraph).mockReturnValue({
            stream: vi.fn().mockRejectedValue(new Error("LLM timeout")),
        } as never);

        const req = makeRequest({
            messages: [{ role: "user", text: "test" }],
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
    });

    it("handles non-Error exceptions in stream gracefully", async () => {
        vi.mocked(createGraph).mockReturnValue({
            stream: vi.fn().mockRejectedValue("string error"),
        } as never);

        const req = makeRequest({
            messages: [{ role: "user", text: "test" }],
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
    });
});
