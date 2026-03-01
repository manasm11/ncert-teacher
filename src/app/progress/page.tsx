"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { BookOpen, Zap, Award, Trophy, Clock, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
    earned: boolean;
    earnedAt?: string;
}

interface SubjectProgress {
    subject: string;
    chaptersTotal: number;
    chaptersCompleted: number;
    progress: number;
}

interface QuizResult {
    id: string;
    quizTitle: string;
    subject: string;
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    date: string;
}

interface Activity {
    id: string;
    type: string;
    title: string;
    timestamp: string;
    details: string;
}

export default function ProgressReportPage() {
    const [userProgress, setUserProgress] = useState<any>(null);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
    const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
    const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProgressData = async () => {
        const supabase = createClient();
        setLoading(true);

        // Get user profile
        const { data: { user } } = await supabase.auth.getUser();

        // Mock data for now
        const progressData = {
            totalXp: 3500,
            level: 5,
            chaptersCompleted: 12,
            chaptersInprogress: 3,
            streak: 7,
            quizzesTaken: 8,
            badgesEarned: 4,
        };

        const mockBadges: Badge[] = [
            { id: "first_steps", name: "First Steps", icon: "🌱", description: "Complete your first chapter", earned: true, earnedAt: "2024-02-01" },
            { id: "curious_explorer", name: "Curious Explorer", icon: "🤔", description: "Ask 5 questions in chat", earned: true, earnedAt: "2024-02-05" },
            { id: "bookworm", name: "Bookworm", icon: "📚", description: "Complete 10 chapters", earned: true, earnedAt: "2024-02-10" },
            { id: "streak_star", name: "Streak Star", icon: "🔥", description: "Maintain a 7-day login streak", earned: true, earnedAt: "2024-02-15" },
            { id: "quiz_champion", name: "Quiz Champion", icon: "🏆", description: "Pass 5 quizzes", earned: false },
            { id: "knowledge_seeker", name: "Knowledge Seeker", icon: "🌟", description: "Earn 1000 XP", earned: true, earnedAt: "2024-02-12" },
        ];

        const mockSubjectProgress: SubjectProgress[] = [
            { subject: "Science", chaptersTotal: 15, chaptersCompleted: 8, progress: 53 },
            { subject: "Mathematics", chaptersTotal: 12, chaptersCompleted: 5, progress: 42 },
            { subject: "English", chaptersTotal: 10, chaptersCompleted: 7, progress: 70 },
            { subject: "History", chaptersTotal: 8, chaptersCompleted: 2, progress: 25 },
        ];

        const mockQuizHistory: QuizResult[] = [
            { id: "quiz-1", quizTitle: "Chapter 1 Quiz - Science", subject: "Science", score: 8, maxScore: 10, percentage: 80, passed: true, date: "2024-02-10" },
            { id: "quiz-2", quizTitle: "Chapter 2 Quiz - Science", subject: "Science", score: 7, maxScore: 10, percentage: 70, passed: true, date: "2024-02-12" },
            { id: "quiz-3", quizTitle: "Chapter 1 Quiz - Math", subject: "Mathematics", score: 5, maxScore: 10, percentage: 50, passed: false, date: "2024-02-08" },
            { id: "quiz-4", quizTitle: "Chapter 3 Quiz - Science", subject: "Science", score: 9, maxScore: 10, percentage: 90, passed: true, date: "2024-02-14" },
            { id: "quiz-5", quizTitle: "Chapter 2 Quiz - Math", subject: "Mathematics", score: 8, maxScore: 10, percentage: 80, passed: true, date: "2024-02-15" },
            { id: "quiz-6", quizTitle: "Chapter 4 Quiz - Science", subject: "Science", score: 10, maxScore: 10, percentage: 100, passed: true, date: "2024-02-18" },
        ];

        const mockActivity: Activity[] = [
            { id: "1", type: "chapter", title: "Completed: chapter 4 quiz", timestamp: "2 hours ago", details: "Score: 100%" },
            { id: "2", type: "quiz", title: "Passed Chapter 4 Quiz - Science", timestamp: "2 hours ago", details: "Score: 10/10" },
            { id: "3", type: "chapter", title: "Completed Chapter 3", timestamp: "1 day ago", details: "Progress: 100%" },
            { id: "4", type: "login", title: "Daily Login Streak", timestamp: "2 days ago", details: "Streak: 7 days" },
            { id: "5", type: "quiz", title: "Completed Chapter 2 Quiz", timestamp: "3 days ago", details: "Score: 7/10" },
        ];

        setUserProgress(progressData);
        setBadges(mockBadges);
        setSubjectProgress(mockSubjectProgress);
        setQuizHistory(mockQuizHistory);
        setRecentActivity(mockActivity);
        setLoading(false);
    };

    useEffect(() => {
        fetchProgressData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const XP_FOR_NEXT_LEVEL = (userProgress!.level + 1) * (userProgress!.level + 1) * 100 - userProgress!.totalXp;

    const getBadgeProgress = (badgeId: string) => {
        const badge = badges.find((b) => b.id === badgeId);
        if (!badge || badge.earned) return 100;
        return 0;
    };

    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-outfit text-foreground">Your Progress Report</h1>
                    <p className="text-muted-foreground mt-1">
                        Track your learning journey and achievements.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/profile">Back to Profile</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/dashboard">Continue Learning</Link>
                    </Button>
                </div>
            </div>

            {/* XP and Level */}
            <div className="mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
                                    <Zap className="text-primary" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Current Level</div>
                                    <div className="text-3xl font-bold text-foreground">Level {userProgress!.level}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground">Total XP</div>
                                <div className="text-3xl font-bold text-primary">{userProgress!.totalXp} XP</div>
                            </div>
                        </div>

                        {/* XP Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Progress to Level {userProgress!.level + 1}</span>
                                <span className="text-primary font-medium">
                                    {userProgress!.totalXp.toLocaleString()} / {XP_FOR_NEXT_LEVEL.toLocaleString()} XP
                                </span>
                            </div>
                            <div className="h-4 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-1000"
                                    style={{
                                        width: `${Math.min(100, (userProgress!.totalXp / XP_FOR_NEXT_LEVEL) * 100)}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                            <div className="text-center p-3 bg-muted/30 rounded-xl">
                                <div className="text-2xl font-bold text-secondary">{userProgress!.chaptersCompleted}</div>
                                <div className="text-xs text-muted-foreground">Chapters Completed</div>
                            </div>
                            <div className="text-center p-3 bg-muted/30 rounded-xl">
                                <div className="text-2xl font-bold text-accent">{userProgress!.streak}</div>
                                <div className="text-xs text-muted-foreground">Day Streak</div>
                            </div>
                            <div className="text-center p-3 bg-muted/30 rounded-xl">
                                <div className="text-2xl font-bold text-primary">{userProgress!.quizzesTaken}</div>
                                <div className="text-xs text-muted-foreground">Quizzes Taken</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Badges */}
            <div className="mb-8">
                <h2 className="text-xl font-bold font-outfit mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Badge Showcase
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {badges.map((badge) => (
                        <Card key={badge.id} className={`relative ${badge.earned ? "bg-primary/5 border-primary/20" : "opacity-60"}`}>
                            <CardContent className="pt-6">
                                <div className="w-12 h-12 rounded-full bg-white dark:bg-background border-2 border-border flex items-center justify-center text-2xl mb-3 shadow-sm">
                                    {badge.icon}
                                </div>
                                <div className="font-bold text-foreground mb-1">{badge.name}</div>
                                <div className="text-xs text-muted-foreground mb-2">{badge.description}</div>
                                {badge.earnedAt && (
                                    <div className="text-xs text-primary font-medium">
                                        Earned: {badge.earnedAt}
                                    </div>
                                )}
                                {!badge.earned && badge.earnedAt === undefined && (
                                    <div className="text-xs text-muted-foreground italic">
                                        In progress...
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Subject Progress */}
            <div className="mb-8">
                <h2 className="text-xl font-bold font-outfit mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Subject Progress
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subjectProgress.map((subj) => (
                        <Card key={subj.subject}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-bold text-foreground">{subj.subject}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {subj.chaptersCompleted}/{subj.chaptersTotal} chapters
                                    </div>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-secondary rounded-full"
                                        style={{ width: `${subj.progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs mt-2 text-muted-foreground">
                                    <span>Started</span>
                                    <span>{subj.progress}% complete</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Quiz History */}
            <div className="mb-8">
                <h2 className="text-xl font-bold font-outfit mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Quiz History
                </h2>
                <div className="space-y-3">
                    {quizHistory.map((quiz) => (
                        <Card key={quiz.id}>
                            <CardContent className="pt-4 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${quiz.passed ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                                            {quiz.passed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground">{quiz.quizTitle}</div>
                                            <div className="text-xs text-muted-foreground">{quiz.date}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bold ${quiz.percentage >= 80 ? "text-primary" : quiz.percentage >= 60 ? "text-secondary" : "text-destructive"}`}>
                                            {quiz.score}/{quiz.maxScore} ({quiz.percentage}%)
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {quiz.passed ? "Passed" : "Needs Improvement"}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="mb-8">
                <h2 className="text-xl font-bold font-outfit mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Recent Activity
                </h2>
                <div className="space-y-0">
                    {recentActivity.map((activity, idx) => (
                        <div key={activity.id} className={`flex items-start gap-4 py-3 ${idx !== recentActivity.length - 1 ? "border-b border-border" : ""}`}>
                            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${activity.type === "chapter" ? "bg-primary" : activity.type === "quiz" ? "bg-accent" : "bg-secondary"}`} />
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="font-medium text-foreground">{activity.title}</div>
                                    <div className="text-xs text-muted-foreground">{activity.timestamp}</div>
                                </div>
                                <div className="text-sm text-muted-foreground">{activity.details}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Overall Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Chapters Completed</span>
                                <span className="font-medium">{userProgress!.chaptersCompleted}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Chapters In Progress</span>
                                <span className="font-medium">{userProgress!.chaptersInprogress}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Quizzes Passed</span>
                                <span className="font-medium">{quizHistory.filter((q) => q.passed).length}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Next Goals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="p-3 bg-primary/5 rounded-xl flex items-center justify-between">
                                <div className="text-sm text-foreground">
                                    Complete next chapter in Science
                                </div>
                                <ChevronRight className="w-4 h-4 text-primary" />
                            </div>
                            <div className="p-3 bg-accent/5 rounded-xl flex items-center justify-between">
                                <div className="text-sm text-foreground">
                                    Pass 5 quizzes for Quiz Champion badge
                                </div>
                                <div className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full">
                                    {quizHistory.filter((q) => q.passed).length}/5
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
