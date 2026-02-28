"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton, AdminTableSkeleton } from "@/components/ui/skeleton";
import {
    Plus,
    Search,
    Edit,
    Trash2,
    GraduationCap,
    BookOpen,
    Filter,
    ChevronDown,
    Eye,
    EyeOff,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import Link from "next/link";

interface Chapter {
    id: string;
    subject_id: string;
    grade: number;
    chapter_number: number;
    title: string;
    slug: string;
    description: string | null;
    status: "draft" | "published";
    pdf_reference: string | null;
    created_at: string;
    subjects?: {
        name: string;
        slug: string;
    };
}

const GRADES = [6, 7, 8, 9, 10, 11, 12];

export default function AdminChaptersPage() {
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [subjects, setSubjects] = useState<{ id: string; name: string; slug: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [gradeFilter, setGradeFilter] = useState<number | null>(null);
    const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [selectedChapters, setSelectedChapters] = useState<string[]>([]);

    useEffect(() => {
        fetchChapters();
        fetchSubjects();
    }, []);

    async function fetchChapters() {
        setLoading(true);
        const supabase = createClient();

        const { data, error } = await supabase
            .from("chapters")
            .select(`
                id,
                subject_id,
                grade,
                chapter_number,
                title,
                slug,
                description,
                status,
                pdf_reference,
                created_at,
                subjects ( name, slug )
            `)
            .order("grade", { ascending: true })
            .order("chapter_number", { ascending: true });

        if (error) {
            console.error("Error fetching chapters:", error);
            toast({
                title: "Error",
                description: "Failed to load chapters",
                variant: "destructive",
            });
        } else {
            setChapters(data || []);
        }
        setLoading(false);
    }

    async function fetchSubjects() {
        const supabase = createClient();

        const { data, error } = await supabase
            .from("subjects")
            .select("id, name, slug")
            .order("name", { ascending: true });

        if (error) {
            console.error("Error fetching subjects:", error);
        } else {
            setSubjects(data || []);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this chapter?")) {
            return;
        }

        setDeletingId(id);
        const supabase = createClient();

        const { error } = await supabase.from("chapters").delete().eq("id", id);

        if (error) {
            console.error("Error deleting chapter:", error);
            toast({
                title: "Error",
                description: "Failed to delete chapter",
                variant: "destructive",
            });
        } else {
            setChapters((prev) => prev.filter((c) => c.id !== id));
            setSelectedChapters((prev) => prev.filter((c) => c !== id));
            toast({
                title: "Success",
                description: "Chapter deleted successfully",
            });
        }
        setDeletingId(null);
    }

    async function handleBulkStatus(status: "draft" | "published") {
        if (selectedChapters.length === 0) {
            toast({
                title: "No chapters selected",
                description: "Please select chapters to update their status",
                variant: "destructive",
            });
            return;
        }

        if (!confirm(`Are you sure you want to ${status === "draft" ? "unpublish" : "publish"} ${selectedChapters.length} chapter(s)?`)) {
            return;
        }

        setBulkActionLoading(true);

        try {
            const response = await fetch("/api/admin/chapters/bulk-status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chapterIds: selectedChapters,
                    status,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update chapter status");
            }

            setChapters((prev) =>
                prev.map((c) =>
                    selectedChapters.includes(c.id) ? { ...c, status } : c
                )
            );
            setSelectedChapters([]);

            toast({
                title: "Success",
                description: `Successfully ${status === "draft" ? "unpublished" : "published"} ${selectedChapters.length} chapter(s)`,
            });
        } catch (error) {
            console.error("Error updating chapter status:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update chapter status",
                variant: "destructive",
            });
        } finally {
            setBulkActionLoading(false);
        }
    }

    const filteredChapters = useMemo(() => {
        return chapters.filter((chapter) => {
            // Search filter
            const matchesSearch =
                chapter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (chapter.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

            // Grade filter
            const matchesGrade = gradeFilter === null || chapter.grade === gradeFilter;

            // Subject filter
            const matchesSubject =
                subjectFilter === null || chapter.subject_id === subjectFilter;

            return matchesSearch && matchesGrade && matchesSubject;
        });
    }, [chapters, searchTerm, gradeFilter, subjectFilter]);

    const getSubjectName = (subjectId: string) => {
        const subject = subjects.find((s) => s.id === subjectId);
        return subject ? subject.name : "Unknown Subject";
    };

    const getSubjectSlug = (subjectId: string) => {
        const subject = subjects.find((s) => s.id === subjectId);
        return subject ? subject.slug : "unknown";
    };

    const toggleChapterSelection = (id: string) => {
        setSelectedChapters((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        );
    };

    const toggleAllSelection = () => {
        if (selectedChapters.length === filteredChapters.length) {
            setSelectedChapters([]);
        } else {
            setSelectedChapters(filteredChapters.map((c) => c.id));
        }
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-6 py-12">
                <div className="flex items-center gap-3 mb-8">
                    <Skeleton variant="rectangle" size="default" width="32px" height="32px" borderRadius="8px" />
                    <Skeleton variant="text" size="lg" width="200px" />
                </div>
                <AdminTableSkeleton rows={5} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <BookOpen className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-outfit text-3xl font-bold text-foreground">
                            Chapter Management
                        </h1>
                        <p className="text-muted-foreground">
                            Manage NCERT chapters for different subjects and grades
                        </p>
                    </div>
                </div>
                <Button asChild variant="default">
                    <Link href="/admin/chapters/new">
                        <Plus className="w-4 h-4" />
                        Add Chapter
                    </Link>
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {/* Search and Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search chapters..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="relative flex-1 md:flex-none">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <select
                                    value={gradeFilter ?? ""}
                                    onChange={(e) =>
                                        setGradeFilter(
                                            e.target.value ? Number(e.target.value) : null
                                        )
                                    }
                                    className="w-full md:w-[160px] h-12 pl-10 pr-10 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                                >
                                    <option value="">All Grades</option>
                                    {GRADES.map((grade) => (
                                        <option key={grade} value={grade}>
                                            Grade {grade}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                            <div className="relative flex-1 md:flex-none">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <select
                                    value={subjectFilter ?? ""}
                                    onChange={(e) =>
                                        setSubjectFilter(
                                            e.target.value || null
                                        )
                                    }
                                    className="w-full md:w-[160px] h-12 pl-10 pr-10 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                                >
                                    <option value="">All Subjects</option>
                                    {subjects.map((subject) => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedChapters.length > 0 && (
                        <div className="flex items-center justify-between gap-3 mb-4 p-3 bg-primary/5 rounded-xl border border-primary/20">
                            <span className="text-sm text-foreground">
                                {selectedChapters.length} chapter(s) selected
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkStatus("published")}
                                    disabled={bulkActionLoading}
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Publish
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkStatus("draft")}
                                    disabled={bulkActionLoading}
                                >
                                    <EyeOff className="w-4 h-4 mr-2" />
                                    Unpublish
                                </Button>
                            </div>
                        </div>
                    )}

                    {filteredChapters.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="mx-auto w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-outfit text-lg font-semibold text-foreground mb-2">
                                No chapters found
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                {searchTerm
                                    ? "Try adjusting your search or filters"
                                    : "Get started by adding your first chapter"}
                            </p>
                            {searchTerm && (
                                <Button variant="outline" onClick={() => setSearchTerm("")}>
                                    Clear Search
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="bg-card rounded-xl border border-border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/30">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedChapters.length === filteredChapters.length && filteredChapters.length > 0}
                                                    onChange={toggleAllSelection}
                                                    className="rounded border-border bg-background text-primary focus:ring-primary"
                                                />
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Chapter
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Grade
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Subject
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredChapters.map((chapter) => (
                                            <tr
                                                key={chapter.id}
                                                className="group hover:bg-muted/10 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedChapters.includes(chapter.id)}
                                                        onChange={() => toggleChapterSelection(chapter.id)}
                                                        className="rounded border-border bg-background text-primary focus:ring-primary"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                                                            {chapter.chapter_number}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-foreground">
                                                                {chapter.title}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground font-mono">
                                                                {chapter.slug}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="secondary" className="text-xs">
                                                        Grade {chapter.grade}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-foreground">
                                                        {getSubjectName(chapter.subject_id)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge
                                                        variant={chapter.status === "published" ? "success" : "warning"}
                                                        className="text-xs"
                                                    >
                                                        {chapter.status.charAt(0).toUpperCase() + chapter.status.slice(1)}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Link href={`/admin/chapters/${chapter.id}/edit`}>
                                                                <Edit className="w-4 h-4" />
                                                                <span className="sr-only">Edit</span>
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDelete(chapter.id)}
                                                            disabled={deletingId === chapter.id}
                                                        >
                                                            {deletingId === chapter.id ? (
                                                                <span className="animate-spin">•</span>
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                            <span className="sr-only">Delete</span>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Showing {filteredChapters.length} of {chapters.length} chapter(s)
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
