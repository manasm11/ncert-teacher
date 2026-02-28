"use client";

import { useState, useEffect } from "react";
import { Book, BookOpen, CheckCircle2, Clock, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

interface Subject {
    id: string;
    name: string;
    grade: number;
    icon?: string;
}

interface Chapter {
    id: number;
    title: string;
    subject_id: string;
    grade: number;
    order: number;
    status: "completed" | "in-progress" | "locked";
    progress: number;
    stars: number;
}

interface UserProgress {
    chapter_id: number;
    status: "completed" | "in-progress" | "locked";
    progress: number;
    last_accessed: string;
}

export function getSubjects(grade: number): Promise<Subject[]> {
    const supabase = createClient();
    return supabase
        .from("subjects")
        .select("id, name, grade, icon")
        .eq("grade", grade)
        .order("name")
        .then((res) => (res.data || []) as Subject[]);
}

export function getChapters(subjectId: string, grade: number): Promise<Chapter[]> {
    const supabase = createClient();
    return supabase
        .from("chapters")
        .select("id, title, subject_id, grade, order, status, progress, stars")
        .eq("subject_id", subjectId)
        .eq("grade", grade)
        .order("order")
        .then((res) => (res.data || []) as Chapter[]);
}

export function getUserProgress(userId: string, chapterId?: number): Promise<UserProgress[]> {
    const supabase = createClient();
    let query = supabase
        .from("user_progress")
        .select("chapter_id, status, progress, last_accessed")
        .eq("user_id", userId);

    if (chapterId) {
        query = query.eq("chapter_id", chapterId);
    }

    return query.then((res) => (res.data || []) as UserProgress[]);
}

export default function Dashboard() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [userProgress, setUserProgress] = useState<Record<number, UserProgress>>({});
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [userGrade, setUserGrade] = useState<number | null>(null);

    useEffect(() => {
        const supabase = createClient();

        async function fetchData() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            // Get user profile to determine grade
            const { data: profile } = await supabase
                .from("profiles")
                .select("grade")
                .eq("id", user.id)
                .single();

            if (profile?.grade) {
                setUserGrade(profile.grade);
                const subjectsData = await getSubjects(profile.grade);
                setSubjects(subjectsData);

                if (subjectsData.length > 0) {
                    const firstSubject = subjectsData[0].id;
                    setSelectedSubject(firstSubject);
                    const chaptersData = await getChapters(firstSubject, profile.grade);
                    setChapters(chaptersData);
                }

                // Fetch user progress
                const progressData = await getUserProgress(user.id);
                const progressMap: Record<number, UserProgress> = {};
                progressData.forEach((p) => {
                    progressMap[p.chapter_id] = p;
                });
                setUserProgress(progressMap);
            }

            setLoading(false);
        }

        fetchData();
    }, []);

    const handleSubjectChange = async (subjectId: string) => {
        setSelectedSubject(subjectId);
        setLoading(true);

        if (userGrade) {
            const chaptersData = await getChapters(subjectId, userGrade);
            setChapters(chaptersData);

            // Update progress for new chapters
            const newProgress = await getUserProgress(
                (await (await createClient()).auth.getUser()).data.user!.id,
                undefined
            );
            const progressMap: Record<number, UserProgress> = {};
            newProgress.forEach((p) => {
                progressMap[p.chapter_id] = p;
            });
            setUserProgress(progressMap);
        }

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!userGrade) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Please update your profile with a grade</p>
            </div>
        );
    }

    const selectedChapters = chapters.filter(
        (c) => !selectedSubject || c.subject_id === selectedSubject
    );

    // Map chapters with user progress
    const mappedChapters = selectedChapters.map((chapter) => {
        const progress = userProgress[chapter.id];
        return {
            ...chapter,
            status: progress?.status || "locked",
            progress: progress?.progress || 0,
        };
    });

    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-outfit text-foreground">
                        Welcome back, Explorer!
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Class {userGrade} • Ready to continue your journey?
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-border shadow-sm">
                    <Star className="w-5 h-5 text-accent fill-accent" />
                    <span className="font-bold text-foreground">
                        {Object.values(userProgress).reduce(
                            (sum, p) => sum + (p.status === "completed" ? 3 : p.status === "in-progress" ? 1 : 0),
                            0
                        )}{" "}
                        Mastery Stars
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Sidebar: Subjects list */}
                <div className="md:col-span-1 space-y-4">
                    <h2 className="text-lg font-bold font-outfit mb-4">Your Subjects</h2>
                    {subjects.map((sub, idx) => (
                        <button
                            key={sub.id}
                            onClick={() => handleSubjectChange(sub.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                                selectedSubject === sub.id
                                    ? "bg-white shadow-md border-primary/20 ring-2 ring-primary/10"
                                    : "hover:bg-white/60 border-transparent"
                            }`}
                        >
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                                    sub.icon || "bg-primary/20 text-primary border-primary/30"
                                }`}
                            >
                                {sub.icon || sub.name.charAt(0)}
                            </div>
                            <span className="font-medium text-foreground">{sub.name}</span>
                        </button>
                    ))}
                </div>

                {/* Main Area: The Learning Map */}
                <div className="md:col-span-3 bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-6 md:p-10 shadow-sm relative">
                    <h2 className="text-2xl font-bold font-outfit mb-2">
                        {subjects.find((s) => s.id === selectedSubject)?.name || "Learning Map"}
                    </h2>
                    <p className="text-muted-foreground mb-8 text-sm">
                        Follow the path to master Class {userGrade}{" "}
                        {subjects.find((s) => s.id === selectedSubject)?.name}.
                    </p>

                    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-primary before:via-border before:to-transparent">
                        {mappedChapters.map((chapter, idx) => (
                            <div
                                key={chapter.id}
                                className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${
                                    chapter.status === "locked" ? "opacity-60" : ""
                                }`}
                            >
                                {/* Connector Nodes */}
                                <div
                                    className={`flex items-center justify-center w-12 h-12 rounded-full border-4 shadow-sm z-10 shrink-0 md:mx-auto absolute left-0 md:static ${
                                        chapter.status === "completed"
                                            ? "bg-primary border-primary text-white"
                                            : chapter.status === "in-progress"
                                              ? "bg-white border-primary text-primary"
                                              : "bg-muted border-muted-foreground/30 text-muted-foreground"
                                    }`}
                                >
                                    {chapter.status === "completed" ? (
                                        <CheckCircle2 className="w-6 h-6" />
                                    ) : chapter.status === "in-progress" ? (
                                        <Clock className="w-5 h-5 animate-pulse" />
                                    ) : (
                                        <CheckCircle2 className="w-5 h-5 opacity-30" />
                                    )}
                                </div>

                                {/* Chapter Card */}
                                <div
                                    className={`w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-5 rounded-2xl border transition-all ml-auto md:ml-0 ${
                                        chapter.status === "in-progress"
                                            ? "bg-white shadow-playful border-primary/20 hover:scale-[1.02] cursor-pointer"
                                            : chapter.status === "completed"
                                              ? "bg-primary/5 border-primary/20 hover:bg-primary/10 cursor-pointer"
                                              : "bg-muted/30 border-transparent"
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            Chapter {chapter.order}
                                        </span>
                                        {chapter.status === "completed" && (
                                            <div className="flex gap-0.5">
                                                {[...Array(3)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-3.5 h-3.5 ${
                                                            i < chapter.stars
                                                                ? "fill-accent text-accent"
                                                                : "text-muted-foreground/30"
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-foreground font-outfit">
                                        {chapter.title}
                                    </h3>

                                    {chapter.status === "in-progress" && (
                                        <Link
                                            href={`/learn/${chapter.id}`}
                                            className="mt-4 inline-flex items-center justify-center w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-xl transition-colors text-sm"
                                        >
                                            Continue Journey
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
