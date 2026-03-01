import { createClient } from "@/utils/supabase/server";

export async function GET() {
    try {
        const supabase = createClient();

        // Fetch active users (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: activeUsers, error: usersError } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .gte("last_login", thirtyDaysAgo.toISOString());

        // Fetch total messages
        const { count: totalMessages, error: messagesError } = await supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true });

        // Fetch popular chapters
        const { data: popularChapters, error: chaptersError } = await supabase
            .from("chapter_interactions")
            .select("chapter_id, chapter_title, interaction_count")
            .order("interaction_count", { ascending: false })
            .limit(10);

        // Fetch average quiz score
        const { data: quizData, error: quizError } = await supabase
            .from("quiz_attempts")
            .select("score")
            .neq("score", null);

        const averageQuizScore = quizData?.length
            ? quizData.reduce((sum, q) => sum + q.score, 0) / quizData.length
            : 0;

        // Fetch intent distribution
        const { data: intentsData, error: intentsError } = await supabase
            .from("chat_sessions")
            .select("router_intent");

        const intentCounts: Record<string, number> = {};
        let totalIntents = 0;

        intentsData?.forEach((row) => {
            if (row.router_intent) {
                intentCounts[row.router_intent] = (intentCounts[row.router_intent] || 0) + 1;
                totalIntents++;
            }
        });

        const intentDistribution = Object.entries(intentCounts).map(([intent, count]) => ({
            intent,
            count,
            percentage: totalIntents > 0 ? (count / totalIntents) * 100 : 0,
        }));

        return Response.json({
            activeUsers: activeUsers || 0,
            totalMessages: totalMessages || 0,
            popularChapters: popularChapters || [],
            averageQuizScore,
            intentDistribution: intentDistribution.sort((a, b) => b.count - a.count),
        });
    } catch (error) {
        console.error("Error fetching analytics:", error);
        return Response.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}
