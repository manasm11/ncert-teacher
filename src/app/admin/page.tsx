"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Users,
    BookOpen,
    MessageSquare,
    BarChart3,
    FileUp,
    ChevronUp,
    ChevronDown,
    Upload,
    PlusCircle,
    FileText,
    Activity,
    CheckCircle2,
    Clock,
    AlertCircle,
    Shield,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";

interface StatData {
    totalUsers: number;
    students: number;
    teachers: number;
    admins: number;
    publishedChapters: number;
    draftChapters: number;
    totalConversations: number;
    weeklyQuizAttempts: number;
}

interface ActivityItem {
    id: string;
    user: string;
    action: string;
    target: string;
    timestamp: string;
    type: "success" | "warning" | "info";
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<StatData>({
        totalUsers: 0,
        students: 0,
        teachers: 0,
        admins: 0,
        publishedChapters: 0,
        draftChapters: 0,
        totalConversations: 0,
        weeklyQuizAttempts: 0,
    });
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate fetching data
        // In a real app, this would fetch from actual API endpoints
        const mockData: StatData = {
            totalUsers: 1542,
            students: 1280,
            teachers: 200,
            admins: 62,
            publishedChapters: 156,
            draftChapters: 24,
            totalConversations: 8942,
            weeklyQuizAttempts: 2341,
        };

        const mockActivity: ActivityItem[] = [
            { id: "1", user: "John Doe", action: "uploaded PDF", target: "Maths - Chapter 5", timestamp: "2 min ago", type: "success" },
            { id: "2", user: "Jane Smith", action: "created chapter", target: "Science - Photosynthesis", timestamp: "15 min ago", type: "success" },
            { id: "3", user: "system", action: "new user registered", target: "Student Account", timestamp: "1 hour ago", type: "info" },
            { id: "4", user: "Admin User", action: "updated settings", target: "General Config", timestamp: "2 hours ago", type: "info" },
            { id: "5", user: "Michael Brown", action: "quiz completed", target: "History - Independence", timestamp: "3 hours ago", type: "success" },
            { id: "6", user: "Sarah Wilson", action: "uploaded PDF", target: "Economics - Intro", timestamp: "5 hours ago", type: "warning" },
        ];

        // Simulate network delay
        setTimeout(() => {
            setStats(mockData);
            setActivity(mockActivity);
            setLoading(false);
        }, 500);
    }, []);

    const handleUploadPDF = () => {
        console.log("Upload PDF clicked");
    };

    const handleAddChapter = () => {
        console.log("Add Chapter clicked");
    };

    const handleViewReports = () => {
        console.log("View Reports clicked");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-outfit text-foreground">Admin Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Welcome back, Administrator! Here&apos;s what&apos;s happening today.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">System Operational</span>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={handleUploadPDF} variant="default" className="h-24 text-lg shadow-playful bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-none">
                    <Upload className="w-6 h-6" />
                    <div className="flex flex-col items-start">
                        <span className="font-bold">Upload PDF</span>
                        <span className="text-xs opacity-90">Add new content</span>
                    </div>
                </Button>
                <Button onClick={handleAddChapter} variant="default" className="h-24 text-lg shadow-playful bg-gradient-to-r from-primary to-green-600 hover:from-primary hover:to-green-700 border-none">
                    <PlusCircle className="w-6 h-6" />
                    <div className="flex flex-col items-start">
                        <span className="font-bold">Add Chapter</span>
                        <span className="text-xs opacity-90">Create new content</span>
                    </div>
                </Button>
                <Button onClick={handleViewReports} variant="default" className="h-24 text-lg shadow-playful bg-gradient-to-r from-secondary to-blue-600 hover:from-secondary hover:to-blue-700 border-none">
                    <FileText className="w-6 h-6" />
                    <div className="flex flex-col items-start">
                        <span className="font-bold">View Reports</span>
                        <span className="text-xs opacity-90">Analytics & insights</span>
                    </div>
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    variant="admin"
                    icon={<Users className="w-6 h-6" />}
                    label="Total Users"
                    value={stats.totalUsers.toLocaleString()}
                    trend={{ value: "12%", isPositive: true }}
                    description="All time registered users"
                />
                <StatCard
                    variant="primary"
                    icon={<BookOpen className="w-6 h-6" />}
                    label="Published Chapters"
                    value={stats.publishedChapters}
                    trend={{ value: "5%", isPositive: true }}
                    description="Available for learning"
                />
                <StatCard
                    variant="warning"
                    icon={<Clock className="w-6 h-6" />}
                    label="Draft Chapters"
                    value={stats.draftChapters}
                    description="In progress content"
                />
                <StatCard
                    variant="secondary"
                    icon={<BarChart3 className="w-6 h-6" />}
                    label="Quiz Attempts"
                    value={stats.weeklyQuizAttempts.toLocaleString()}
                    trend={{ value: "8%", isPositive: true }}
                    description="This week's activity"
                />
            </div>

            {/* User Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    variant="default"
                    icon={<Users className="w-5 h-5 text-blue-500" />}
                    label="Students"
                    value={stats.students.toLocaleString()}
                    description="Active learners"
                />
                <StatCard
                    variant="default"
                    icon={<BookOpen className="w-5 h-5 text-purple-500" />}
                    label="Teachers"
                    value={stats.teachers.toLocaleString()}
                    description="Content creators"
                />
                <StatCard
                    variant="default"
                    icon={<Shield className="w-5 h-5 text-red-500" />}
                    label="Admins"
                    value={stats.admins.toLocaleString()}
                    description="System administrators"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2">
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-muted-foreground" />
                                <h2 className="font-outfit font-semibold text-foreground">Recent Activity</h2>
                            </div>
                            <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                                Last 24 hours
                            </span>
                        </div>

                        <div className="divide-y divide-border">
                            {activity.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="px-6 py-4 hover:bg-muted/20 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`
                                            flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                                            ${item.type === "success" ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
                                                item.type === "warning" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                                                "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"}
                                        `}>
                                            {item.type === "success" ? <CheckCircle2 className="w-4 h-4" /> :
                                                item.type === "warning" ? <AlertCircle className="w-4 h-4" /> :
                                                <Activity className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="font-medium text-foreground">
                                                    {item.user} <span className="text-muted-foreground">-</span> {item.action}
                                                </p>
                                                <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {item.target}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="px-6 py-4 border-t border-border bg-muted/20">
                            <Button variant="ghost" className="w-full text-sm">
                                View All Activity
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Summary */}
                <div className="space-y-6">
                    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                        <h3 className="font-outfit font-semibold text-foreground mb-4 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            Conversations
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Today</p>
                                    <p className="text-2xl font-bold text-primary">{stats.totalConversations.toLocaleString()}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                                        <ChevronUp className="w-3 h-3" /> 15%
                                    </div>
                                    <span className="text-xs text-muted-foreground">vs yesterday</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/5">
                                <div>
                                    <p className="text-sm text-muted-foreground">Avg Session</p>
                                    <p className="text-2xl font-bold text-secondary">8.4 min</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                                        <ChevronUp className="w-3 h-3" /> 2%
                                    </div>
                                    <span className="text-xs text-muted-foreground">vs yesterday</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                        <h3 className="font-outfit font-semibold text-foreground mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-red-500" />
                            Content Status
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-muted-foreground">Published</span>
                                    <span className="text-sm font-medium">{stats.publishedChapters}</span>
                                </div>
                                <div className="h-2 bg-border rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${(stats.publishedChapters / (stats.publishedChapters + stats.draftChapters)) * 100}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-muted-foreground">Drafts</span>
                                    <span className="text-sm font-medium">{stats.draftChapters}</span>
                                </div>
                                <div className="h-2 bg-border rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(stats.draftChapters / (stats.publishedChapters + stats.draftChapters)) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button variant="outline" className="w-full border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400">
                        Download Full Report
                    </Button>
                </div>
            </div>
        </div>
    );
}
