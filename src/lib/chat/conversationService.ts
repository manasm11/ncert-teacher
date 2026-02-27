import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import type { Conversation, Message, CreateConversationInput, AddMessageInput } from "@/types/chat";

/**
 * Create a new conversation
 */
export async function createConversation(input: CreateConversationInput): Promise<Conversation> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: input.userId,
      chapter_id: input.chapterId,
      title: input.title,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return data;
}

/**
 * Add a message to a conversation
 */
export async function addMessage(input: AddMessageInput): Promise<Message> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add message: ${error.message}`);
  }

  return data;
}

/**
 * Get a conversation by ID
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST115") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get conversation: ${error.message}`);
  }

  return data;
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to get conversation messages: ${error.message}`);
  }

  return data;
}

/**
 * List conversations for a user
 */
export async function listUserConversations(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Conversation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to list user conversations: ${error.message}`);
  }

  return data;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete conversation: ${error.message}`);
  }
}