"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
    BookOpen,
    GraduationCap,
    ArrowLeft,
    Loader2,
    Trash2,
    Eye,
    EyeOff,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

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

export default function EditChapterPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [subjects, setSubjects] = useState<{ id: string; name: string; slug: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [subjectId, setSubjectId] = useState("");
    const [grade, setGrade] = useState(6);
    const [chapterNumber, setChapterNumber] = useState(1);
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<"draft" | "published">("draft");
    const [pdfReference, setPdfReference] = useState("");

    useEffect(() => {
        fetchChapter();
        fetchSubjects();
    }, [id]);

    async function fetchChapter() {
        setLoading(true);
        const supabase = createClient();

        const { data, error } = await supabase
            .from("chapters")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Error fetching chapter:", error);
            toast({
                title: "Error",
                description: "Failed to load chapter",
                variant: "destructive",
            });
        } else if (data) {
            setChapter(data);
            setSubjectId(data.subject_id);
            setGrade(data.grade);
            setChapterNumber(data.chapter_number);
            setTitle(data.title);
            setSlug(data.slug);
            setDescription(data.description ?? "");
            setStatus(data.status as "draft" | "published");
            setPdfReference(data.pdf_reference ?? "");
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

    // Auto-generate slug from title
    useEffect(() => {
        const generatedSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .trim()
            .substring(0, 100);
        setSlug(generatedSlug);
    }, [title]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!subjectId) {
            toast({
                title: "Error",
                description: "Please select a subject",
                variant: "destructive",
            });
            return;
        }

        if (!title.trim()) {
            toast({
                title: "Error",
                description: "Chapter title is required",
                variant: "destructive",
            });
            return;
        }

        if (chapterNumber < 1) {
            toast({
                title: "Error",
                description: "Chapter number must be at least 1",
                variant: "destructive",
            });
            return;
        }

        setUpdating(true);

        try {
            const response = await fetch(`/api/admin/chapters/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    subjectId,
                    grade,
                    chapterNumber,
                    title,
                    slug,
                    description,
                    status,
                    pdfReference: pdfReference || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update chapter");
            }

            toast({
                title: "Success",
                description: "Chapter updated successfully",
            });

            // Update local state
            if (chapter) {
                setChapter({
                    ...chapter,
                    subject_id: subjectId,
                    grade,
                    chapter_number: chapterNumber,
                    title,
                    slug: data.chapter?.slug || slug,
                    description,
                    status,
                    pdf_reference: pdfReference || null,
                });
            }
        } catch (error) {
            console.error("Error updating chapter:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update chapter",
                variant: "destructive",
            });
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this chapter?")) {
            return;
        }

        // Check if chapter has associated chunks
        if (chapter?.slug) {
            const confirmMsg = "This chapter has associated content chunks. Deleting will remove them. Continue?";
            if (!confirm(confirmMsg)) {
                return;
            }
        }

        setDeleting(true);

        try {
            const response = await fetch(`/api/admin/chapters/${id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to delete chapter");
            }

            toast({
                title: "Success",
                description: "Chapter deleted successfully",
            });

            router.push("/admin/chapters");
        } catch (error) {
            console.error("Error deleting chapter:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete chapter",
                variant: "destructive",
            });
        } finally {
            setDeleting(false);
        }
    };

    const getSubjectName = (subjectId: string) => {
        const subject = subjects.find((s) => s.id === subjectId);
        return subject ? subject.name : "Unknown Subject";
    };

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-12">
                <div className="flex items-center gap-3 mb-8">
                    <Skeleton variant="rectangle" size="default" width="32px" height="32px" borderRadius="8px" />
                    <Skeleton variant="text" size="lg" width="200px" />
                </div>
                <div className="space-y-4">
                    <Skeleton variant="rectangle" size="lg" width="100%" height="200px" borderRadius="16px" />
                </div>
            </div>
        );
    }

    if (!chapter) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-12 text-center">
                <div className="mx-auto w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-outfit text-lg font-semibold text-foreground mb-2">
                    Chapter not found
                </h3>
                <Button onClick={() => router.push("/admin/chapters")}>
                    Back to Chapters
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-6 py-12">
            <div className="flex items-center gap-3 mb-8">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="h-10 w-10 p-0 hover:bg-primary/10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="font-outfit text-3xl font-bold text-foreground">
                        Edit Chapter
                    </h1>
                    <p className="text-muted-foreground">
                        Modify {chapter.title} details
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Chapter Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdate} className="space-y-6">
                        {/* Subject Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="subject">
                                Subject <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <select
                                    id="subject"
                                    value={subjectId}
                                    onChange={(e) => setSubjectId(e.target.value)}
                                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                                >
                                    <option value="">Select a subject</option>
                                    {subjects.map((subject) => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Grade and Chapter Number */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="grade">
                                    Grade <span className="text-destructive">*</span>
                                </Label>
                                <select
                                    id="grade"
                                    value={grade}
                                    onChange={(e) => {
                                        setGrade(Number(e.target.value));
                                        setChapterNumber(1);
                                    }}
                                    className="w-full h-12 rounded-xl border border-border bg-background px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {GRADES.map((g) => (
                                        <option key={g} value={g}>
                                            Grade {g}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="chapterNumber">
                                    Chapter Number <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="chapterNumber"
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={chapterNumber}
                                    onChange={(e) => setChapterNumber(Number(e.target.value))}
                                    className="h-12"
                                />
                            </div>
                        </div>

                        {/* Chapter Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">
                                Chapter Title <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Real Numbers"
                                className="h-12"
                            />
                        </div>

                        {/* Slug */}
                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug (URL identifier)</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="slug"
                                    value={slug}
                                    readOnly
                                    className="font-mono h-12"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter a brief description of this chapter..."
                                className="w-full h-32 rounded-xl border border-border bg-transparent px-4 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring resize-none"
                            />
                        </div>

                        {/* PDF Reference */}
                        <div className="space-y-2">
                            <Label htmlFor="pdfReference">PDF Reference (optional)</Label>
                            <Input
                                id="pdfReference"
                                type="url"
                                value={pdfReference}
                                onChange={(e) => setPdfReference(e.target.value)}
                                placeholder="https://example.com/chapter.pdf"
                                className="h-12"
                            />
                        </div>

                        {/* Status Toggle */}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStatus("draft")}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all
                                        ${status === "draft"
                                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                                            : "border-border bg-background hover:border-primary/50"
                                        }
                                    `}
                                >
                                    <EyeOff className="w-4 h-4" />
                                    <span className="text-sm font-medium">Draft</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatus("published")}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all
                                        ${status === "published"
                                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                                            : "border-border bg-background hover:border-primary/50"
                                        }
                                    `}
                                >
                                    <Eye className="w-4 h-4" />
                                    <span className="text-sm font-medium">Published</span>
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-3 pt-4">
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="h-10 px-4"
                            >
                                {deleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete Chapter
                                    </>
                                )}
                            </Button>

                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/admin/chapters")}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updating}>
                                    {updating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
