"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    GraduationCap,
    BookOpen,
    Globe,
    Map,
    Compass,
    Calculator,
    Atom,
    Palette,
    Music,
    Users,
    Language,
    Smartphone,
    ArrowLeft,
    Loader2,
    Plus,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import {
    GRADE_LEVELS,
    SUBJECT_ICONS,
} from "@/app/admin/subjects/validation";

const iconComponents: Record<string, React.ElementType> = {
    BookOpen,
    Globe,
    Map,
    Compass,
    Calculator,
    Atom,
    Palette,
    Music,
    Users,
    Language,
    Smartphone,
    GraduationCap,
};

const GRADES = [6, 7, 8, 9, 10, 11, 12];

export default function NewSubjectPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [icon, setIcon] = useState(SUBJECT_ICONS[0]);
    const [gradeStart, setGradeStart] = useState(6);
    const [gradeEnd, setGradeEnd] = useState(8);

    // Auto-generate slug from name
    useEffect(() => {
        const generatedSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .trim()
            .substring(0, 50);
        setSlug(generatedSlug);
    }, [name]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast({
                title: "Error",
                description: "Subject name is required",
                variant: "destructive",
            });
            return;
        }

        if (gradeStart > gradeEnd) {
            toast({
                title: "Error",
                description: "Start grade must be less than or equal to end grade",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description);
        formData.append("icon", icon);
        formData.append("gradeStart", gradeStart.toString());
        formData.append("gradeEnd", gradeEnd.toString());

        try {
            const response = await fetch("/api/admin/subjects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    description,
                    icon,
                    gradeRange: {
                        start: gradeStart,
                        end: gradeEnd,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create subject");
            }

            toast({
                title: "Success",
                description: "Subject created successfully",
            });

            router.push("/admin/subjects");
        } catch (error) {
            console.error("Error creating subject:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create subject",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (iconName: string) => {
        const IconComponent = iconComponents[iconName] || BookOpen;
        return <IconComponent className="w-6 h-6" />;
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
                        Add New Subject
                    </h1>
                    <p className="text-muted-foreground">
                        Create a new subject for the NCERT curriculum
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Subject Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="space-y-6">
                        {/* Subject Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                Subject Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Science"
                                className="h-12"
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter the subject name (e.g., Mathematics, Social Science)
                            </p>
                        </div>

                        {/* Slug */}
                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug (URL identifier)</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="slug"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="science"
                                    className="font-mono h-12"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Auto-generated from the subject name
                            </p>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter a brief description of this subject..."
                                className="w-full h-32 rounded-xl border border-border bg-transparent px-4 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring resize-none"
                            />
                        </div>

                        {/* Icon Selector */}
                        <div className="space-y-3">
                            <Label>Icon</Label>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                {SUBJECT_ICONS.map((iconName) => {
                                    const IconComponent = iconComponents[iconName] || BookOpen;
                                    const isSelected = icon === iconName;
                                    return (
                                        <button
                                            key={iconName}
                                            type="button"
                                            onClick={() => setIcon(iconName)}
                                            className={`
                                                flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all
                                                ${isSelected
                                                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                                                    : "border-border bg-background hover:border-primary/50 hover:bg-muted/30"
                                                }
                                            `}
                                        >
                                            <IconComponent className="w-6 h-6 text-foreground" />
                                            <span className="text-[10px] font-medium text-foreground">
                                                {iconName}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Grade Range */}
                        <div className="space-y-3">
                            <Label>Grade Range</Label>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="gradeStart" className="text-xs">
                                        Start Grade
                                    </Label>
                                    <select
                                        id="gradeStart"
                                        value={gradeStart}
                                        onChange={(e) => {
                                            const newStart = Number(e.target.value);
                                            setGradeStart(newStart);
                                            if (newStart > gradeEnd) {
                                                setGradeEnd(newStart);
                                            }
                                        }}
                                        className="w-full h-12 rounded-xl border border-border bg-background px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        {GRADES.map((grade) => (
                                            <option key={grade} value={grade}>
                                                Grade {grade}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center justify-center">
                                    <span className="text-muted-foreground">to</span>
                                </div>

                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="gradeEnd" className="text-xs">
                                        End Grade
                                    </Label>
                                    <select
                                        id="gradeEnd"
                                        value={gradeEnd}
                                        onChange={(e) => {
                                            setGradeEnd(Number(e.target.value));
                                        }}
                                        className="w-full h-12 rounded-xl border border-border bg-background px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        {GRADES.map((grade) => (
                                            <option key={grade} value={grade}>
                                                Grade {grade}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <Badge variant="secondary" className="mt-2">
                                {gradeStart === gradeEnd
                                    ? `Class ${gradeStart}`
                                    : `Classes ${gradeStart}-${gradeEnd}`}
                            </Badge>
                        </div>

                        {/* Submit Button */}
                        <div className="flex items-center justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push("/admin/subjects")}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Create Subject
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
