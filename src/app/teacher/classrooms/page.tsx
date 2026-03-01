"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { Users, Plus, MoreHorizontal, Calendar, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Classroom {
    id: string;
    name: string;
    grade: number;
    subject: string;
    studentCount: number;
    lastActive: string;
    inviteCode: string;
}

export default function ClassroomListPage() {
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchClassrooms = async () => {
        const supabase = createClient();

        // For now, return mock data since we don't have a classrooms table
        // In production, this would fetch from a classrooms table
        const mockClassrooms: Classroom[] = [
            {
                id: "class-1",
                name: "Grade 6 Science",
                grade: 6,
                subject: "Science",
                studentCount: 24,
                lastActive: "2024-02-25",
                inviteCode: "G6SCI24",
            },
            {
                id: "class-2",
                name: "Grade 7 Math",
                grade: 7,
                subject: "Mathematics",
                studentCount: 28,
                lastActive: "2024-02-24",
                inviteCode: "G7MATH24",
            },
            {
                id: "class-3",
                name: "Grade 6 English",
                grade: 6,
                subject: "English",
                studentCount: 22,
                lastActive: "2024-02-23",
                inviteCode: "G6ENG24",
            },
        ];

        setClassrooms(mockClassrooms);
        setLoading(false);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetching sets state after await
        fetchClassrooms();
    }, []);

    const filteredClassrooms = classrooms.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        My Classes
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your classrooms and track student progress.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/teacher/classrooms/new">
                        <Plus className="mr-2 w-4 h-4" />
                        Create New Class
                    </Link>
                </Button>
            </div>

            {/* Search */}
            <div className="mb-6 max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search classes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Classroom Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClassrooms.length > 0 ? (
                    filteredClassrooms.map((classroom) => (
                        <Card key={classroom.id} className="overflow-hidden">
                            <CardHeader className="pb-3 bg-primary/5 border-b">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{classroom.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-2 mt-1">
                                            <BookOpen className="w-3 h-3" />
                                            Grade {classroom.grade} • {classroom.subject}
                                        </CardDescription>
                                    </div>
                                    <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">
                                        {classroom.studentCount} students
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="flex items-center justify-between text-sm mb-4">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-3 h-3" />
                                        <span>Last active: {classroom.lastActive}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="p-3 bg-muted/30 rounded-lg">
                                        <div className="text-xs font-medium text-muted-foreground mb-1">Invite Code</div>
                                        <div className="flex items-center gap-2">
                                            <code className="bg-white dark:bg-background px-2 py-1 rounded text-sm font-mono">
                                                {classroom.inviteCode}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(classroom.inviteCode);
                                                }}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" className="w-full" asChild>
                                            <Link href={`/teacher/classrooms/${classroom.id}`}>
                                                View Class
                                            </Link>
                                        </Button>
                                        <Button variant="outline" className="w-full" asChild>
                                            <Link href={`/teacher/classrooms/${classroom.id}/students`}>
                                                Students
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        {searchTerm
                            ? `No classes found matching "${searchTerm}"`
                            : "You haven't created any classes yet. Create your first class to get started!"}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <h3 className="font-bold text-primary mb-2">How to Add Students</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold">1</div>
                        <div>
                            <div className="font-medium text-foreground">Share the invite code</div>
                            <p className="text-muted-foreground mt-1">Give the code to your students</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold">2</div>
                        <div>
                            <div className="font-medium text-foreground">Students join via profile</div>
                            <p className="text-muted-foreground mt-1">They enter the code in their profile settings</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold">3</div>
                        <div>
                            <div className="font-medium text-foreground">Track progress</div>
                            <p className="text-muted-foreground mt-1">Monitor their learning on this dashboard</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
