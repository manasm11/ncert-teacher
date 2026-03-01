"use client";

import { useState, useEffect } from "react";
import { Trophy, Award, TrendingUp, Users, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

interface LeaderboardEntry {
    rank: number;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    grade: number | null;
    totalXp: number;
    level: number;
    currentXp: number;
    xpToNextLevel: number;
    progressPercent: number;
}

interface Pagination {
    limit: number;
    offset: number;
    totalCount: number;
    totalPages: number;
    currentPage: number;
}

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [gradeFilter, setGradeFilter] = useState<string>("all");
    const [periodFilter, setPeriodFilter] = useState<string>("all_time");

    useEffect(() => {
        fetchLeaderboard();
    }, [gradeFilter, periodFilter]);

    const fetchLeaderboard = async () => {
        setLoading(true);

        const params = new URLSearchParams({
            limit: "50",
            offset: "0",
            ...(gradeFilter !== "all" && { grade: gradeFilter }),
            period: periodFilter,
        });

        try {
            const response = await fetch(`/api/leaderboard?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setLeaderboard(data.leaderboard);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Failed to fetch leaderboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return `#${rank}`;
    };

    const getRankColor = (rank: number) => {
        if (rank === 1) return "text-yellow-500";
        if (rank === 2) return "text-gray-400";
        if (rank === 3) return "text-orange-400";
        return "text-muted-foreground";
    };

    const gradeOptions = ["all", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold font-outfit mb-3">
                    <Trophy className="inline-block w-8 h-8 md:w-10 md:h-10 text-primary mr-3" />
                    Top Students
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Compete and climb the ranks! See who&apos;s leading the pack in the Gyanu AI learning journey.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Total Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{pagination?.totalCount || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Top Rank</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-500">🥇</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">XP Leader</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">
                            {leaderboard[0]?.totalXp || 0} XP
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Active Period</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-secondary">All Time</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-4 mb-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Filters</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="grade-filter" className="text-xs font-medium text-muted-foreground">
                                Grade
                            </Label>
                            <select
                                id="grade-filter"
                                value={gradeFilter}
                                onChange={(e) => setGradeFilter(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                {gradeOptions.map((g) => (
                                    <option key={g} value={g}>
                                        {g === "all" ? "All Grades" : `Class ${g}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Label htmlFor="period-filter" className="text-xs font-medium text-muted-foreground">
                                Period
                            </Label>
                            <select
                                id="period-filter"
                                value={periodFilter}
                                onChange={(e) => setPeriodFilter(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="all_time">All Time</option>
                                <option value="monthly">This Month</option>
                                <option value="weekly">This Week</option>
                                <option value="daily">Today</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Leaderboard List */}
            <Card className="overflow-hidden">
                <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5 text-primary" />
                        Top 50 Students
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border">
                        {leaderboard.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                No students yet. Be the first to start learning!
                            </div>
                        ) : (
                            leaderboard.map((entry) => (
                                <div
                                    key={entry.userId}
                                    className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg">
                                        {entry.rank <= 3 ? (
                                            <span className={getRankColor(entry.rank)}>{getRankBadge(entry.rank)}</span>
                                        ) : (
                                            <span className="text-muted-foreground font-medium">{entry.rank}</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg overflow-hidden">
                                            {entry.avatarUrl ? (
                                                <img
                                                    src={entry.avatarUrl}
                                                    alt={entry.displayName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-primary">👤</span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-foreground">{entry.displayName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Class {entry.grade || "?"} • Level {entry.level}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right hidden md:block w-32">
                                        <div className="font-bold text-primary">{entry.totalXp} XP</div>
                                        <div className="text-xs text-muted-foreground">
                                            {entry.progressPercent}% to level {entry.level + 1}
                                        </div>
                                    </div>

                                    <div className="w-24 hidden md:block">
                                        <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                                            <div
                                                className="h-full bg-primary rounded-full"
                                                style={{ width: `${entry.progressPercent}%` }}
                                            />
                                        </div>
                                        <div className="text-xs text-right text-muted-foreground">
                                            Level {entry.level}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Footer Actions */}
            <div className="mt-8 flex items-center justify-center gap-4">
                <Button variant="outline" onClick={fetchLeaderboard} disabled={loading}>
                    <TrendingUp className="mr-2 w-4 h-4" />
                    Refresh
                </Button>
                <Button asChild>
                    <Link href="/profile">
                        <Trophy className="mr-2 w-4 h-4" />
                        View Your Progress
                    </Link>
                </Button>
            </div>
        </div>
    );
}
