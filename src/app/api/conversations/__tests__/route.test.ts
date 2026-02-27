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
  listUserConversations: vi.fn(),
  getConversation: vi.fn(),
  getConversationMessages: vi.fn(),
}));

function makeRequest(url: string, method: string = "GET"): NextRequest {
    return new NextRequest(url, {
        method,
    });
}

describe('Conversation API Routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/conversations', () => {
    it('should return user conversations', async () => {
      // Import the route handler after mocks are set up
      const { GET } = await import('../route');

      // Mock authenticated user
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      // Mock conversation service
      const { listUserConversations } = await import('@/lib/chat/conversationService');
      (listUserConversations as any).mockResolvedValueOnce([
        {
          id: 'conv-1',
          user_id: 'test-user-id',
          title: 'Test Conversation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const req = makeRequest('http://localhost:3000/api/conversations?limit=10&offset=0');

      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([
        {
          id: 'conv-1',
          user_id: 'test-user-id',
          title: 'Test Conversation',
          created_at: expect.any(String),
          updated_at: expect.any(String),
        },
      ]);
    });

    it('should return 401 if user is not authenticated', async () => {
      // Import the route handler after mocks are set up
      const { GET } = await import('../route');

      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const req = makeRequest('http://localhost:3000/api/conversations');

      const res = await GET(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('GET /api/conversations/[id]', () => {
    it('should return conversation with messages', async () => {
      // Import the route handler after mocks are set up
      const { GET } = await import('../../[id]/route');

      // Mock authenticated user
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      // Mock conversation service
      const { getConversation, getConversationMessages } = await import('@/lib/chat/conversationService');
      (getConversation as any).mockResolvedValueOnce({
        id: 'conv-1',
        user_id: 'test-user-id',
        title: 'Test Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      (getConversationMessages as any).mockResolvedValueOnce([
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          role: 'user',
          content: 'Hello',
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ]);

      const req = makeRequest('http://localhost:3000/api/conversations/conv-1');

      const res = await GET(req, { params: Promise.resolve({ id: 'conv-1' }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        conversation: {
          id: 'conv-1',
          user_id: 'test-user-id',
          title: 'Test Conversation',
          created_at: expect.any(String),
          updated_at: expect.any(String),
        },
        messages: [
          {
            id: 'msg-1',
            conversation_id: 'conv-1',
            role: 'user',
            content: 'Hello',
            metadata: {},
            created_at: expect.any(String),
          },
        ],
      });
    });

    it('should return 404 if conversation is not found', async () => {
      // Import the route handler after mocks are set up
      const { GET } = await import('../../[id]/route');

      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { getConversation } = await import('@/lib/chat/conversationService');
      (getConversation as any).mockResolvedValueOnce(null);

      const req = makeRequest('http://localhost:3000/api/conversations/non-existent');

      const res = await GET(req, { params: Promise.resolve({ id: 'non-existent' }) });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toEqual({ error: 'Conversation not found' });
    });

    it('should return 403 if user does not own the conversation', async () => {
      // Import the route handler after mocks are set up
      const { GET } = await import('../../[id]/route');

      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { getConversation } = await import('@/lib/chat/conversationService');
      (getConversation as any).mockResolvedValueOnce({
        id: 'conv-1',
        user_id: 'other-user-id', // Different user
        title: 'Test Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const req = makeRequest('http://localhost:3000/api/conversations/conv-1');

      const res = await GET(req, { params: Promise.resolve({ id: 'conv-1' }) });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data).toEqual({ error: 'Forbidden' });
    });
  });
});