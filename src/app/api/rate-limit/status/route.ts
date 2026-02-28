/**
 * API Route for Rate Limit Status
 *
 * GET /api/rate-limit/status
 * Returns the current user's rate limit status
 */

import { NextRequest, NextResponse } from "next/server";
import { getRateLimitStatusMiddleware } from "@/lib/rateLimit";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
    try {
        const supabase = createClient();

        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "You must be logged in to check rate limit status" },
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

        // Get rate limit status
        const status = await getRateLimitStatusMiddleware(user.id, profile.role);

        if ("error" in status) {
            return NextResponse.json(status, { status: 500 });
        }

        return NextResponse.json(status);
    } catch (error: unknown) {
        console.error("Rate Limit Status API Error:", error);
        const message = error instanceof Error ? error.message : "Failed to retrieve rate limit status";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
