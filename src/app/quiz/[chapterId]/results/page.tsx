"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trophy, CheckCircle2, XCircle, AlertCircle, ArrowRight, RefreshCw, Trophy2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

interface AnswerDetail {
    questionId: string;
    question: string;
    userAnswer: string | string[];
    correctAnswer: string | string[];
    isCorrect: boolean;
    pointsEarned: number;
    explanation: string;
}

interface QuizResult {
    quizId: string;
    chapterId: number;
    chapterTitle: string;
    grade: number;
    subject: string;
    questions: AnswerDetail[];
    totalScore: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    timeTakenMinutes?: number;
}

export default function QuizResultsPage() {
    const params = useParams();
    const router = useRouter();
    const chapterId = Number(params.chapterId);

    const [result, setResult] = useState<QuizResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate fetching quiz results
        // In a real implementation, fetch from database
        setTimeout(() => {
            const mockResult: QuizResult = {
                quizId: `quiz-${chapterId}`,
                chapterId,
                chapterTitle: "Chapter Title",
                grade: 6,
                subject: "Science",
                questions: [
                    {
                        questionId: "q1",
                        question: "What is the main topic covered in this chapter?",
                        userAnswer: "Fundamental concepts",
                        correctAnswer: "Fundamental concepts of the chapter",
                        isCorrect: true,
                        pointsEarned: 15,
                        explanation: "This chapter introduces the core concepts and fundamental principles.",
                    },
                    {
                        questionId: "q2",
                        question: "Understanding the basic concepts helps in solving complex problems later.",
                        userAnswer: "true",
                        correctAnswer: "true",
                        isCorrect: true,
                        pointsEarned: 10,
                        explanation: "Yes, foundational knowledge is essential for building more complex understanding.",
                    },
                    {
                        questionId: "q3",
                        question: "Name one key term or concept introduced in this chapter.",
                        userAnswer: "Key concept",
                        correctAnswer: ["key concept", "important term", "main idea"],
                        isCorrect: true,
                        pointsEarned: 15,
                        explanation: "The chapter introduces several important terms and concepts.",
                    },
                    {
                        questionId: "q4",
                        question: "Which of the following is a common application?",
                        userAnswer: "Real-world problem solving",
                        correctAnswer: "Real-world problem solving",
                        isCorrect: true,
                        pointsEarned: 15,
                        explanation: "The concepts are meant to be applied to solve real-world problems.",
                    },
                    {
                        questionId: "q5",
                        question: "What is the primary goal of studying this chapter?",
                        userAnswer: "to understand key concepts",
                        correctAnswer: ["to understand key concepts", "to learn key principles"],
                        isCorrect: true,
                        pointsEarned: 10,
                        explanation: "The chapter aims to establish a strong foundation.",
                    },
                ],
                totalScore: 65,
                maxScore: 65,
                percentage: 100,
                passed: true,
                timeTakenMinutes: 12,
            };
            setResult(mockResult);
            setLoading(false);
        }, 500);
    }, [chapterId]);

    const handleRetryQuiz = () => {
        router.push(`/quiz/${chapterId}`);
    };

    const handleContinue = () => {
        router.push("/dashboard");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Results Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">No quiz results found for this chapter.</p>
                        <Button className="mt-4" onClick={handleContinue}>
                            Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const scoreColor = result.percentage >= 80 ? "text-primary" :
                       result.percentage >= 60 ? "text-secondary" : "text-destructive";

    const trophyColor = result.percentage >= 80 ? "text-yellow-500" :
                        result.percentage >= 60 ? "text-gray-500" : "text-red-500";

    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-block p-4 rounded-full bg-primary/10 mb-4">
                    {result.percentage >= 80 ? (
                        <Trophy2 className={`w-16 h-16 ${trophyColor} fill-current`} />
                    ) : result.percentage >= 60 ? (
                        <Trophy className={`w-16 h-16 ${trophyColor} fill-current`} />
                    ) : (
                        <AlertCircle className={`w-16 h-16 text-destructive fill-current`} />
                    )}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-outfit mb-2">
                    {result.percentage >= 60 ? (
                        <span className="text-primary">Quiz Completed!</span>
                    ) : (
                        <span className="text-destructive">Quiz Results</span>
                    )}
                </h1>
                <p className="text-muted-foreground">
                    {result.percentage >= 60 ? "Great job! You passed the quiz." : "Keep practicing to improve your score."}
                </p>
            </div>

            {/* Score Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="md:col-span-3">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="text-center md:text-left">
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                    Score
                                </p>
                                <div className={`text-5xl font-bold ${scoreColor}`}>
                                    {result.totalScore} <span className="text-2xl text-muted-foreground">/ {result.maxScore}</span>
                                </div>
                            </div>
                            <div className="flex-1 w-full md:w-48">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="font-medium">{result.percentage}%</span>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${scoreColor}`}
                                        style={{ width: `${result.percentage}%` }}
                                    />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                    {result.percentage >= 60 ? "Status" : "Need Improvement"}
                                </p>
                                <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${
                                    result.percentage >= 60
                                        ? "bg-primary/10 text-primary"
                                        : "bg-destructive/10 text-destructive"
                                }`}>
                                    {result.percentage >= 60 ? "PASSED" : "FAILED"}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Grade</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{result.grade}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Subject</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{result.subject}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Time Taken</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {result.timeTakenMinutes || 0} min
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Chapter Info */}
            <div className="mb-8">
                <h2 className="text-xl font-bold font-outfit mb-4">About This Quiz</h2>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <BookOpen className="w-6 h-6 text-primary shrink-0 mt-1" />
                            <div>
                                <h3 className="font-bold text-foreground mb-1">{result.chapterTitle}</h3>
                                <p className="text-sm text-muted-foreground">
                                    This quiz covers the key concepts and principles from the chapter.
                                    Review the incorrect answers below to improve your understanding.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Questions Review */}
            <div className="mb-8">
                <h2 className="text-xl font-bold font-outfit mb-4">Question Review</h2>
                <div className="space-y-4">
                    {result.questions.map((q, idx) => (
                        <Card key={q.questionId}>
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${q.isCorrect ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                                        {q.isCorrect ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : (
                                            <XCircle className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-medium text-foreground">
                                                {idx + 1}. {q.question}
                                            </h3>
                                            <span className="text-sm font-medium bg-muted px-2 py-1 rounded text-muted-foreground">
                                                {q.pointsEarned > 0 ? `${q.pointsEarned} pts` : "0 pts"}
                                            </span>
                                        </div>

                                        <div className={`p-3 rounded-xl mb-2 text-sm ${q.isCorrect ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"}`}>
                                            <p className="font-medium mb-1">
                                                {q.isCorrect ? "Correct Answer:" : "Correct Answer:"}
                                            </p>
                                            <p>{String(q.correctAnswer)}</p>
                                        </div>

                                        {String(q.userAnswer).toLowerCase() !== String(q.correctAnswer).toLowerCase() && (
                                            <div className="p-3 bg-muted/30 rounded-xl mb-2 text-sm">
                                                <p className="text-muted-foreground mb-1">Your Answer:</p>
                                                <p>{String(q.userAnswer)}</p>
                                            </div>
                                        )}

                                        <div className="mt-3 pt-3 border-t border-border flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                            <p className="text-sm text-muted-foreground italic">{q.explanation}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                    variant="outline"
                    onClick={handleRetryQuiz}
                    className="w-full sm:w-auto"
                >
                    <RefreshCw className="mr-2 w-4 h-4" />
                    Try Again
                </Button>
                <Button onClick={handleContinue} className="w-full sm:w-auto">
                    Continue Learning <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
