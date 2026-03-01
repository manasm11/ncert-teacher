"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { Users, TrendingUp, BookOpen, CheckCircle2, XCircle, Plus, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Student {
    id: string;
    name: string;
    avatarUrl: string | null;
    progress: number;
    xp: number;
    level: number;
    chaptersCompleted: number;
    lastActive: string;
}

interface ClassroomDetail {
    id: string;
    name: string;
    grade: number;
    subject: string;
    description: string;
    inviteCode: string;
}

export default function ClassroomDetailPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.id as string;

    const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClassroomData();
    }, [classId]);

    const fetchClassroomData = async () => {
        const supabase = createClient();
        setLoading(true);

        // Mock data since we don't have actual tables
        const mockClassroom: ClassroomDetail = {
            id: classId,
            name: "Grade 6 Science",
            grade: 6,
            subject: "Science",
            description: "Science concepts and experiments for Class 6",
            inviteCode: "G6SCI24",
        };

        const mockStudents: Student[] = [
            {
                id: "student-1",
                name: "Alex Johnson",
                avatarUrl: null,
                progress: 85,
                xp: 3500,
                level: 5,
                chaptersCompleted: 12,
                lastActive: "2024-02-25",
            },
            {
                id: "student-2",
                name: "Maria Garcia",
                avatarUrl: null,
                progress: 72,
                xp: 2800,
                level: 4,
                chaptersCompleted: 9,
                lastActive: "2024-02-24",
            },
            {
                id: "student-3",
                name: "Sam Chen",
                avatarUrl: null,
                progress: 90,
                xp: 3800,
                level: 5,
                chaptersCompleted: 14,
                lastActive: "2024-02-25",
            },
            {
                id: "student-4",
                name: "Emma Williams",
                avatarUrl: null,
                progress: 45,
                xp: 1500,
                level: 3,
                chaptersCompleted: 5,
                lastActive: "2024-02-20",
            },
            {
                id: "student-5",
                name: "Liam Brown",
                avatarUrl: null,
                progress: 60,
                xp: 2200,
                level: 4,
                chaptersCompleted: 7,
                lastActive: "2024-02-22",
            },
        ];

        setClassroom(mockClassroom);
        setStudents(mockStudents);
        setLoading(false);
    };

    const stats = {
        totalStudents: students.length,
        avgProgress: students.length
            ? Math.round(students.reduce((sum, s) => sum + s.progress, 0) / students.length)
            : 0,
        totalXP: students.reduce((sum, s) => sum + s.xp, 0),
        avgLevel: students.length
            ? Math.round(students.reduce((sum, s) => sum + s.level, 0) / students.length)
            : 0,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!classroom) {
        return <div className="p-8 text-center">Classroom not found</div>;
    }

    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Button variant="ghost" size="sm" asChild className="hover:bg-transparent hover:text-primary">
                            <Link href="/teacher/classrooms" className="flex items-center gap-1">
                                <span className="text-lg">←</span> Back to Classes
                            </Link>
                        </Button>
                    </div>
                    <h1 className="text-3xl font-bold font-outfit text-foreground">{classroom.name}</h1>
                    <p className="text-muted-foreground mt-1">
                        Grade {classroom.grade} • {classroom.subject}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/leaderboard">
                            <TrendingUp className="mr-2 w-4 h-4" />
                            View Leaderboard
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/teacher/classrooms/${classId}/students/add`}>
                            <Plus className="mr-2 w-4 h-4" />
                            Add Student
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Total Students</div>
                        <div className="text-2xl font-bold text-foreground">{stats.totalStudents}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Avg Progress</div>
                        <div className="text-2xl font-bold text-primary">{stats.avgProgress}%</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Total XP</div>
                        <div className="text-2xl font-bold text-secondary">{stats.totalXP.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Avg Level</div>
                        <div className="text-2xl font-bold text-accent">{stats.avgLevel}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Invite Code */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Class Invite Code</CardTitle>
                    <CardDescription>Share this code with students to invite them to your class</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3">
                        <code className="text-2xl font-mono font-bold bg-primary/10 text-primary px-6 py-3 rounded-xl">
                            {classroom.inviteCode}
                        </code>
                        <Button
                            onClick={() => {
                                navigator.clipboard.writeText(classroom.inviteCode);
                            }}
                        >
                            Copy Code
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Students List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Students</span>
                        <span className="text-sm text-muted-foreground">{students.length} enrolled</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border">
                        {students.length > 0 ? (
                            students.map((student) => (
                                <div key={student.id} className="p-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                                            {student.avatarUrl ? (
                                                <img
                                                    src={student.avatarUrl}
                                                    alt={student.name}
                                                    className="w-full h-full object-cover rounded-full"
                                                />
                                            ) : (
                                                <span className="text-primary">👤</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-foreground">{student.name}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <BookOpen className="w-3 h-3" />
                                                    {student.chaptersCompleted} chapters
                                                </span>
                                                <span>•</span>
                                                <span>Level {student.level}</span>
                                                <span>•</span>
                                                <span>Last active: {student.lastActive}</span>
                                            </div>
                                        </div>
                                        <div className="w-32 hidden md:block">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-muted-foreground">Progress</span>
                                                <span className="font-medium">{student.progress}%</span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full"
                                                    style={{ width: `${student.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="w-20 text-right hidden md:block">
                                            <div className="font-bold text-primary">{student.xp} XP</div>
                                        </div>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-muted-foreground">
                                No students enrolled in this class yet
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
