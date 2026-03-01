import { createClient } from "@/utils/supabase/server";
import { serverEnv } from "@/lib/env";
import { zodResponseFormat } from "openai/resources";
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
            schema: zodResponseFormat(
                {
                    title: zodResponseFormat.string(),
                    description: zodResponseFormat.string(),
                    questions: zodResponseFormat.array(
                        zodResponseFormat.object({
                            id: zodResponseFormat.string(),
                            type: zodResponseFormat.enum(["multiple-choice", "true-false", "short-answer"]),
                            question: zodResponseFormat.string(),
                            options: zodResponseFormat.array(zodResponseFormat.string()).optional(),
                            correctAnswer: zodResponseFormat.union([zodResponseFormat.string(), zodResponseFormat.array(zodResponseFormat.string())]),
                            explanation: zodResponseFormat.string(),
                            points: zodResponseFormat.number(),
                        })
                    ),
                },
                "QuizSchema"
            ),
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

/**
 * Generate a sample quiz for demonstration
 */
export function generateDemoQuiz(chapterId: number, chapterTitle: string, grade: number, subject: string): GeneratedQuiz {
    const questions: QuizQuestion[] = [
        {
            id: "q1",
            type: "multiple-choice",
            question: `What is the main topic covered in Chapter ${chapterTitle} for Class ${grade} ${subject}?`,
            options: ["Fundamental concepts of the chapter", "Advanced theoretical concepts", "Historical context only", "Practice problems only"],
            correctAnswer: "Fundamental concepts of the chapter",
            explanation: "This chapter introduces the core concepts and fundamental principles of the subject.",
            points: 15,
        },
        {
            id: "q2",
            type: "true-false",
            question: "Understanding the basic concepts helps in solving complex problems later.",
            correctAnswer: "true",
            explanation: "Yes, foundational knowledge is essential for building more complex understanding.",
            points: 10,
        },
        {
            id: "q3",
            type: "short-answer",
            question: "Name one key term or concept introduced in this chapter.",
            correctAnswer: ["key concept", "important term", "main idea"],
            explanation: "The chapter introduces several important terms and concepts that form the foundation.",
            points: 15,
        },
        {
            id: "q4",
            type: "multiple-choice",
            question: "Which of the following is a common application of the concepts in this chapter?",
            options: ["Real-world problem solving", "Purely theoretical study", " Memorization only", "None of the above"],
            correctAnswer: "Real-world problem solving",
            explanation: "The concepts learned are meant to be applied to understand and solve real-world problems.",
            points: 15,
        },
        {
            id: "q5",
            type: "short-answer",
            question: "What is the primary goal of studying this chapter?",
            correctAnswer: ["to understand key concepts", "to learn key principles", "to build foundation"],
            explanation: "The chapter aims to establish a strong foundation in the subject area.",
            points: 10,
        },
    ];

    return {
        id: `quiz-${chapterId}-${Date.now()}`,
        chapter_id: chapterId,
        title: `Chapter ${chapterTitle} Quiz`,
        description: "Test your understanding of the concepts covered in this chapter",
        questions,
        totalPoints: 65,
        timeLimitMinutes: 15,
        passingScore: 40,
        createdAt: new Date().toISOString(),
    };
}
