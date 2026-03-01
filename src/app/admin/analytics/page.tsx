"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, MessageSquare, BookOpen, Target, TrendingUp } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface AnalyticsData {
    activeUsers: number;
    totalMessages: number;
    popularChapters: Array<{ chapter_id: string; chapter_title: string; interaction_count: number }>;
    averageQuizScore: number;
    intentDistribution: Array<{ intent: string; count: number; percentage: number }>;
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalytics() {
            const supabase = createClient();

            // Fetch analytics data
            const [usersRes, messagesRes, chaptersRes, quizRes, intentsRes] = await Promise.all([
                supabase.from("profiles").select("id", { count: "exact", head: true }),
                supabase.from("chat_messages").select("id", { count: "exact", head: true }),
                supabase.rpc("get_popular_chapters"),
                supabase.rpc("get_average_quiz_score"),
                supabase.rpc("get_intent_distribution"),
            ]);

            setData({
                activeUsers: usersRes.count || 0,
                totalMessages: messagesRes.count || 0,
                popularChapters: chaptersRes.data || [],
                averageQuizScore: quizRes.data?.[0]?.average_score || 0,
                intentDistribution: intentsRes.data || [],
            });

            setLoading(false);
        }

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Failed to load analytics data</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <Target className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="font-outfit text-3xl font-bold text-foreground">Analytics Dashboard</h1>
                        <p className="text-muted-foreground">
                            Track platform performance and student engagement
                        </p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => setLoading(true)}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="border-border shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Active Users</p>
                                <h3 className="text-3xl font-bold font-outfit text-foreground">{data.activeUsers}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-green-600 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            <span>Based on last 30 days</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Total Messages</p>
                                <h3 className="text-3xl font-bold font-outfit text-foreground">{data.totalMessages.toLocaleString()}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-green-600 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            <span>All time messages</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Avg Quiz Score</p>
                                <h3 className="text-3xl font-bold font-outfit text-foreground">
                                    {data.averageQuizScore ? `${data.averageQuizScore.toFixed(1)}%` : "N/A"}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                <Target className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-muted-foreground">
                            Across all completed quizzes
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Popular Chapters</p>
                                <h3 className="text-3xl font-bold font-outfit text-foreground">
                                    {data.popularChapters.length}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <BookOpen className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-muted-foreground">
                            Chapters with most interactions
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Popular Chapters */}
                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="font-outfit">Most Popular Chapters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.popularChapters.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                No chapter data available yet
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {data.popularChapters.slice(0, 5).map((chapter, idx) => (
                                    <div key={idx} className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground truncate">
                                                {chapter.chapter_title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {chapter.interaction_count} interactions
                                            </p>
                                        </div>
                                        <div className="w-24">
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full"
                                                    style={{
                                                        width: `${Math.min(
                                                            (chapter.interaction_count /
                                                                data.popularChapters[0].interaction_count) *
                                                                100,
                                                            100
                                                        )}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Router Intent Distribution */}
                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="font-outfit">Router Intent Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.intentDistribution.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                No intent data available yet
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {data.intentDistribution.slice(0, 5).map((intent, idx) => (
                                    <div key={idx}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-foreground capitalize">
                                                {intent.intent}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-muted-foreground">
                                                    {intent.count} ({intent.percentage.toFixed(1)}%)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${
                                                    intent.intent === "textbook"
                                                        ? "bg-primary"
                                                        : intent.intent === "web"
                                                          ? "bg-secondary"
                                                          : intent.intent === "reasoning"
                                                            ? "bg-accent"
                                                            : "bg-muted-foreground"
                                                }`}
                                                style={{ width: `${intent.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
