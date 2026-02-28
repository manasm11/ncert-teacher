"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion, MotionProps } from "framer-motion";

/**
 * Variants for the StatCard component.
 * Follows the forest/nature theme with red/orange accents for admin.
 */
const statCardVariants = cva(
    "rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md",
    {
        variants: {
            variant: {
                default: "border-border",
                primary: "border-primary/20 bg-primary/5",
                secondary: "border-secondary/20 bg-secondary/5",
                success: "border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10",
                warning: "border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10",
                danger: "border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10",
                admin: "border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10",
            },
            gradient: {
                none: "",
                horizontal: "bg-gradient-to-r",
                vertical: "bg-gradient-to-b",
            },
        },
        defaultVariants: {
            variant: "default",
            gradient: "none",
        },
    }
);

const labelVariants = cva("text-sm font-medium text-muted-foreground", {
    variants: {
        variant: {
            default: "",
            primary: "text-primary",
            secondary: "text-secondary",
            success: "text-green-600 dark:text-green-400",
            warning: "text-amber-600 dark:text-amber-400",
            danger: "text-red-600 dark:text-red-400",
            admin: "text-red-600 dark:text-red-400",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});

const valueVariants = cva("text-3xl font-bold text-foreground font-outfit", {
    variants: {
        variant: {
            default: "",
            primary: "text-primary",
            secondary: "text-secondary",
            success: "text-green-700 dark:text-green-300",
            warning: "text-amber-700 dark:text-amber-300",
            danger: "text-red-700 dark:text-red-300",
            admin: "text-red-700 dark:text-red-300",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});

const trendVariants = cva(
    "inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
    {
        variants: {
            variant: {
                default: "bg-muted text-muted-foreground",
                primary: "bg-primary/10 text-primary",
                secondary: "bg-secondary/10 text-secondary",
                success: "bg-green-500 text-white",
                warning: "bg-amber-500 text-white",
                danger: "bg-red-500 text-white",
                admin: "bg-red-500 text-white",
            },
            direction: {
                up: "",
                down: "",
            },
        },
        defaultVariants: {
            variant: "default",
            direction: "up",
        },
    }
);

export interface StatCardProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof statCardVariants> {
    icon?: React.ReactNode;
    label: string;
    value: string | number;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    description?: string;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
    (
        { className, variant, icon, label, value, trend, description, ...props },
        ref
    ) => {
        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(statCardVariants({ variant, className }))}
                {...props}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <p className={cn(labelVariants({ variant }))}>{label}</p>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className={cn(valueVariants({ variant }))}>
                                {value}
                            </span>
                        </div>
                        {description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                    {icon && (
                        <div
                            className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                variant === "default" && "bg-primary/10 text-primary",
                                variant === "primary" && "bg-primary/20 text-primary",
                                variant === "secondary" && "bg-secondary/20 text-secondary",
                                variant === "success" && "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
                                variant === "warning" && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                                variant === "danger" && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                                variant === "admin" && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                            )}
                        >
                            {icon}
                        </div>
                    )}
                </div>
                {trend && (
                    <div className="mt-4 flex items-center gap-2">
                        <span
                            className={cn(
                                trendVariants({
                                    variant,
                                    direction: trend.isPositive ? "up" : "down",
                                })
                            )}
                        >
                            {trend.isPositive ? "+" : ""}
                            {trend.value}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {trend.isPositive ? "vs last period" : "vs last period"}
                        </span>
                    </div>
                )}
            </motion.div>
        );
    }
);
StatCard.displayName = "StatCard";

export { StatCard, statCardVariants, labelVariants, valueVariants, trendVariants };
