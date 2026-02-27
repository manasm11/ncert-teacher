import { renderHook, act } from '@testing-library/react';
import { useChat } from './useChat';

// Mock the fetch API
global.fetch = jest.fn();

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default message', () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toEqual({
      role: "assistant",
      text: "Hello there! I'm Gyanu 🐘. Ready to dive into today's chapter? Ask me anything when you get stuck!"
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.phase).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it('should send a message and update state', async () => {
    // Mock a successful SSE response
    const mockResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("event: status\ndata: {\"phase\":\"routing\",\"message\":\"Analyzing your question...\"}\n\n"));
        controller.enqueue(new TextEncoder().encode("event: token\ndata: {\"content\":\"H\"}\n\n"));
        controller.enqueue(new TextEncoder().encode("event: token\ndata: {\"content\":\"ello\"}\n\n"));
        controller.enqueue(new TextEncoder().encode("event: done\ndata: {}\n\n"));
        controller.close();
      }
    });

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      body: mockResponse,
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("Hello", { classGrade: "6", subject: "Science" });
    });

    // Check that the state was updated correctly
    expect(result.current.isLoading).toBe(false);
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toEqual({
      role: "assistant",
      text: "Hello"
    });
  });

  it('should handle errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("Hello", { classGrade: "6", subject: "Science" });
    });

    // Check that the error state was set
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("Network error");
    expect(result.current.phase).toBe("error");
  });
});