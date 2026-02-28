"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Search,
    X,
    BookOpen,
    ChevronRight,
    Star,
    Clock,
    ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// Types
interface SearchResult {
    id: string;
    title: string;
    description?: string;
    content_markdown?: string;
    subject_id: string;
    grade: number;
    chapter_number: number;
    slug: string;
    status: string;
    created_at: string;
    relevance: number;
    snippet?: string;
}

interface SearchPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface SearchFilters {
    subject?: string;
    grade?: number;
    query?: string;
}

interface SearchResponse {
    results: SearchResult[];
    pagination: SearchPagination;
    filters: SearchFilters;
}

// Interfaces for state
interface RecentSearch {
    query: string;
    timestamp: number;
}

// Mock data for subjects (for filtering)
const SUBJECTS = [
    { id: "science", name: "Science", slug: "science", icon: "🔬" },
    { id: "mathematics", name: "Mathematics", slug: "mathematics", icon: "📐" },
    { id: "history", name: "History", slug: "history", icon: "🏰" },
    { id: "geography", name: "Geography", slug: "geography", icon: "🌍" },
    { id: "english", name: "English", slug: "english", icon: "📚" },
    { id: "hindi", name: "Hindi", slug: "hindi", icon: "ॐ" },
];

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function SearchPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State
    const [query, setQuery] = useState("");
    const [subjectFilter, setSubjectFilter] = useState<string | undefined>(undefined);
    const [gradeFilter, setGradeFilter] = useState<number | undefined>(undefined);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [pagination, setPagination] = useState<SearchPagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

    // Load recent searches from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("recentSearches");
        if (saved) {
            try {
                const searches: RecentSearch[] = JSON.parse(saved);
                setRecentSearches(searches.slice(0, 5)); // Keep last 5
            } catch {
                // Ignore parse errors
            }
        }
    }, []);

    // Initialize from URL params on mount
    useEffect(() => {
        const q = searchParams.get("q") || "";
        const subject = searchParams.get("subject") || undefined;
        const grade = searchParams.get("grade") ? parseInt(searchParams.get("grade")!) : undefined;

        setQuery(q);
        setSubjectFilter(subject);
        setGradeFilter(grade);

        if (q) {
            performSearch(q, subject, grade);
        }
    }, []);

    // Perform search API call
    const performSearch = useCallback(async (q: string, subject?: string, grade?: number) => {
        if (!q.trim()) {
            setResults([]);
            setPagination(null);
            setHasSearched(false);
            return;
        }

        setIsLoading(true);
        setHasSearched(true);

        try {
            const params = new URLSearchParams();
            params.set("q", q);
            if (subject) params.set("subject", subject);
            if (grade) params.set("grade", grade.toString());

            const response = await fetch(`/api/search?${params.toString()}`);

            if (!response.ok) {
                throw new Error("Search failed");
            }

            const data: SearchResponse = await response.json();
            setResults(data.results);
            setPagination(data.pagination);

            // Add to recent searches
            addToRecentSearches(q);

        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Add search to recent searches
    const addToRecentSearches = (query: string) => {
        const searches = localStorage.getItem("recentSearches");
        let recent: RecentSearch[] = [];

        if (searches) {
            try {
                recent = JSON.parse(searches);
            } catch {
                // Ignore parse errors
            }
        }

        // Remove duplicates and add to beginning
        recent = recent.filter((s) => s.query.toLowerCase() !== query.toLowerCase());
        recent.unshift({ query, timestamp: Date.now() });

        // Keep only last 5
        recent = recent.slice(0, 5);
        localStorage.setItem("recentSearches", JSON.stringify(recent));
        setRecentSearches(recent);
    };

    // Remove from recent searches
    const removeRecentSearch = (queryToRemove: string) => {
        const updated = recentSearches.filter((s) => s.query !== queryToRemove);
        setRecentSearches(updated);
        localStorage.setItem("recentSearches", JSON.stringify(updated));
    };

    // Clear recent searches
    const clearRecentSearches = () => {
        setRecentSearches([]);
        localStorage.removeItem("recentSearches");
    };

    // Handle search form submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Update URL
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (subjectFilter) params.set("subject", subjectFilter);
        if (gradeFilter) params.set("grade", gradeFilter.toString());

        router.push(`/search?${params.toString()}`);
        performSearch(query, subjectFilter, gradeFilter);
    };

    // Handle subject filter change
    const handleSubjectChange = (slug: string | undefined) => {
        setSubjectFilter(slug);

        const params = new URLSearchParams(searchParams.toString());
        if (slug) {
            params.set("subject", slug);
        } else {
            params.delete("subject");
        }
        router.push(`/search?${params.toString()}`);

        performSearch(query, slug, gradeFilter);
    };

    // Handle grade filter change
    const handleGradeChange = (grade: number | undefined) => {
        setGradeFilter(grade);

        const params = new URLSearchParams(searchParams.toString());
        if (grade) {
            params.set("grade", grade.toString());
        } else {
            params.delete("grade");
        }
        router.push(`/search?${params.toString()}`);

        performSearch(query, subjectFilter, grade);
    };

    // Highlight matching terms in text
    const highlightText = (text: string | undefined, highlightTerms: string[]): React.ReactNode => {
        if (!text) return null;

        // Create regex pattern from all terms
        const terms = highlightTerms.filter(Boolean);
        if (terms.length === 0) return <>{text}</>;

        const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
        const parts = text.split(pattern);

        return (
            <>
                {parts.map((part, i) => {
                    // Check if this part matches any of the highlight terms
                    const isMatch = terms.some((t) => t.toLowerCase() === part.toLowerCase());
                    if (isMatch) {
                        return (
                            <span key={i} className="bg-accent/30 text-accent-foreground font-semibold px-0.5 rounded">
                                {part}
                            </span>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </>
        );
    };

    // Escape special regex characters
    const escapeRegExp = (text: string) => {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    // Get subject by slug
    const getSubjectBySlug = (slug: string | undefined) => {
        if (!slug) return undefined;
        return SUBJECTS.find((s) => s.slug === slug);
    };

    // Get grade label
    const getGradeLabel = (grade: number | undefined) => {
        if (grade === undefined) return "All Grades";
        if (grade >= 1 && grade <= 8) return `Class ${grade}`;
        if (grade >= 9 && grade <= 10) return `Class ${grade}`;
        if (grade >= 11 && grade <= 12) return `Class ${grade}`;
        return `Grade ${grade}`;
    };

    return (
        <div className="min-h-screen bg-background/50 pt-20 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
            {/* Search Header */}
            <div className="mb-10">
                <h1 className="text-4xl md:text-5xl font-bold font-outfit text-foreground mb-4">
                    Find Learning Materials
                </h1>
                <p className="text-muted-foreground text-lg">
                    Search across all chapters and topics
                </p>
            </div>

            {/* Search Bar and Filters */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-border shadow-sm">
                <form onSubmit={handleSubmit} className="relative mb-6">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Search className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search chapters, topics, or concepts..."
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-muted/50 border border-border focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-lg placeholder-muted-foreground"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery("");
                                const params = new URLSearchParams();
                                if (subjectFilter) params.set("subject", subjectFilter);
                                if (gradeFilter) params.set("grade", gradeFilter.toString());
                                router.push(`/search?${params.toString()}`);
                                performSearch("", subjectFilter, gradeFilter);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </form>

                {/* Filter Chips */}
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Subject Filter */}
                    <div className="flex-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Subject
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleSubjectChange(undefined)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                    subjectFilter === undefined
                                        ? "bg-primary text-white shadow-playful"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                            >
                                All Subjects
                            </button>
                            {SUBJECTS.map((sub) => (
                                <button
                                    key={sub.slug}
                                    onClick={() => handleSubjectChange(sub.slug)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                                        subjectFilter === sub.slug
                                            ? "bg-primary text-white shadow-playful"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                                >
                                    <span>{sub.icon}</span>
                                    {sub.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grade Filter */}
                    <div className="flex-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Grade
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleGradeChange(undefined)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                    gradeFilter === undefined
                                        ? "bg-secondary text-white shadow-playful"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                            >
                                All Grades
                            </button>
                            {GRADES.map((grade) => (
                                <button
                                    key={grade}
                                    onClick={() => handleGradeChange(grade)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                        gradeFilter === grade
                                            ? "bg-secondary text-white shadow-playful"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                                >
                                    Class {grade}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && !hasSearched && (
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold font-outfit text-foreground flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Recent Searches
                        </h2>
                        <button
                            onClick={clearRecentSearches}
                            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                        >
                            Clear all
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {recentSearches.map((search) => (
                            <div
                                key={search.timestamp}
                                className="flex items-center gap-2 bg-white border border-border rounded-full px-4 py-2 shadow-sm"
                            >
                                <span className="text-foreground">{search.query}</span>
                                <button
                                    onClick={() => removeRecentSearch(search.query)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Results Section */}
            {hasSearched && (
                <div className="mb-6">
                    <h2 className="text-xl font-bold font-outfit text-foreground">
                        {isLoading ? "Searching..." : `${pagination?.total || 0} results`}
                        {query && (
                            <span className="text-sm text-muted-foreground ml-2">
                                for "{query}"
                            </span>
                        )}
                    </h2>
                </div>
            )}

            {/* Results List */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                    <p className="text-muted-foreground">Finding the perfect lessons for you...</p>
                </div>
            ) : hasSearched && results.length === 0 ? (
                <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-border">
                    <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold font-outfit text-foreground mb-2">
                        No results found
                    </h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        We couldn't find any chapters matching your search. Try adjusting your filters or using different keywords.
                    </p>
                    <button
                        onClick={() => {
                            setQuery("");
                            setSubjectFilter(undefined);
                            setGradeFilter(undefined);
                            router.push("/search");
                        }}
                        className="px-6 py-3 bg-primary text-white rounded-xl shadow-playful hover:bg-primary/90 transition-all"
                    >
                        Clear All Filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map((result) => {
                        const subject = getSubjectBySlug(result.subject_id);
                        const gradeLabel = getGradeLabel(result.grade);

                        return (
                            <Link
                                key={result.id}
                                href={`/learn/${result.slug}`}
                                className="group flex flex-col bg-white border border-border rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full">
                                            {subject && <span className="text-lg">{subject.icon}</span>}
                                            <span className="font-medium">
                                                {subject?.name || "Subject"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-secondary/10 px-2.5 py-1 rounded-full text-secondary">
                                            <Star className="w-3 h-3 fill-secondary" />
                                            <span className="font-bold">{gradeLabel}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded">
                                        <BookOpen className="w-3 h-3" />
                                        Ch. {result.chapter_number}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold font-outfit text-foreground mb-2 group-hover:text-primary transition-colors">
                                    {highlightText(result.title, query ? [query] : [])}
                                </h3>

                                {result.snippet && (
                                    <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
                                        {highlightText(result.snippet, query ? [query] : [])}
                                    </p>
                                )}

                                <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                            {new Date(result.created_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
                                        Read
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && !isLoading && (
                <div className="flex items-center justify-center gap-2 mt-12">
                    <button
                        onClick={() => {
                            const newPage = Math.max(1, pagination.page - 1);
                            const params = new URLSearchParams(searchParams.toString());
                            params.set("page", newPage.toString());
                            router.push(`/search?${params.toString()}`);
                            performSearch(query, subjectFilter, gradeFilter);
                        }}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 rounded-xl border border-border bg-white hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Previous
                    </button>
                    <span className="text-sm font-medium text-foreground">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => {
                            const newPage = Math.min(pagination.totalPages, pagination.page + 1);
                            const params = new URLSearchParams(searchParams.toString());
                            params.set("page", newPage.toString());
                            router.push(`/search?${params.toString()}`);
                            performSearch(query, subjectFilter, gradeFilter);
                        }}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-4 py-2 rounded-xl border border-border bg-white hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
