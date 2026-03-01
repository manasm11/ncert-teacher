"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";

/**
 * Variants for the Skeleton component following the forest/nature theme.
 */
const skeletonVariants = cva("animate-pulse rounded-md bg-primary/10", {
    variants: {
        variant: {
            rectangle: "rounded-md",
            circle: "rounded-full",
            text: "rounded-md",
        },
        size: {
            sm: "h-3 w-20",
            default: "h-4 w-full",
            lg: "h-6 w-full",
            icon: "h-8 w-8",
        },
    },
    defaultVariants: {
        variant: "rectangle",
        size: "default",
    },
});

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof skeletonVariants> {
    /**
     * Custom width (overrides size variant for rectangle)
     */
    width?: string | number;
    /**
     * Custom height (overrides size variant)
     */
    height?: string | number;
    /**
     * Custom border radius (overrides variant)
     */
    borderRadius?: string;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
    ({ className, variant, size, width, height, borderRadius, ...props }, ref) => {
        const style: React.CSSProperties = {};

        if (width !== undefined) {
            style.width = typeof width === "number" ? `${width}px` : width;
        }
        if (height !== undefined) {
            style.height = typeof height === "number" ? `${height}px` : height;
        }
        if (borderRadius !== undefined) {
            style.borderRadius = borderRadius;
        }

        return (
            <div
                ref={ref}
                className={skeletonVariants({ variant, size, className })}
                style={{ ...style, ...props.style }}
                data-testid="skeleton"
                {...props}
            />
        );
    }
);
Skeleton.displayName = "Skeleton";

/**
 * TextSkeleton component for simulating paragraph text.
 */
export interface TextSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    lines?: number;
    spacing?: string;
}

const TextSkeleton = React.forwardRef<HTMLDivElement, TextSkeletonProps>(
    ({ lines = 3, spacing = "mb-4", className, ...props }, ref) => {
        return (
            <div ref={ref} className={className} {...props}>
                {Array.from({ length: lines }).map((_, index) => (
                    <div key={index} className={`w-full ${index < lines - 1 ? spacing : ""}`}>
                        <Skeleton variant="text" size={index === 0 ? "lg" : "default"} />
                    </div>
                ))}
            </div>
        );
    }
);
TextSkeleton.displayName = "TextSkeleton";

/**
 * CardSkeleton component for simulating a card with header, content, and footer.
 */
export type CardSkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const CardSkeleton = React.forwardRef<HTMLDivElement, CardSkeletonProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`rounded-2xl border bg-card p-6 ${className || ""}`}
                {...props}
            >
                <div className="mb-4">
                    <Skeleton variant="rectangle" size="lg" width="50%" />
                </div>
                <div className="space-y-3">
                    <Skeleton variant="text" size="lg" />
                    <Skeleton variant="text" size="default" width="90%" />
                    <Skeleton variant="text" size="default" width="80%" />
                </div>
                <div className="mt-6 flex gap-2">
                    <Skeleton variant="rectangle" size="sm" width="80px" height="32px" borderRadius="8px" />
                    <Skeleton variant="rectangle" size="sm" width="80px" height="32px" borderRadius="8px" />
                </div>
            </div>
        );
    }
);
CardSkeleton.displayName = "CardSkeleton";

/**
 * ListSkeleton component for simulating a list of items.
 */
export interface ListSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    items?: number;
}

const ListSkeleton = React.forwardRef<HTMLDivElement, ListSkeletonProps>(
    ({ items = 5, className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`space-y-3 ${className || ""}`}
                {...props}
            >
                {Array.from({ length: items }).map((_, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <Skeleton variant="circle" size="default" width="40px" height="40px" />
                        <div className="flex-1 space-y-2">
                            <Skeleton variant="text" size="sm" width="60%" />
                            <Skeleton variant="text" size="default" width="40%" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }
);
ListSkeleton.displayName = "ListSkeleton";

/**
 * AvatarSkeleton component for simulating an avatar with name and description.
 */
export type AvatarSkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const AvatarSkeleton = React.forwardRef<HTMLDivElement, AvatarSkeletonProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`flex items-center gap-4 ${className || ""}`}
                {...props}
            >
                <Skeleton variant="circle" size="default" width="48px" height="48px" />
                <div className="space-y-2">
                    <Skeleton variant="text" size="sm" width="120px" />
                    <Skeleton variant="text" size="default" width="100px" />
                </div>
            </div>
        );
    }
);
AvatarSkeleton.displayName = "AvatarSkeleton";

/**
 * DashboardChapterSkeleton component for simulating a chapter card in the learning map.
 * Follows the forest/nature theme with primary and secondary colors.
 */
export type DashboardChapterSkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const DashboardChapterSkeleton = React.forwardRef<HTMLDivElement, DashboardChapterSkeletonProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`w-full p-5 rounded-2xl border border-transparent opacity-80 ${className || ""}`}
                {...props}
            >
                <div className="space-y-3">
                    <div className="flex justify-between items-start">
                        <Skeleton variant="text" size="sm" width="80px" />
                        <div className="flex gap-1">
                            <Skeleton variant="rectangle" size="sm" width="12px" height="12px" />
                            <Skeleton variant="rectangle" size="sm" width="12px" height="12px" />
                            <Skeleton variant="rectangle" size="sm" width="12px" height="12px" />
                        </div>
                    </div>
                    <Skeleton variant="text" size="default" width="90%" />
                    <Skeleton variant="rectangle" size="sm" width="100px" height="32px" borderRadius="8px" />
                </div>
            </div>
        );
    }
);
DashboardChapterSkeleton.displayName = "DashboardChapterSkeleton";

/**
 * SubjectSidebarSkeleton component for simulating the subjects sidebar in the dashboard.
 * Follows the forest/nature theme.
 */
export interface SubjectSidebarSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    items?: number;
}

const SubjectSidebarSkeleton = React.forwardRef<HTMLDivElement, SubjectSidebarSkeletonProps>(
    ({ items = 4, className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`space-y-4 ${className || ""}`}
                {...props}
            >
                {Array.from({ length: items }).map((_, index) => (
                    <div
                        key={index}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                            index === 0 ? "bg-white shadow-md border-primary/20 ring-2 ring-primary/10" : "hover:bg-white/60 border-transparent"
                        }`}
                    >
                        <Skeleton variant="circle" size="default" width="40px" height="40px" />
                        <Skeleton variant="text" size="default" width="100px" />
                    </div>
                ))}
            </div>
        );
    }
);
SubjectSidebarSkeleton.displayName = "SubjectSidebarSkeleton";

/**
 * ChatMessageSkeleton component for simulating a chat message bubble in the chat interface.
 * Follows the forest/nature theme with primary colors.
 */
export interface ChatMessageSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    count?: number;
    isUser?: boolean;
}

const ChatMessageSkeleton = React.forwardRef<HTMLDivElement, ChatMessageSkeletonProps>(
    ({ count = 2, isUser = false, className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`space-y-4 ${className || ""}`}
                {...props}
            >
                {Array.from({ length: count }).map((_, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                                isUser
                                    ? "bg-foreground text-white rounded-tr-sm"
                                    : "bg-white border border-border shadow-sm rounded-tl-sm"
                            }`}
                        >
                            <div className="space-y-2">
                                <Skeleton variant="text" size="sm" width="70%" />
                                <Skeleton variant="text" size="default" width="90%" />
                                <Skeleton variant="text" size="default" width="60%" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        );
    }
);
ChatMessageSkeleton.displayName = "ChatMessageSkeleton";

/**
 * AdminTableSkeleton component for simulating table rows in admin pages.
 * Follows the forest/nature theme with muted colors.
 */
export interface AdminTableSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    rows?: number;
}

const AdminTableSkeleton = React.forwardRef<HTMLDivElement, AdminTableSkeletonProps>(
    ({ rows = 5, className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`divide-y divide-border ${className || ""}`}
                {...props}
            >
                {Array.from({ length: rows }).map((_, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between px-6 py-4"
                    >
                        <div className="flex flex-col gap-2">
                            <Skeleton variant="text" size="default" width="150px" />
                            <Skeleton variant="text" size="sm" width="80px" />
                        </div>
                        <div className="flex items-center gap-3">
                            <Skeleton variant="rectangle" size="sm" width="80px" height="24px" borderRadius="12px" />
                            <Skeleton variant="rectangle" size="sm" width="100px" height="28px" borderRadius="6px" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }
);
AdminTableSkeleton.displayName = "AdminTableSkeleton";

/**
 * ProfileStatsSkeleton component for simulating a stats card in the profile page.
 * Follows the forest/nature theme.
 */
export type ProfileStatsSkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const ProfileStatsSkeleton = React.forwardRef<HTMLDivElement, ProfileStatsSkeletonProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-4 shadow-sm text-center ${className || ""}`}
                {...props}
            >
                <Skeleton variant="rectangle" size="default" width="20px" height="20px" className="mx-auto mb-2" />
                <Skeleton variant="text" size="sm" width="60px" />
                <Skeleton variant="text" size="default" width="80px" className="mt-1" />
            </div>
        );
    }
);
ProfileStatsSkeleton.displayName = "ProfileStatsSkeleton";

/**
 * QuizQuestionSkeleton component for simulating a quiz question card.
 * Follows the forest/nature theme.
 */
export type QuizQuestionSkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const QuizQuestionSkeleton = React.forwardRef<HTMLDivElement, QuizQuestionSkeletonProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-6 md:p-8 shadow-sm ${className || ""}`}
                {...props}
            >
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Skeleton variant="circle" size="sm" width="28px" height="28px" />
                        <Skeleton variant="text" size="default" width="100px" />
                    </div>
                    <Skeleton variant="text" size="default" width="100%" className="text-lg" />
                    <Skeleton variant="text" size="default" width="90%" className="mt-2" />
                </div>

                <div className="space-y-3">
                    <Skeleton variant="rectangle" size="default" width="100%" height="52px" borderRadius="12px" />
                    <Skeleton variant="rectangle" size="default" width="100%" height="52px" borderRadius="12px" />
                    <Skeleton variant="rectangle" size="default" width="100%" height="52px" borderRadius="12px" />
                    <Skeleton variant="rectangle" size="default" width="100%" height="52px" borderRadius="12px" />
                </div>
            </div>
        );
    }
);
QuizQuestionSkeleton.displayName = "QuizQuestionSkeleton";

/**
 * QuizOptionSkeleton component for simulating a quiz option.
 * Follows the forest/nature theme.
 */
export type QuizOptionSkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const QuizOptionSkeleton = React.forwardRef<HTMLDivElement, QuizOptionSkeletonProps>(
    ({ className, ...props }, ref) => {
        return (
            <Skeleton
                ref={ref}
                variant="rectangle"
                size="default"
                width="100%"
                height="52px"
                borderRadius="12px"
                className={className}
                {...props}
            />
        );
    }
);
QuizOptionSkeleton.displayName = "QuizOptionSkeleton";

export {
    Skeleton,
    TextSkeleton,
    CardSkeleton,
    ListSkeleton,
    AvatarSkeleton,
    DashboardChapterSkeleton,
    SubjectSidebarSkeleton,
    ChatMessageSkeleton,
    AdminTableSkeleton,
    ProfileStatsSkeleton,
    QuizQuestionSkeleton,
    QuizOptionSkeleton,
};
