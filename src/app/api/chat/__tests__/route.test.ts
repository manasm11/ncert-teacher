import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the env module like other tests do
vi.mock("@/lib/env", () => ({
    clientEnv: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
    },
}));

// Mock Supabase client methods
const mockAuthGetUser = vi.fn();

const mockSupabase = {
  auth: {
    getUser: mockAuthGetUser,
  },
  from: vi.fn(),
};

// Mock the Supabase client factory
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock the conversation service
vi.mock('@/lib/chat/conversationService', () => ({
  createConversation: vi.fn(),
  addMessage: vi.fn(),
}));

// Mock the agent graph
vi.mock('@/lib/agent/graph', () => ({
  createGraph: vi.fn(() => ({
    invoke: vi.fn(() => ({
      messages: [{ content: 'Test response' }],
      requiresHeavyReasoning: false,
      reasoningResult: null,
    })),
  })),
}));

function makeRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should process chat message and create new conversation', async () => {
    // Import the route handler after mocks are set up
    const { POST } = await import('../route');

    // Mock authenticated user
    mockAuthGetUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });

    // Mock conversation service
    const { createConversation, addMessage } = await import('@/lib/chat/conversationService');
    (createConversation as any).mockResolvedValueOnce({
      id: 'new-conversation-id',
      user_id: 'test-user-id',
      title: 'Chat 1/1/2023',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    (addMessage as any).mockResolvedValue({
      id: 'message-id',
      conversation_id: 'new-conversation-id',
      role: 'user',
      content: 'Hello',
      metadata: { timestamp: expect.any(String) },
      created_at: new Date().toISOString(),
    });

    const req = makeRequest({
      messages: [{ role: 'user', text: 'Hello' }],
      userContext: { classGrade: '6', subject: 'Science', chapter: 'chapter-1' },
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      role: 'assistant',
      text: 'Test response',
      conversationId: 'new-conversation-id',
      metadata: {
        routedTo: 'Textbook RAG',
      },
    });
  });

  it('should process chat message with existing conversation', async () => {
    // Import the route handler after mocks are set up
    const { POST } = await import('../route');

    // Mock authenticated user
    mockAuthGetUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });

    // Mock conversation service
    const { addMessage } = await import('@/lib/chat/conversationService');
    (addMessage as any).mockResolvedValue({
      id: 'message-id',
      conversation_id: 'existing-conversation-id',
      role: 'user',
      content: 'Hello',
      metadata: { timestamp: expect.any(String) },
      created_at: new Date().toISOString(),
    });

    const req = makeRequest({
      messages: [{ role: 'user', text: 'Hello' }],
      userContext: { classGrade: '6', subject: 'Science', chapter: 'chapter-1' },
      conversationId: 'existing-conversation-id',
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      role: 'assistant',
      text: 'Test response',
      conversationId: 'existing-conversation-id',
      metadata: {
        routedTo: 'Textbook RAG',
      },
    });
  });

  it('should return 401 if user is not authenticated', async () => {
    // Import the route handler after mocks are set up
    const { POST } = await import('../route');

    mockAuthGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const req = makeRequest({
      messages: [{ role: 'user', text: 'Hello' }],
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('should return 400 if messages array is invalid', async () => {
    // Import the route handler after mocks are set up
    const { POST } = await import('../route');

    const req = makeRequest({
      messages: null,
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'Invalid messages array' });
  });
});