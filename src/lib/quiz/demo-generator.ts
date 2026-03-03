/**
 * Demo quiz generation utilities
 * Intended for client-side use
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