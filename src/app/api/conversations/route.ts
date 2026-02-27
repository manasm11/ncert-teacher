import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { listUserConversations } from "@/lib/chat/conversationService";

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get query parameters for pagination
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");

        const conversations = await listUserConversations(user.id, limit, offset);

        return NextResponse.json(conversations);
    } catch (error: unknown) {
        console.error("List conversations error:", error);
        const message = error instanceof Error ? error.message : "Failed to list conversations";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}