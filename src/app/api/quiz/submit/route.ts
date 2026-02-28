import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { gradeQuiz, calculateQuizStats, saveQuizSubmission } from "@/lib/quiz/grading";
import { z } from "zod";

const SubmitQuizSchema = z.object({
    quizId: z.string().min(1),
    answers: z.record(z.union([z.string(), z.array(z.string())])),
    timeTakenMinutes: z.number().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const validation = SubmitQuizSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid request body", details: validation.error.errors },
                { status: 400 }
            );
        }

        const { quizId, answers, timeTakenMinutes } = validation.data;

        const supabase = createClient();

        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch the quiz
        const { data: quiz, error: quizError } = await supabase
            .from("quizzes")
            .select("*")
            .eq("id", quizId)
            .single();

        if (quizError || !quiz) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        // Verify user hasn't already submitted this quiz
        const { data: existingSubmission } = await supabase
            .from("quiz_submissions")
            .select("id")
            .eq("user_id", user.id)
            .eq("quiz_id", quizId)
            .limit(1)
            .single();

        if (existingSubmission) {
            return NextResponse.json({ error: "Quiz already submitted" }, { status: 409 });
        }

        // Grade the quiz
        const answersDetails = gradeQuiz(answers, quiz.questions);
        const stats = calculateQuizStats(answersDetails);

        const passed = stats.percentage >= (quiz.passing_score || 60);
        const score = stats.totalScore;

        // Calculate XP based on performance
        const baseXp = 50;
        const xpMultiplier = passed ? 1.5 : 1.0;
        const xpEarned = Math.round(baseXp * xpMultiplier * (stats.percentage / 100));

        // Save submission
        const submissionData = {
            id: `submission-${Date.now()}`,
            user_id: user.id,
            quiz_id: quizId,
            chapter_id: quiz.chapter_id,
            answers,
            score,
            total_points: quiz.total_points,
            percentage: stats.percentage,
            status: passed ? "passed" : "failed",
            answers_detail: answersDetails,
            time_taken_minutes: timeTakenMinutes,
        };

        const { error: submissionError } = await supabase
            .from("quiz_submissions")
            .insert(submissionData);

        if (submissionError) {
            console.error("Error saving submission:", submissionError);
            return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
        }

        // Update chapter progress if passed
        if (passed) {
            // Check if chapter progress exists
            const { data: existingProgress } = await supabase
                .from("user_progress")
                .select("id")
                .eq("user_id", user.id)
                .eq("chapter_id", quiz.chapter_id)
                .single();

            const progressData = {
                user_id: user.id,
                chapter_id: quiz.chapter_id,
                status: existingProgress ? "in-progress" : "in-progress",
                progress: 100,
                last_accessed: new Date().toISOString(),
            };

            if (existingProgress) {
                await supabase
                    .from("user_progress")
                    .update(progressData)
                    .eq("id", existingProgress.id);
            } else {
                await supabase.from("user_progress").insert(progressData);
            }

            // Award XP for chapter completion
            await supabase.from("xp_transactions").insert({
                user_id: user.id,
                amount: xpEarned,
                category: "quiz_completion",
                reference_id: quizId,
                description: `Earned ${xpEarned} XP for passing the quiz`,
                created_at: new Date().toISOString(),
            });

            // Update total XP
            const { data: userXp } = await supabase
                .from("user_xp")
                .select("total_xp, level")
                .eq("user_id", user.id)
                .single();

            const newTotalXp = (userXp?.total_xp || 0) + xpEarned;
            const newLevel = Math.floor(Math.sqrt(newTotalXp / 100));

            const { error: xpError } = await supabase
                .from("user_xp")
                .upsert({
                    user_id: user.id,
                    total_xp: newTotalXp,
                    level: newLevel,
                    last_updated: new Date().toISOString(),
                });

            if (xpError) {
                console.error("Error updating XP:", xpError);
            }

            // Check for badge: Quiz Champion
            const { count: quizCount } = await supabase
                .from("quiz_submissions")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("status", "passed");

            if (quizCount && quizCount >= 5) {
                // Award badge
                const { error: badgeError } = await supabase
                    .from("user_badges")
                    .insert({
                        user_id: user.id,
                        badge_id: "quiz_champion",
                        earned_at: new Date().toISOString(),
                    });

                if (!badgeError) {
                    // Add to XP transactions
                    await supabase.from("xp_transactions").insert({
                        user_id: user.id,
                        amount: 25,
                        category: "badge_earned",
                        reference_id: "quiz_champion",
                        description: "Earned 25 XP for Quiz Champion badge",
                        created_at: new Date().toISOString(),
                    });
                }
            }
        }

        // Return submission results
        return NextResponse.json({
            success: true,
            submission: {
                id: submissionData.id,
                quizId,
                score,
                totalPoints: quiz.total_points,
                percentage: stats.percentage,
                passed,
                xpEarned,
                stats: {
                    correct: stats.correctCount,
                    total: stats.totalCount,
                },
            },
        });
    } catch (error) {
        console.error("Error submitting quiz:", error);
        return NextResponse.json(
            { error: "Failed to submit quiz. Please try again." },
            { status: 500 }
        );
    }
}
