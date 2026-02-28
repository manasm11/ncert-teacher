import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { listConversations } from "@/lib/chat/conversationService";

/**
 * GET /api/conversations
 * List all conversations for the current user
 *
 * Query parameters:
 * - limit: Number of conversations to return (default: 20)
 * - cursor: Cursor for pagination
 * - chapterId: Filter by chapter ID (optional)
 */
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "20", 10);
        const cursor = url.searchParams.get("cursor") || undefined;
        const chapterId = url.searchParams.get("chapterId") || undefined;

        // Get the current user from the session
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized - please log in to view your conversations" },
                { status: 401 }
            );
        }

        const userId = user.id;

        // List conversations
        const result = await listConversations({
            userId,
            chapterId,
            limit,
            cursor,
        });

        // Return conversations with formatted data
        const conversations = result.conversations.map((conv) => ({
            id: conv.id,
            title: conv.title,
            chapterId: conv.chapter_id,
            createdAt: conv.created_at,
            updatedAt: conv.updated_at,
            messageCount: conv.message_count,
        }));

        return NextResponse.json({
            conversations,
            nextCursor: result.nextCursor,
            hasMore: result.nextCursor !== null,
        });

    } catch (error: unknown) {
        console.error("Error listing conversations:", error);
        const message = error instanceof Error ? error.message : "Failed to retrieve conversations";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
