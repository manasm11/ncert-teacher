import { createClient, type Client } from "@/utils/supabase/server";

// Use count(*) to get accurate message count since trigger updates may lag
async function updateMessageCount(client: Client, conversationId: string) {
    const { data: countData, error: countError } = await client
        .from("messages")
        .select("id", { count: "exact" })
        .eq("conversation_id", conversationId);

    if (countError) {
        console.error("Failed to count messages:", countError);
        // Fallback to triggering an update
        const { error } = await client
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);
        if (error) {
            console.error("Failed to update conversation:", error);
        }
        return;
    }

    const messageCount = countData?.length || 0;

    await client
        .from("conversations")
        .update({
            message_count: messageCount,
            updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
}

/**
 * Conversation table schema:
 * id (uuid, primary key)
 * user_id (uuid, foreign key to auth.users)
 * chapter_id (text, optional)
 * title (text)
 * created_at (timestamp)
 * updated_at (timestamp)
 * message_count (integer)
 */

export interface Conversation {
    id: string;
    user_id: string;
    chapter_id: string | null;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
}

export interface Message {
    id: string;
    conversation_id: string;
    role: "user" | "assistant" | "system";
    content: string | Array<{ type: string; text?: string }>;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface CreateConversationOptions {
    userId: string;
    chapterId?: string;
    title?: string;
}

export interface AddMessageOptions {
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    metadata?: Record<string, unknown>;
}

export interface ListConversationsOptions {
    userId: string;
    chapterId?: string;
    limit?: number;
    cursor?: string;
}

/**
 * Create a new conversation
 */
export async function createConversation(options: CreateConversationOptions): Promise<string> {
    const { userId, chapterId, title } = options;

    const client = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await client
        .from("conversations")
        .insert([
            {
                user_id: userId,
                chapter_id: chapterId,
                title: title || "New Conversation",
                created_at: now,
                updated_at: now,
                message_count: 0,
            },
        ])
        .select("id")
        .single();

    if (error) {
        throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return data.id;
}

/**
 * Add a message to a conversation
 */
export async function addMessage(options: AddMessageOptions): Promise<string> {
    const { conversationId, role, content, metadata } = options;

    const client = await createClient();

    // Convert content to JSON-compatible format
    const contentValue = typeof content === "string"
        ? content
        : JSON.stringify(content);

    // First, insert the message
    const { data: messageData, error: messageError } = await client
        .from("messages")
        .insert([
            {
                conversation_id: conversationId,
                role,
                content: contentValue,
                metadata: metadata || {},
            },
        ])
        .select("id")
        .single();

    if (messageError) {
        throw new Error(`Failed to add message: ${messageError.message}`);
    }

    // Update message count using SQL count for accuracy
    await updateMessageCount(client, conversationId);

    return messageData.id;
}

/**
 * Get a conversation with all its messages
 */
export async function getConversation(conversationId: string): Promise<{
    conversation: Conversation | null;
    messages: Message[];
}> {
    const client = await createClient();

    // Get conversation
    const { data: conversation, error: convError } = await client
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

    if (convError) {
        throw new Error(`Failed to get conversation: ${convError.message}`);
    }

    // Get all messages for this conversation
    const { data: messages, error: msgError } = await client
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

    if (msgError) {
        throw new Error(`Failed to get messages: ${msgError.message}`);
    }

    return {
        conversation: conversation as Conversation,
        messages: messages as Message[],
    };
}

/**
 * List conversations for a user with optional chapter filter and pagination
 */
export async function listConversations(
    options: ListConversationsOptions
): Promise<{
    conversations: Conversation[];
    nextCursor: string | null;
}> {
    const { userId, chapterId, limit = 20, cursor } = options;

    const client = await createClient();

    let query = client.from("conversations").select("*", { count: "exact" }).eq("user_id", userId);

    if (chapterId) {
        query = query.eq("chapter_id", chapterId);
    }

    if (cursor) {
        // Use offset-based pagination for simplicity
        // In production, consider keyset pagination for better performance
        const cursorInt = parseInt(cursor, 10);
        query = query.range(cursorInt, cursorInt + limit - 1);
    } else {
        query = query.range(0, limit - 1);
    }

    query = query.order("updated_at", { ascending: false });

    const { data: conversations, error, count } = await query;

    if (error) {
        throw new Error(`Failed to list conversations: ${error.message}`);
    }

    const conversationsList = conversations as Conversation[];

    // Calculate next cursor
    const nextCursor = count && conversationsList.length > 0
        ? Math.min(count, conversationsList.length).toString()
        : null;

    return {
        conversations: conversationsList,
        nextCursor,
    };
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
    const client = await createClient();

    // Delete messages first (cascade)
    const { error: msgError } = await client
        .from("messages")
        .eq("conversation_id", conversationId)
        .delete();

    if (msgError) {
        throw new Error(`Failed to delete messages: ${msgError.message}`);
    }

    // Delete conversation
    const { error: convError } = await client
        .from("conversations")
        .eq("id", conversationId)
        .delete();

    if (convError) {
        throw new Error(`Failed to delete conversation: ${convError.message}`);
    }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
    conversationId: string,
    title: string
): Promise<void> {
    const client = await createClient();
    const now = new Date().toISOString();

    const { error } = await client
        .from("conversations")
        .update({
            title,
            updated_at: now,
        })
        .eq("id", conversationId);

    if (error) {
        throw new Error(`Failed to update conversation title: ${error.message}`);
    }
}

/**
 * Get the last message for auto-titling conversations
 * Returns the last user message or null if no user messages exist
 */
export async function getLastActiveMessage(
    conversationId: string
): Promise<Message | null> {
    const client = await createClient();

    const { data, error } = await client
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (error) {
        // No user messages found, return null
        return null;
    }

    return data as Message;
}

/**
 * Extract a title from a message (last 30 characters sanitized)
 */
export function extractTitleFromContent(content: string): string {
    const sanitized = content.replace(/\s+/g, " ").trim();
    const preview = sanitized.length > 30 ? sanitized.slice(0, 30) + "..." : sanitized;
    return preview || "New Conversation";
}
