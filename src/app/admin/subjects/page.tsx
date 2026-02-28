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
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import Link from "next/link";

interface Subject {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string;
    grade_start: number;
    grade_end: number;
    created_at: string;
}

const GRADES = [6, 7, 8, 9, 10, 11, 12];

export default function AdminSubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [gradeFilter, setGradeFilter] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchSubjects();
    }, []);

    async function fetchSubjects() {
        setLoading(true);
        const supabase = createClient();

        const { data, error } = await supabase
            .from("subjects")
            .select("*")
            .order("name", { ascending: true });

        if (error) {
            console.error("Error fetching subjects:", error);
            toast({
                title: "Error",
                description: "Failed to load subjects",
                variant: "destructive",
            });
        } else {
            setSubjects(data || []);
        }
        setLoading(false);
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this subject?")) {
            return;
        }

        setDeletingId(id);
        const supabase = createClient();

        const { error } = await supabase.from("subjects").delete().eq("id", id);

        if (error) {
            console.error("Error deleting subject:", error);
            toast({
                title: "Error",
                description: "Failed to delete subject",
                variant: "destructive",
            });
        } else {
            setSubjects((prev) => prev.filter((s) => s.id !== id));
            toast({
                title: "Success",
                description: "Subject deleted successfully",
            });
        }
        setDeletingId(null);
    }

    const filteredSubjects = useMemo(() => {
        return subjects.filter((subject) => {
            // Search filter
            const matchesSearch =
                subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (subject.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

            // Grade filter
            const matchesGrade =
                gradeFilter === null ||
                (subject.grade_start <= gradeFilter && subject.grade_end >= gradeFilter);

            return matchesSearch && matchesGrade;
        });
    }, [subjects, searchTerm, gradeFilter]);

    const getGradeRange = (start: number, end: number) => {
        if (start === end) {
            return `Class ${start}`;
        }
        return `Classes ${start}-${end}`;
    };

    const getIcon = (iconName: string) => {
        const icons: Record<string, React.ReactNode> = {
            BookOpen: <BookOpen className="w-5 h-5" />,
            GraduationCap: <GraduationCap className="w-5 h-5" />,
            Globe: <Globe className="w-5 h-5" />,
            Map: <Map className="w-5 h-5" />,
            Compass: <Compass className="w-5 h-5" />,
            Calculator: <Calculator className="w-5 h-5" />,
            Atom: <Atom className="w-5 h-5" />,
            Palette: <Palette className="w-5 h-5" />,
            Music: <Music className="w-5 h-5" />,
            Users: <Users className="w-5 h-5" />,
            Language: <Language className="w-5 h-5" />,
            Smartphone: <Smartphone className="w-5 h-5" />,
        };
        return icons[iconName] || <BookOpen className="w-5 h-5" />;
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-6 py-12">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Skeleton variant="rectangle" size="default" width="32px" height="32px" borderRadius="8px" />
                        <Skeleton variant="text" size="lg" width="200px" />
                    </div>
                    <div className="flex gap-3">
                        <Skeleton variant="rectangle" size="default" width="140px" height="40px" borderRadius="12px" />
                        <Skeleton variant="rectangle" size="default" width="40px" height="40px" borderRadius="12px" />
                    </div>
                </div>
                <AdminTableSkeleton rows={5} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-destructive/10 rounded-xl">
                        <GraduationCap className="w-8 h-8 text-destructive" />
                    </div>
                    <div>
                        <h1 className="font-outfit text-3xl font-bold text-foreground">
                            Subject Management
                        </h1>
                        <p className="text-muted-foreground">
                            Manage NCERT subjects for different grade levels
                        </p>
                    </div>
                </div>
                <Button asChild variant="default">
                    <Link href="/admin/subjects/new">
                        <Plus className="w-4 h-4" />
                        Add Subject
                    </Link>
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search subjects..."
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
                        </div>
                    </div>

                    {filteredSubjects.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="mx-auto w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-outfit text-lg font-semibold text-foreground mb-2">
                                No subjects found
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                {searchTerm
                                    ? "Try adjusting your search or filters"
                                    : "Get started by adding your first subject"}
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
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Subject
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Grade Range
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Description
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
                                        {filteredSubjects.map((subject) => (
                                            <tr
                                                key={subject.id}
                                                className="group hover:bg-muted/10 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                                            {getIcon(subject.icon)}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-foreground">
                                                                {subject.name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground font-mono">
                                                                {subject.slug}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {getGradeRange(subject.grade_start, subject.grade_end)}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-foreground line-clamp-2 max-w-xs">
                                                        {subject.description || (
                                                            <span className="text-muted-foreground italic">
                                                                No description
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="success" className="text-xs">
                                                        Active
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
                                                            <Link href={`/admin/subjects/${subject.id}/edit`}>
                                                                <Edit className="w-4 h-4" />
                                                                <span className="sr-only">Edit</span>
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDelete(subject.id)}
                                                            disabled={deletingId === subject.id}
                                                        >
                                                            {deletingId === subject.id ? (
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
                            Showing {filteredSubjects.length} of {subjects.length} subject(s)
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Import missing icons
function Map(props: React.SVGProps<SVGSVGElement>) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" x2="8" y1="2" y2="18"/><line x1="16" x2="16" y1="6" y2="22"/></svg>;
}

function Compass(props: React.SVGProps<SVGSVGElement>) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>;
}

function Calculator(props: React.SVGProps<SVGSVGElement>) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>;
}

function Atom(props: React.SVGProps<SVGSVGElement>) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/></svg>;
}

function Palette(props: React.SVGProps<SVGSVGElement>) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;
}

function Music(props: React.SVGProps<SVGSVGElement>) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
}

function Users(props: React.SVGProps<SVGSVGElement>) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}

function Language(props: React.SVGProps<SVGSVGElement>) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
}

function Smartphone(props: React.SVGProps<SVGSVGElement>) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>;
}
