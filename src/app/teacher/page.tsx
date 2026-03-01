"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { Users, BookOpen, Trophy, TrendingUp, Plus, MoreHorizontal } from "lucide-react";
import Link from "next/link";

interface TeacherStats {
    totalStudents: number;
    totalClasses: number;
    averageProgress: number;
    activeStudents: number;
}

interface RecentActivity {
    id: string;
    studentName: string;
    action: string;
    chapter: string;
    timestamp: string;
}

export default function TeacherDashboard() {
    const [stats, setStats] = useState<TeacherStats | null>(null);
    const [activities, setActivities] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        const supabase = createClient();

        // Get total students
        const { count: studentCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "student");

        // Get total classes
        const { count: classCount } = await supabase
            .from("classrooms")
            .select("*", { count: "exact", head: true });

        // Get average progress
        const { data: progressData } = await supabase
            .from("user_progress")
            .select("progress");

        const avgProgress = progressData?.length
            ? Math.round(progressData.reduce((sum, p) => sum + (p.progress || 0), 0) / progressData.length)
            : 0;

        // Get active students (those who logged in this week)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { count: activeCount } = await supabase
            .from("user_streaks")
            .select("*", { count: "exact", head: true })
            .gte("last_login_date", oneWeekAgo.toISOString());

        setStats({
            totalStudents: studentCount || 0,
            totalClasses: classCount || 0,
            averageProgress: avgProgress,
            activeStudents: activeCount || 0,
        });

        // Get recent activities
        const { data: recentActivities } = await supabase
            .from("user_progress")
            .select(`
                progress,
                last_accessed,
                profiles (
                    display_name
                ),
                chapters (
                    title
                )
            `)
            .order("last_accessed", { ascending: false })
            .limit(5);

        setActivities(
            (recentActivities || []).map((a) => ({
                id: a.progress?.id || "unknown",
                studentName: a.profiles?.display_name || "Unknown",
                action: "Completed chapter",
                chapter: a.chapters?.title || "Unknown chapter",
                timestamp: a.last_accessed || "",
            }))
        );

        setLoading(false);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetching sets state after await
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-outfit text-foreground">
                        Teacher Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Track your students&apos; progress and manage your classroom.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/teacher/classrooms">
                            <BookOpen className="mr-2 w-4 h-4" />
                            Manage Classes
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/teacher/classrooms/new">
                            <Plus className="mr-2 w-4 h-4" />
                            Create Class
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Total Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground">{stats?.totalStudents || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Students enrolled</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Active Classes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">{stats?.totalClasses || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Active classrooms</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Avg Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-secondary">{stats?.averageProgress || 0}%</div>
                        <p className="text-xs text-muted-foreground mt-1">Average completion</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Active This Week</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-accent">{stats?.activeStudents || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Students online</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-primary" />
                            Top Performing Students
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[1, 2, 3].map((rank) => (
                                <div key={rank} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                        rank === 1 ? "bg-yellow-100 text-yellow-600" :
                                        rank === 2 ? "bg-gray-100 text-gray-600" :
                                        "bg-orange-100 text-orange-600"
                                    }`}>
                                        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-foreground">
                                            {rank === 1 ? "Alex Johnson" : rank === 2 ? "Maria Garcia" : "Sam Chen"}
                                        </div>
                                        <div className="text-xs text-muted-foreground">3500 XP • Level 5</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-primary">3500 XP</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {activities.length > 0 ? (
                                activities.map((activity, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <BookOpen className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-foreground">
                                                {activity.studentName} {activity.action}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                &quot;{activity.chapter}&quot;
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(activity.timestamp).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No recent activity
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
                        <Users className="w-10 h-10 text-primary/20" />
                        <div>
                            <h3 className="font-bold text-foreground">View Students</h3>
                            <p className="text-xs text-muted-foreground mt-1">See all enrolled students</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/teacher/classrooms">Go to Classes</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
                        <Trophy className="w-10 h-10 text-accent/20" />
                        <div>
                            <h3 className="font-bold text-foreground">View Leaderboard</h3>
                            <p className="text-xs text-muted-foreground mt-1">Check top performers</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/leaderboard">View Leaderboard</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
                        <BookOpen className="w-10 h-10 text-secondary/20" />
                        <div>
                            <h3 className="font-bold text-foreground">Assign Content</h3>
                            <p className="text-xs text-muted-foreground mt-1">Add new chapters</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/admin/pdfs">Manage Content</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
