"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
    BookOpen,
    Map,
    Settings,
    UserCircle2,
    LogOut,
    Shield,
    GraduationCap,
    Search,
    X,
    ChevronLeft,
    Clock,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ROLES, hasRole, type Role } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchResult {
    id: string;
    title: string;
    slug: string;
    grade: number;
    relevance: number;
}

interface SearchState {
    isOpen: boolean;
    query: string;
    results: SearchResult[];
    isLoading: boolean;
    hasSearched: boolean;
    selectedResult: number;
}

export async function Navbar() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    let role: Role | null = null;
    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        role = (profile?.role as Role) ?? null;
    }

    const signOut = async () => {
        "use server";
        const supabase = await createClient();
        await supabase.auth.signOut();
        redirect("/login");
    };

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-white/40 z-50 flex items-center justify-between px-6 shadow-sm">
            <div className="flex items-center gap-2">
                {/* Gyanu Logo Placeholder */}
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                    🐘
                </div>
                <Link
                    href="/"
                    className="font-outfit font-bold text-xl tracking-tight text-foreground hover:opacity-80 transition-opacity"
                >
                    Gyanu<span className="text-primary">AI</span>
                </Link>
            </div>

            <div className="flex items-center gap-6">
                <Link
                    href="/dashboard"
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                    <Map className="w-4 h-4" />
                    My Map
                </Link>
                <Link
                    href="/learn"
                    className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors flex items-center gap-2"
                >
                    <BookOpen className="w-4 h-4" />
                    Learn
                </Link>
                {role && hasRole(role, ROLES.TEACHER) && (
                    <Link
                        href="/teacher"
                        className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors flex items-center gap-2"
                    >
                        <GraduationCap className="w-4 h-4" />
                        Classroom
                    </Link>
                )}
                {role && hasRole(role, ROLES.ADMIN) && (
                    <Link
                        href="/admin"
                        className="text-sm font-medium text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2"
                    >
                        <Shield className="w-4 h-4" />
                        Admin
                    </Link>
                )}
            </div>

            <div className="flex items-center gap-4">
                {/* Search Toggle - Desktop */}
                <div className="hidden md:flex items-center">
                    <SearchButton />
                </div>

                {/* Search Icon - Mobile (opens full search modal) */}
                <div className="md:hidden">
                    <SearchButtonMobile />
                </div>

                {user ? (
                    <>
                        {role && (
                            <span className="hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                                {role}
                            </span>
                        )}
                        <Link
                            href="/profile"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Settings className="w-5 h-5" />
                        </Link>
                        <form action={signOut}>
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm font-medium"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="hidden sm:inline">
                                    Sign Out
                                </span>
                            </button>
                        </form>
                    </>
                ) : (
                    <Link
                        href="/login"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
                    >
                        <UserCircle2 className="w-5 h-5" />
                        <span>Sign In</span>
                    </Link>
                )}
            </div>
        </nav>
    );
}

// Desktop Search Button with Expandable Search Bar
function SearchButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedResult, setSelectedResult] = useState(-1);

    const containerRef = useRef<HTMLDivElement>(null);

    // Close search when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setQuery("");
                setResults([]);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length > 2) {
                setIsLoading(true);
                setHasSearched(true);
                try {
                    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
                    if (response.ok) {
                        const data = await response.json();
                        setResults(data.results || []);
                    }
                } catch (error) {
                    console.error("Search error:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
                setHasSearched(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [query]);

    // Keyboard navigation
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (!isOpen || results.length === 0) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedResult((prev) => (prev + 1) % results.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedResult((prev) => (prev - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
                if (selectedResult >= 0 && selectedResult < results.length) {
                    window.location.href = `/learn/${results[selectedResult].slug}`;
                }
            } else if (e.key === "Escape") {
                setIsOpen(false);
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, results, selectedResult]);

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                    isOpen
                        ? "bg-muted/50 text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
            >
                {isOpen ? <ChevronLeft className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                {isOpen && <span className="text-sm">Search...</span>}
            </button>

            {/* Search Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-12 w-96 bg-white border border-border rounded-xl shadow-xl overflow-hidden z-50">
                    {/* Search Input */}
                    <div className="p-4 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search chapters, topics..."
                                className="pl-9 text-sm"
                                autoFocus
                            />
                            <button
                                onClick={() => {
                                    setQuery("");
                                    setIsOpen(false);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Search Results */}
                    <div className="max-h-80 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                                Searching...
                            </div>
                        ) : hasSearched && results.length === 0 ? (
                            <div className="p-6 text-center">
                                <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Search className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    No results found for &quot;{query}&quot;
                                </p>
                                <Link
                                    href={"/search?q=" + encodeURIComponent(query)}
                                    className="mt-3 inline-block text-primary text-sm font-medium hover:underline"
                                >
                                    View all results
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {results.map((result, index) => (
                                    <Link
                                        key={result.id}
                                        href={`/learn/${result.slug}`}
                                        className={`flex items-center gap-3 p-3 hover:bg-primary/5 transition-colors ${index === selectedResult ? "bg-primary/5" : ""}`}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                                            {result.grade}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {result.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Class {result.grade}
                                            </p>
                                        </div>
                                        <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {hasSearched && results.length > 0 && (
                        <div className="p-3 bg-muted/30 border-t border-border text-center">
                            <Link
                                href={"/search?q=" + encodeURIComponent(query)}
                                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                            >
                                View all results
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Mobile Search Modal
function SearchButtonMobile() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length > 2) {
                setIsLoading(true);
                setHasSearched(true);
                try {
                    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
                    if (response.ok) {
                        const data = await response.json();
                        setResults(data.results || []);
                    }
                } catch (error) {
                    console.error("Search error:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
                setHasSearched(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="text-muted-foreground hover:text-foreground"
            >
                <Search className="w-5 h-5" />
            </button>

            {/* Mobile Search Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-border flex items-center gap-4">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search chapters, topics..."
                                className="pl-10 text-lg"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {isLoading ? (
                            <div className="text-center py-10 text-muted-foreground">
                                Searching...
                            </div>
                        ) : hasSearched && results.length === 0 ? (
                            <div className="text-center py-10">
                                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground">
                                    No results found for &quot;{query}&quot;
                                </p>
                            </div>
                        ) : (
                            results.map((result) => (
                                <Link
                                    key={result.id}
                                    href={`/learn/${result.slug}`}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-4 p-3 bg-white border border-border rounded-xl hover:border-primary/30 transition-all"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                                        {result.grade}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-foreground">{result.title}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Class {result.grade} • Chapter {result.id}
                                        </p>
                                    </div>
                                    <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
