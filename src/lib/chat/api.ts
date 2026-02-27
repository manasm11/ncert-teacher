import type { Conversation, Message } from "@/types/chat";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  text: string;
  timestamp?: string;
}

/**
 * Get user's conversations
 */
export async function getUserConversations(): Promise<Conversation[]> {
  const response = await fetch("/api/conversations");
  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }
  return response.json();
}

/**
 * Get a specific conversation with its messages
 */
export async function getConversationWithMessages(id: string): Promise<{
  conversation: Conversation;
  messages: Message[];
}> {
  const response = await fetch(`/api/conversations/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch conversation");
  }
  return response.json();
}

/**
 * Start a new conversation
 */
export async function startNewConversation(chapterId?: string): Promise<Conversation> {
  // This will be handled by the chat API when no conversationId is provided
  throw new Error("Not implemented - handled by chat API");
}