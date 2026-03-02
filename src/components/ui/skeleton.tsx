import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-muted-foreground/20",
                className
            )}
        />
    );
}

// Dashboard Chapter Card Skeleton
export function ChapterCardSkeleton() {
    return (
        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 shadow-sm z-10 shrink-0 md:mx-auto absolute left-0 md:static bg-muted border-muted-foreground/30">
                <Skeleton className="w-6 h-6 rounded-full" />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-5 rounded-2xl border bg-muted/30 border-transparent">
                <div className="flex justify-between items-start mb-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-5 w-3/4 mb-4" />
                <Skeleton className="h-10 w-full rounded-xl" />
            </div>
        </div>
    );
}

// Subject Sidebar Item Skeleton
export function SubjectSidebarSkeleton() {
    return (
        <div className="w-full flex items-center gap-3 p-3 rounded-2xl border border-transparent">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-4 w-24" />
        </div>
    );
}

// Profile Stats Skeleton
export function ProfileStatsSkeleton() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-4 shadow-sm text-center">
                <Skeleton className="w-5 h-5 mx-auto mb-2" />
                <Skeleton className="h-2 w-12 mx-auto mb-1" />
                <Skeleton className="h-4 w-16 mx-auto" />
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-4 shadow-sm text-center">
                <Skeleton className="w-5 h-5 mx-auto mb-2" />
                <Skeleton className="h-2 w-8 mx-auto mb-1" />
                <Skeleton className="h-4 w-20 mx-auto" />
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-4 shadow-sm text-center">
                <Skeleton className="w-5 h-5 mx-auto mb-2" />
                <Skeleton className="h-2 w-12 mx-auto mb-1" />
                <Skeleton className="h-4 w-10 mx-auto" />
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-4 shadow-sm text-center">
                <Skeleton className="w-5 h-5 mx-auto mb-2" />
                <Skeleton className="h-2 w-16 mx-auto mb-1" />
                <Skeleton className="h-4 w-10 mx-auto" />
            </div>
        </div>
    );
}

// Admin Table Row Skeleton
export function AdminTableRowSkeleton() {
    return (
        <div className="flex items-center justify-between px-6 py-4">
            <div className="flex flex-col">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-24 rounded-full" />
            </div>
        </div>
    );
}

// Chat Bubble Skeleton
export function ChatBubbleSkeleton({ isUser = false }: { isUser?: boolean }) {
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                    isUser
                        ? "bg-primary/10 rounded-tr-sm"
                        : "bg-white border border-border rounded-tl-sm"
                }`}
            >
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
            </div>
        </div>
    );
}

// Dashboard Loading Skeleton
export function DashboardLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                <div>
                    <Skeleton className="h-9 w-64 mb-2" />
                    <Skeleton className="h-5 w-40" />
                </div>
                <Skeleton className="h-10 w-48 rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-1 space-y-4">
                    <Skeleton className="h-6 w-32 mb-4" />
                    {Array.from({ length: 4 }).map((_, i) => (
                        <SubjectSidebarSkeleton key={i} />
                    ))}
                </div>

                <div className="md:col-span-3 bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-6 md:p-10 shadow-sm relative">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64 mb-8" />

                    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-primary before:via-border before:to-transparent">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <ChapterCardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Profile Loading Skeleton
export function ProfileLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-3xl mx-auto">
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-8 shadow-sm mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <Skeleton className="w-24 h-24 rounded-full" />
                    <div className="text-center sm:text-left">
                        <Skeleton className="h-7 w-40 mb-2" />
                        <Skeleton className="h-4 w-56 mb-2" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                </div>
            </div>

            <ProfileStatsSkeleton />

            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-8 shadow-sm mb-6">
                <Skeleton className="h-6 w-32 mb-6" />
                <div className="space-y-5">
                    <div>
                        <Skeleton className="h-4 w-24 mb-1.5" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                    <div>
                        <Skeleton className="h-4 w-20 mb-1.5" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                    <div>
                        <Skeleton className="h-4 w-36 mb-1.5" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-12 w-full rounded-xl" />
                </div>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-8 shadow-sm">
                <Skeleton className="h-6 w-24 mb-6" />
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                </div>
            </div>
        </div>
    );
}

// Admin Loading Skeleton
export function AdminLoadingSkeleton() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="flex items-center gap-3 mb-8">
                <Skeleton className="w-8 h-8 rounded" />
                <Skeleton className="h-8 w-40" />
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-5 h-5" />
                        <Skeleton className="h-5 w-32" />
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <AdminTableRowSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Learn Page Loading Skeleton
export function LearnLoadingSkeleton() {
    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-background overflow-hidden">
            {/* Content Area Skeleton */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-3xl mx-auto">
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-48 mb-8" />

                    <div className="space-y-4">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-5/6" />
                    </div>

                    <Skeleton className="h-64 w-full mt-8 rounded-xl" />

                    <div className="space-y-4 mt-8">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-2/3" />
                    </div>
                </div>
            </div>

            {/* Chat Area Skeleton */}
            <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-border flex flex-col bg-muted/20">
                <div className="p-4 border-b border-border">
                    <Skeleton className="h-6 w-32" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <ChatBubbleSkeleton isUser={false} />
                    <ChatBubbleSkeleton isUser={false} />
                    <ChatBubbleSkeleton isUser={true} />
                </div>

                <div className="p-4 border-t border-border">
                    <Skeleton className="h-10 w-full rounded-xl" />
                </div>
            </div>
        </div>
    );
}

// Quiz Loading Skeleton
export function QuizLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-2xl mx-auto">
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>

                <Skeleton className="h-6 w-full mb-4" />
                <Skeleton className="h-6 w-3/4 mb-8" />

                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="p-4 rounded-xl border border-border bg-white"
                        >
                            <Skeleton className="h-5 w-full" />
                        </div>
                    ))}
                </div>

                <Skeleton className="h-12 w-full mt-8 rounded-xl" />
            </div>
        </div>
    );
}
