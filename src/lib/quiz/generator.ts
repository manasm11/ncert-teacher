// This file should only be used in server components/actions
import { createClient } from "@/utils/supabase/server";
import { serverEnv } from "@/lib/env";
import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { generateObject } from "ai";

/**
 * Quiz generation configuration
 */
export interface QuizConfig {
    questionCount: number;
    difficulty: "easy" | "medium" | "hard";
    questionTypes: ("multiple-choice" | "true-false" | "short-answer")[];
}

/**
 * Individual quiz question
 */
export interface QuizQuestion {
    id: string;
    type: "multiple-choice" | "true-false" | "short-answer";
    question: string;
    options?: string[];
    correctAnswer: string | string[];
    explanation: string;
    points: number;
}

/**
 * Generated quiz object
 */
export interface GeneratedQuiz {
    id: string;
    chapter_id: number;
    title: string;
    description: string;
    questions: QuizQuestion[];
    totalPoints: number;
    timeLimitMinutes: number;
    passingScore: number;
    createdAt: string;
}

/**
 * Generate a quiz using LLM based on chapter content
 */
export async function generateQuiz(
    chapterId: number,
    config: Partial<QuizConfig> = {}
): Promise<GeneratedQuiz> {
    const supabase = createClient();

    // Fetch chapter content
    const { data: chapter, error: chapterError } = await supabase
        .from("chapters")
        .select("id, title, content, grade, subject_id")
        .eq("id", chapterId)
        .single();

    if (chapterError || !chapter) {
        throw new Error(`Chapter not found: ${chapterId}`);
    }

    const {
        questionCount = 5,
        difficulty = "medium",
        questionTypes = ["multiple-choice", "true-false"],
    } = config;

    // Determine points based on difficulty
    const pointsPerQuestion =
        difficulty === "easy" ? 10 :
        difficulty === "medium" ? 15 : 20;

    // Construct LLM prompt for quiz generation
    const prompt = `Generate a ${difficulty} level quiz for the chapter "${chapter.title}" from NCERT Class ${chapter.grade} ${chapter.subject_id}.

Chapter Content (from markdown):
${chapter.content}

Generate ${questionCount} questions using these formats: ${questionTypes.join(", ")}.

Return a JSON object with this exact schema:
{
    "title": "Quiz Title - Chapter Name",
    "description": "Brief description of what the quiz covers",
    "questions": [
        {
            "id": "q1",
            "type": "multiple-choice" | "true-false" | "short-answer",
            "question": "The question text",
            "options": ["Option A", "Option B", "Option C", "Option D"] (only for multiple-choice),
            "correctAnswer": "correct answer text or letter",
            "explanation": "Why this answer is correct",
            "points": ${pointsPerQuestion}
        }
    ]
}`;

    // Generate quiz using AI
    try {
        const result = await generateObject({
            model: {
                // Use OpenAI-compatible API through Ollama Cloud
                generate: async ({ prompt }) => {
                    const response = await fetch(`${serverEnv.OLLAMA_CLOUD_ENDPOINT}/v1/chat/completions`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${serverEnv.OLLAMA_CLOUD_API_KEY}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            model: "qwen-3.5",
                            messages: [
                                { role: "system", content: "You are an expert quiz generator for NCERT curriculum. Always respond with valid JSON." },
                                { role: "user", content: prompt },
                            ],
                            temperature: 0.7,
                            max_tokens: 2000,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`LLM API error: ${response.statusText}`);
                    }

                    const data = await response.json();
                    return { text: data.choices[0].message.content };
                },
            },
            schema: z.object({
                title: z.string(),
                description: z.string(),
                questions: z.array(
                    z.object({
                        id: z.string(),
                        type: z.enum(["multiple-choice", "true-false", "short-answer"]),
                        question: z.string(),
                        options: z.array(z.string()).optional(),
                        correctAnswer: z.union([z.string(), z.array(z.string())]),
                        explanation: z.string(),
                        points: z.number(),
                    })
                ),
            }),
            temperature: 0.7,
        });

        const quizData = result.object;

        return {
            id: `quiz-${chapterId}-${Date.now()}`,
            chapter_id: chapterId,
            title: quizData.title,
            description: quizData.description,
            questions: quizData.questions.map((q, idx) => ({
                ...q,
                id: `q${idx + 1}`,
            })),
            totalPoints: quizData.questions.reduce((sum, q) => sum + q.points, 0),
            timeLimitMinutes: Math.ceil(questionCount * 2.5), // 2.5 minutes per question
            passingScore: Math.ceil(quizData.questions.length * pointsPerQuestion * 0.6), // 60% passing
            createdAt: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Error generating quiz:", error);
        throw new Error("Failed to generate quiz. Please try again.");
    }
}

// Note: generateDemoQuiz has been moved to demo-generator.ts for client-side usage
