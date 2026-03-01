import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const LeaderboardSchema = z.object({
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
    grade: z.number().min(1).max(12).optional(),
    subject: z.string().optional(),
    period: z.enum(["all_time", "monthly", "weekly", "daily"]).optional(),
});

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;

        const validation = LeaderboardSchema.safeParse({
            limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50,
            offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0,
            grade: searchParams.get("grade") ? parseInt(searchParams.get("grade")!) : undefined,
            subject: searchParams.get("subject"),
            period: searchParams.get("period") as "all_time" | "monthly" | "weekly" | "daily" | null,
        });

        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid parameters", details: validation.error.errors },
                { status: 400 }
            );
        }

        const { limit, offset, grade, subject, period } = validation.data;

        const supabase = createClient();

        // Build query with filters
        let query = supabase
            .from("user_xp")
            .select(`
                user_id,
                profiles (
                    display_name,
                    avatar_url,
                    grade,
                    role
                ),
                total_xp,
                level,
                current_xp,
                xp_to_next_level
            `)
            .order("total_xp", { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply grade filter
        if (grade) {
            query = query.eq("profiles.grade", grade);
        }

        // Apply subject filter (would need user_subjects junction table)
        if (subject) {
            // This would require a user_subjects table
            // For now, skip or use a different approach
        }

        // Apply time period filter for XP transactions
        if (period) {
            const dateFilter = getPeriodDateFilter(period);
            // Note: For accurate period filtering, we'd need to sum recent transactions
            // For now, return all-time XP with note about period
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching leaderboard:", error);
            return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
        }

        // Process and return leaderboard data
        const leaderboard = (data || []).map((entry, index) => ({
            rank: offset + index + 1,
            userId: entry.user_id,
            displayName: entry.profiles?.display_name || "Anonymous",
            avatarUrl: entry.profiles?.avatar_url || null,
            grade: entry.profiles?.grade,
            totalXp: entry.total_xp || 0,
            level: entry.level || 1,
            currentXp: entry.current_xp || 0,
            xpToNextLevel: entry.xp_to_next_level || 0,
            progressPercent: entry.current_xp && entry.xp_to_next_level
                ? Math.round(((entry.current_xp - getXpForLevel(entry.level || 1)) / entry.xp_to_next_level) * 100)
                : 0,
        }));

        // Get total count for pagination
        const { count } = await supabase
            .from("user_xp")
            .select("*", { count: "exact", head: true });

        return NextResponse.json({
            leaderboard,
            pagination: {
                limit,
                offset,
                totalCount: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
                currentPage: Math.floor(offset / limit) + 1,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Leaderboard API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch leaderboard" },
            { status: 500 }
        );
    }
}

/**
 * Get date filter based on period
 */
function getPeriodDateFilter(period: string): string {
    const now = new Date();
    switch (period) {
        case "daily":
            return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        case "weekly":
            const weekly = new Date(now);
            weekly.setDate(now.getDate() - 7);
            return weekly.toISOString();
        case "monthly":
            const monthly = new Date(now);
            monthly.setMonth(now.getMonth() - 1);
            return monthly.toISOString();
        default:
            return new Date(0).toISOString(); // All time
    }
}

/**
 * Calculate XP for level
 */
function getXpForLevel(level: number): number {
    return Math.floor(Math.sqrt(level * 100));
}
