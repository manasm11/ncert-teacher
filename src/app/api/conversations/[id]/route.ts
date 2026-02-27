import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getConversation, getConversationMessages } from "@/lib/chat/conversationService";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const supabase = await createClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get conversation
        const conversation = await getConversation(id);

        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        // Check if user owns this conversation
        if (conversation.user_id !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get messages for this conversation
        const messages = await getConversationMessages(id);

        return NextResponse.json({
            conversation,
            messages
        });
    } catch (error: unknown) {
        console.error("Get conversation error:", error);
        const message = error instanceof Error ? error.message : "Failed to get conversation";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}