import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ROLES } from "@/lib/auth/roles";
import { getUserFriendlyMessage } from "@/lib/errors";

/**
 * POST /api/admin/chapters/bulk-status - Bulk update chapter status
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = createClient();

        // Check if user is authenticated
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "You must be logged in to update chapters" },
                { status: 401 }
            );
        }

        // Get user's role from profiles table
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("Error fetching profile:", profileError);
            return NextResponse.json(
                { error: "Failed to fetch user profile" },
                { status: 500 }
            );
        }

        if (!profile) {
            return NextResponse.json(
                { error: "User profile not found" },
                { status: 404 }
            );
        }

        // Check if user is admin
        if (profile.role !== ROLES.ADMIN) {
            return NextResponse.json(
                { error: "Unauthorized - only admins can update chapters" },
                { status: 403 }
            );
        }

        // Parse and validate request body
        const body = await req.json();

        const { chapterIds, status } = body;

        if (!chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
            return NextResponse.json(
                { error: "Invalid or empty chapter IDs array", code: "VALIDATION_ERROR" },
                { status: 400 }
            );
        }

        if (!status || !["draft", "published"].includes(status)) {
            return NextResponse.json(
                { error: "Invalid status. Must be 'draft' or 'published'", code: "VALIDATION_ERROR" },
                { status: 400 }
            );
        }

        // Update the chapters
        const { error } = await supabase
            .from("chapters")
            .update({ status })
            .in("id", chapterIds);

        if (error) {
            console.error("Error updating chapter status:", error);
            return NextResponse.json(
                { error: "Failed to update chapter status" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: `Successfully updated ${chapterIds.length} chapter(s) to ${status}` },
            { status: 200 }
        );
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: getUserFriendlyMessage(error) },
            { status: 500 }
        );
    }
}
