import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getConversation, deleteConversation } from "@/lib/chat/conversationService";

/**
 * GET /api/conversations/[id]
 * Get full conversation history with messages
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: conversationId } = await params;

        // Get the current user from the session
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized - please log in to view conversation history" },
                { status: 401 }
            );
        }

        // Verify the conversation belongs to this user
        const { data: conversation, error: convError } = await supabase
            .from("conversations")
            .select("user_id")
            .eq("id", conversationId)
            .single();

        if (convError || !conversation) {
            return NextResponse.json(
                { error: "Conversation not found" },
                { status: 404 }
            );
        }

        if (conversation.user_id !== user.id) {
            return NextResponse.json(
                { error: "Access denied - this conversation belongs to another user" },
                { status: 403 }
            );
        }

        // Get the full conversation with messages
        const result = await getConversation(conversationId);

        // Format the response
        return NextResponse.json({
            conversation: {
                id: result.conversation?.id,
                title: result.conversation?.title,
                chapterId: result.conversation?.chapter_id,
                createdAt: result.conversation?.created_at,
                updatedAt: result.conversation?.updated_at,
                messageCount: result.conversation?.message_count,
            },
            messages: result.messages.map((msg) => ({
                id: msg.id,
                conversationId: msg.conversation_id,
                role: msg.role,
                content: msg.content,
                metadata: msg.metadata,
                createdAt: msg.created_at,
            })),
        });

    } catch (error: unknown) {
        console.error("Error fetching conversation:", error);
        const message = error instanceof Error ? error.message : "Failed to retrieve conversation";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/conversations/[id]
 * Delete a conversation and all its messages
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: conversationId } = await params;

        // Get the current user from the session
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized - please log in to delete conversations" },
                { status: 401 }
            );
        }

        // Verify the conversation belongs to this user
        const { data: conversation, error: convError } = await supabase
            .from("conversations")
            .select("user_id")
            .eq("id", conversationId)
            .single();

        if (convError || !conversation) {
            return NextResponse.json(
                { error: "Conversation not found" },
                { status: 404 }
            );
        }

        if (conversation.user_id !== user.id) {
            return NextResponse.json(
                { error: "Access denied - cannot delete another user's conversation" },
                { status: 403 }
            );
        }

        // Delete the conversation
        await deleteConversation(conversationId);

        return NextResponse.json(
            { success: true, message: "Conversation deleted successfully" },
            { status: 200 }
        );

    } catch (error: unknown) {
        console.error("Error deleting conversation:", error);
        const message = error instanceof Error ? error.message : "Failed to delete conversation";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
