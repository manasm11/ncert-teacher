export interface ChatMessage {
  role: "user" | "assistant" | "system";
  text: string;
  timestamp?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  chapter_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CreateConversationInput {
  userId: string;
  chapterId?: string;
  title?: string;
}

export interface AddMessageInput {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, any>;
}