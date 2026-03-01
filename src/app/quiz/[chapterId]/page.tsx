"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, Clock, AlertCircle, CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { generateDemoQuiz, type GeneratedQuiz } from "@/lib/quiz/generator";
import { isAnswerCorrect } from "@/lib/quiz/grading";

interface QuizQuestion {
    id: string;
    type: "multiple-choice" | "true-false" | "short-answer";
    question: string;
    options?: string[];
    correctAnswer: string | string[];
    explanation: string;
    points: number;
}

interface QuizState {
    status: "loading" | "ready" | "in-progress" | "completed";
    quiz?: GeneratedQuiz;
    answers: Record<string, string | string[]>;
    currentQuestionIndex: number;
}

export default function QuizPage() {
    const params = useParams();
    const router = useRouter();
    const chapterId = Number(params.chapterId);

    const [state, setState] = useState<QuizState>({
        status: "loading",
        answers: {},
        currentQuestionIndex: 0,
    });

    const [userAnswer, setUserAnswer] = useState<string>("");

    useEffect(() => {
        // Generate a demo quiz for now
        let cancelled = false;
        const loadQuiz = async () => {
            const quiz = generateDemoQuiz(chapterId, "Chapter Title", 6, "Science");
            if (!cancelled) {
                setState((prev) => ({
                    ...prev,
                    status: "ready",
                    quiz,
                }));
            }
        };
        loadQuiz();
        return () => { cancelled = true; };
    }, [chapterId]);

    const currentQuestion = state.quiz?.questions[state.currentQuestionIndex];

    const handleStartQuiz = () => {
        setState((prev) => ({
            ...prev,
            status: "in-progress",
        }));
    };

    const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setUserAnswer(e.target.value);
    };

    const handleNextQuestion = () => {
        if (!currentQuestion) return;

        // Save current answer
        let answer: string | string[] = userAnswer;
        if (currentQuestion.type === "multiple-choice" && userAnswer) {
            answer = userAnswer;
        }

        setState((prev) => ({
            ...prev,
            answers: {
                ...prev.answers,
                [currentQuestion.id]: answer,
            },
            currentQuestionIndex: prev.currentQuestionIndex + 1,
        }));

        setUserAnswer("");
    };

    const handlePreviousQuestion = () => {
        setState((prev) => ({
            ...prev,
            currentQuestionIndex: Math.max(0, prev.currentQuestionIndex - 1),
        }));
    };

    const handleSubmitQuiz = async () => {
        if (!state.quiz) return;

        // Save submission
        const submission = {
            id: `submission-${Date.now()}`,
            user_id: "user-id-placeholder",
            quiz_id: state.quiz.id,
            chapter_id: chapterId,
            answers: state.answers,
            score: 0,
            totalPoints: state.quiz.totalPoints,
            percentage: 0,
            status: "incomplete",
            answersDetail: [],
            submittedAt: new Date().toISOString(),
        };

        // In a real implementation, save to database and calculate score
        router.push(`/quiz/${chapterId}/results`);
    };

    if (state.status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (state.status === "ready" && !state.quiz) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Quiz Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">The quiz for this chapter is not available.</p>
                        <Button className="mt-4" onClick={() => router.push("/dashboard")}>
                            Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (state.status === "ready" && state.quiz) {
        return (
            <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-3xl mx-auto">
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-primary" />
                            {state.quiz.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">{state.quiz.description}</p>

                        <div className="grid grid-cols-3 gap-4 py-4">
                            <div className="flex flex-col items-center p-3 bg-muted/30 rounded-xl">
                                <Clock className="w-6 h-6 text-secondary mb-2" />
                                <span className="text-xs text-muted-foreground">Time Limit</span>
                                <span className="font-bold text-sm">{state.quiz.timeLimitMinutes} min</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-muted/30 rounded-xl">
                                <RefreshCw className="w-6 h-6 text-accent mb-2" />
                                <span className="text-xs text-muted-foreground">Questions</span>
                                <span className="font-bold text-sm">{state.quiz.questions.length}</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-muted/30 rounded-xl">
                                <CheckCircle2 className="w-6 h-6 text-primary mb-2" />
                                <span className="text-xs text-muted-foreground">Passing Score</span>
                                <span className="font-bold text-sm">{state.quiz.passingScore}</span>
                            </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                            <AlertCircle className="w-5 h-5 text-primary mb-2" />
                            <p className="text-sm text-primary/80">
                                You will have {state.quiz.timeLimitMinutes} minutes to complete{" "}
                                {state.quiz.questions.length} questions. Each question is worth{" "}
                                {Math.floor(state.quiz.totalPoints / state.quiz.questions.length)} points.
                            </p>
                        </div>

                        <Button
                            size="lg"
                            className="w-full"
                            onClick={handleStartQuiz}
                        >
                            Start Quiz <ChevronRight className="ml-2 w-5 h-5" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (state.status === "in-progress" && state.quiz && currentQuestion) {
        const isLastQuestion = state.currentQuestionIndex === state.quiz.questions.length - 1;

        return (
            <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold font-outfit">Question {state.currentQuestionIndex + 1} of {state.quiz.questions.length}</h1>
                        <p className="text-muted-foreground">Topic: {currentQuestion.type}</p>
                    </div>
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                        {Math.round(((state.currentQuestionIndex) / state.quiz.questions.length) * 100)}%
                    </div>
                </div>

                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <h2 className="text-xl font-bold text-foreground mb-6">
                            {currentQuestion.question}
                        </h2>

                        <div className="space-y-4">
                            {currentQuestion.type === "multiple-choice" && currentQuestion.options && (
                                <div className="space-y-3">
                                    {currentQuestion.options.map((option, idx) => (
                                        <label
                                            key={idx}
                                            className="flex items-start gap-3 p-4 border border-border rounded-xl hover:bg-primary/5 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${userAnswer === option ? "border-primary bg-primary/10" : "border-border"}`}>
                                                    {userAnswer === option && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                                                </div>
                                                <span className="font-medium text-foreground">{option}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {currentQuestion.type === "true-false" && (
                                <div className="grid grid-cols-2 gap-4">
                                    {["True", "False"].map((answer) => (
                                        <button
                                            key={answer}
                                            onClick={() => setUserAnswer(answer.toLowerCase())}
                                            className={`p-4 rounded-xl border-2 font-medium transition-all ${userAnswer === answer.toLowerCase()
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border hover:border-primary/50"
                                                }`}
                                        >
                                            {answer}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {currentQuestion.type === "short-answer" && (
                                <div className="space-y-3">
                                    <textarea
                                        value={userAnswer}
                                        onChange={handleAnswerChange}
                                        placeholder="Type your answer here..."
                                        className="w-full min-h-[120px] px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Please provide a concise answer. Use complete sentences when possible.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                            <Button
                                variant="outline"
                                onClick={handlePreviousQuestion}
                                disabled={state.currentQuestionIndex === 0}
                            >
                                Previous
                            </Button>

                            {isLastQuestion ? (
                                <Button
                                    size="lg"
                                    onClick={handleSubmitQuiz}
                                    disabled={!userAnswer.trim()}
                                >
                                    Submit Quiz
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleNextQuestion}
                                    disabled={!userAnswer.trim()}
                                >
                                    Next <ChevronRight className="ml-2 w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
