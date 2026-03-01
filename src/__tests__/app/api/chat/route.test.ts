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

/**
 * Helper to create an async iterable that yields chunks,
 * simulating agentGraph.stream() output.
 */
function createMockStream(chunks: Record<string, Record<string, unknown>>[]) {
    return {
        async *[Symbol.asyncIterator]() {
            for (const chunk of chunks) {
                yield chunk;
            }
        },
    };
}

/**
 * Helper to read the full SSE body from a streaming response.
 */
async function readSSEBody(res: Response): Promise<string> {
    const reader = res.body?.getReader();
    if (!reader) return "";
    let result = "";
    const decoder = new TextDecoder();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
    }
    return result;
}

/**
 * Parse SSE events from raw text into an array of { event, data } objects.
 */
function parseSSEEvents(raw: string): { event: string; data: Record<string, unknown> }[] {
    const events: { event: string; data: Record<string, unknown> }[] = [];
    const blocks = raw.split("\n\n").filter(Boolean);
    for (const block of blocks) {
        const lines = block.split("\n");
        let event = "";
        let data = "";
        for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            if (line.startsWith("data: ")) data = line.slice(6).trim();
        }
        if (event && data) {
            try {
                events.push({ event, data: JSON.parse(data) });
            } catch {
                // skip unparseable
            }
        }
    }
    return events;
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

    it("returns SSE stream for valid chat request", async () => {
        const mockStream = createMockStream([
            { synthesis: { messages: [{ content: "Hello! I am Gyanu 🐘" }] } },
        ]);

        vi.mocked(createGraph).mockReturnValue({
            stream: vi.fn().mockResolvedValue(mockStream),
        } as never);

        const req = makeRequest({
            messages: [{ role: "user", text: "Hello Gyanu!" }],
            userContext: { classGrade: "6", subject: "Science" },
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("text/event-stream");

        const body = await readSSEBody(res);
        const events = parseSSEEvents(body);

        // Should contain status events, token events, and a done event
        const statusEvents = events.filter(e => e.event === "status");
        const doneEvents = events.filter(e => e.event === "done");

        expect(statusEvents.length).toBeGreaterThan(0);
        expect(doneEvents.length).toBe(1);
    });

    it("passes user context to the graph stream", async () => {
        const mockStreamFn = vi.fn().mockResolvedValue(
            createMockStream([
                { synthesis: { messages: [{ content: "Response" }] } },
            ])
        );

        vi.mocked(createGraph).mockReturnValue({
            stream: mockStreamFn,
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

        const res = await POST(req);
        await readSSEBody(res);

        expect(mockStreamFn).toHaveBeenCalledWith(
            expect.objectContaining({
                userContext,
            })
        );
    });

    it("uses default user context when not provided", async () => {
        const mockStreamFn = vi.fn().mockResolvedValue(
            createMockStream([
                { synthesis: { messages: [{ content: "Response" }] } },
            ])
        );

        vi.mocked(createGraph).mockReturnValue({
            stream: mockStreamFn,
        } as never);

        const req = makeRequest({
            messages: [{ role: "user", text: "Hi" }],
        });

        const res = await POST(req);
        await readSSEBody(res);

        expect(mockStreamFn).toHaveBeenCalledWith(
            expect.objectContaining({
                userContext: { classGrade: "6", subject: "Science" },
            })
        );
    });

    it("streams token events from synthesis node", async () => {
        const mockStream = createMockStream([
            { synthesis: { messages: [{ content: "Deep explanation here" }] } },
        ]);

        vi.mocked(createGraph).mockReturnValue({
            stream: vi.fn().mockResolvedValue(mockStream),
        } as never);

        const req = makeRequest({
            messages: [{ role: "user", text: "Solve integral" }],
        });

        const res = await POST(req);
        const body = await readSSEBody(res);
        const events = parseSSEEvents(body);

        const tokenEvents = events.filter(e => e.event === "token");
        expect(tokenEvents.length).toBeGreaterThan(0);
        expect((tokenEvents[0].data as { content: string }).content).toBe("Deep explanation here");
    });

    it("returns SSE error event on graph stream error", async () => {
        const errorStream = {
            async *[Symbol.asyncIterator]() {
                throw new Error("LLM timeout");
            },
        };

        vi.mocked(createGraph).mockReturnValue({
            stream: vi.fn().mockResolvedValue(errorStream),
        } as never);

        const req = makeRequest({
            messages: [{ role: "user", text: "test" }],
        });

        const res = await POST(req);
        // SSE responses return 200 with error events in the stream
        expect(res.status).toBe(200);

        const body = await readSSEBody(res);
        const events = parseSSEEvents(body);
        const errorEvents = events.filter(e => e.event === "error");
        expect(errorEvents.length).toBeGreaterThan(0);
        expect((errorEvents[0].data as { error: string }).error).toBe("LLM timeout");
    });

    it("uses the last message text from the messages array", async () => {
        const mockStreamFn = vi.fn().mockResolvedValue(
            createMockStream([
                { synthesis: { messages: [{ content: "Response" }] } },
            ])
        );

        vi.mocked(createGraph).mockReturnValue({
            stream: mockStreamFn,
        } as never);

        const req = makeRequest({
            messages: [
                { role: "user", text: "First message" },
                { role: "assistant", text: "Bot response" },
                { role: "user", text: "Second message" },
            ],
        });

        const res = await POST(req);
        await readSSEBody(res);

        // The stream should be called with a HumanMessage containing "Second message"
        const streamArgs = mockStreamFn.mock.calls[0][0];
        expect(streamArgs.messages[0].content).toBe("Second message");
    });
});
