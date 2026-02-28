import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateQuiz, type GeneratedQuiz } from "@/lib/quiz/generator";
import { z } from "zod";

const GenerateQuizSchema = z.object({
    chapterId: z.number().min(1),
    questionCount: z.number().min(1).max(20).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    questionTypes: z.array(z.enum(["multiple-choice", "true-false", "short-answer"])).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const validation = GenerateQuizSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid request body", details: validation.error.errors },
                { status: 400 }
            );
        }

        const { chapterId, questionCount, difficulty, questionTypes } = validation.data;

        const supabase = createClient();

        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if chapter exists
        const { data: chapter, error: chapterError } = await supabase
            .from("chapters")
            .select("id, title")
            .eq("id", chapterId)
            .single();

        if (chapterError || !chapter) {
            return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
        }

        // Check if user has already submitted a quiz for this chapter
        const { data: existingSubmission } = await supabase
            .from("quiz_submissions")
            .select("id")
            .eq("user_id", user.id)
            .eq("chapter_id", chapterId)
            .order("submitted_at", { ascending: false })
            .limit(1)
            .single();

        if (existingSubmission) {
            return NextResponse.json(
                { error: "Quiz already taken for this chapter", quizId: existingSubmission.id },
                { status: 409 }
            );
        }

        // Generate the quiz
        const quiz: GeneratedQuiz = await generateQuiz(chapterId, {
            questionCount,
            difficulty: difficulty || "medium",
            questionTypes,
        });

        // Store the quiz in database
        const { data: quizData, error: quizError } = await supabase
            .from("quizzes")
            .insert({
                id: quiz.id,
                chapter_id: quiz.chapter_id,
                title: quiz.title,
                description: quiz.description,
                questions: quiz.questions,
                total_points: quiz.totalPoints,
                time_limit_minutes: quiz.timeLimitMinutes,
                passing_score: quiz.passingScore,
                created_by: user.id,
            })
            .select()
            .single();

        if (quizError) {
            console.error("Error saving quiz:", quizError);
            return NextResponse.json({ error: "Failed to save quiz" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            quiz: {
                id: quizData.id,
                chapter_id: quizData.chapter_id,
                title: quizData.title,
                description: quizData.description,
                questionCount: quizData.questions.length,
                totalPoints: quizData.total_points,
                timeLimitMinutes: quizData.time_limit_minutes,
                passingScore: quizData.passing_score,
                createdAt: quizData.created_at,
            },
        });
    } catch (error) {
        console.error("Error generating quiz:", error);
        return NextResponse.json(
            { error: "Failed to generate quiz. Please try again." },
            { status: 500 }
        );
    }
}
