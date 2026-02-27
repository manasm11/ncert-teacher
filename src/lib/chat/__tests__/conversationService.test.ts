import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  createConversation,
  addMessage,
  getConversation,
  getConversationMessages,
  listUserConversations,
  deleteConversation
} from '../conversationService';

// Mock Supabase client methods
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();
const mockSingle = vi.fn();

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  })),
};

// Mock the Supabase client factory
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('conversationService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Setup mock chain methods to return the chainable object
    mockSelect.mockReturnThis();
    mockInsert.mockReturnThis();
    mockDelete.mockReturnThis();
    mockEq.mockReturnThis();
    mockOrder.mockReturnThis();
    mockRange.mockReturnThis();
    mockSingle.mockReturnThis();

    // Mock the from method to return the chainable object
    mockSupabase.from.mockReturnThis();
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const mockData = {
        id: 'test-conversation-id',
        user_id: 'test-user-id',
        chapter_id: 'test-chapter-id',
        title: 'Test Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSingle.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await createConversation({
        userId: 'test-user-id',
        chapterId: 'test-chapter-id',
        title: 'Test Conversation',
      });

      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        chapter_id: 'test-chapter-id',
        title: 'Test Conversation',
      });
    });

    it('should throw an error when creation fails', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(createConversation({
        userId: 'test-user-id',
        title: 'Test Conversation',
      })).rejects.toThrow('Failed to create conversation: Database error');
    });
  });

  describe('addMessage', () => {
    it('should add a new message to a conversation', async () => {
      const mockData = {
        id: 'test-message-id',
        conversation_id: 'test-conversation-id',
        role: 'user',
        content: 'Test message',
        metadata: { key: 'value' },
        created_at: new Date().toISOString(),
      };

      mockSingle.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await addMessage({
        conversationId: 'test-conversation-id',
        role: 'user',
        content: 'Test message',
        metadata: { key: 'value' },
      });

      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
      expect(mockInsert).toHaveBeenCalledWith({
        conversation_id: 'test-conversation-id',
        role: 'user',
        content: 'Test message',
        metadata: { key: 'value' },
      });
    });

    it('should throw an error when adding message fails', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(addMessage({
        conversationId: 'test-conversation-id',
        role: 'user',
        content: 'Test message',
      })).rejects.toThrow('Failed to add message: Database error');
    });
  });

  describe('getConversation', () => {
    it('should retrieve a conversation by ID', async () => {
      const mockData = {
        id: 'test-conversation-id',
        user_id: 'test-user-id',
        chapter_id: 'test-chapter-id',
        title: 'Test Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSingle.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await getConversation('test-conversation-id');

      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
      expect(mockEq).toHaveBeenCalledWith('id', 'test-conversation-id');
    });

    it('should return null when conversation is not found', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST115', message: 'No rows returned' },
      });

      const result = await getConversation('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getConversationMessages', () => {
    it('should retrieve messages for a conversation', async () => {
      const mockData = [
        {
          id: 'message-1',
          conversation_id: 'test-conversation-id',
          role: 'user',
          content: 'Hello',
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'message-2',
          conversation_id: 'test-conversation-id',
          role: 'assistant',
          content: 'Hi there!',
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSelect.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await getConversationMessages('test-conversation-id');

      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
      expect(mockEq).toHaveBeenCalledWith('conversation_id', 'test-conversation-id');
    });
  });

  describe('listUserConversations', () => {
    it('should list conversations for a user', async () => {
      const mockData = [
        {
          id: 'conv-1',
          user_id: 'test-user-id',
          chapter_id: 'chapter-1',
          title: 'Conversation 1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'conv-2',
          user_id: 'test-user-id',
          chapter_id: 'chapter-2',
          title: 'Conversation 2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockSelect.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await listUserConversations('test-user-id', 10, 0);

      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'test-user-id');
    });
  });

  describe('deleteConversation', () => {
    it('should delete a conversation', async () => {
      mockDelete.mockResolvedValueOnce({
        error: null,
      });

      await expect(deleteConversation('test-conversation-id')).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'test-conversation-id');
    });

    it('should throw an error when deletion fails', async () => {
      mockDelete.mockResolvedValueOnce({
        error: { message: 'Database error' },
      });

      await expect(deleteConversation('test-conversation-id'))
        .rejects
        .toThrow('Failed to delete conversation: Database error');
    });
  });
});