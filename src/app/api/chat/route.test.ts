import { NextRequest } from "next/server";
import { POST } from "./route";
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock NextRequest
class MockNextRequest extends Request implements NextRequest {
  constructor(url: string, init?: RequestInit) {
    super(url, init);
  }

  // Add missing properties
  get cookies() {
    return {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
  }

  get nextUrl() {
    return new URL(this.url);
  }
}

// Mock the LangChain dependencies
vi.mock("@/lib/agent/graph", () => ({
  createGraph: vi.fn().mockReturnValue({
    streamEvents: vi.fn().mockImplementation(async function* () {
      // Yield some mock events
      yield { event: "on_chain_start", name: "router" };
      yield { event: "on_chain_start", name: "textbook_retrieval" };
      yield { event: "on_chat_model_stream", data: { chunk: { content: "H" } } };
      yield { event: "on_chat_model_stream", data: { chunk: { content: "ello" } } };
      yield { event: "on_chat_model_stream", data: { chunk: { content: " there!" } } };
      yield { event: "on_chain_end", name: "synthesis" };
    })
  })
}));

describe("Chat API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should stream SSE events", async () => {
    const mockRequest = new MockNextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ text: "Hello" }],
        userContext: { classGrade: "6", subject: "Science" }
      })
    });

    const response = await POST(mockRequest as unknown as NextRequest);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    // Collect the streamed response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let result = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
      }

      // Check that we received the expected events
      expect(result).toContain("event: status");
      expect(result).toContain("event: token");
      expect(result).toContain("event: done");
    }
  });
});