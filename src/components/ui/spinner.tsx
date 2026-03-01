"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

/**
 * Variants for the Spinner component following the forest/nature theme.
 */
const spinnerVariants = cva("animate-spin", {
    variants: {
        size: {
            sm: "h-4 w-4 text-primary",
            default: "h-6 w-6 text-primary",
            lg: "h-8 w-8 text-primary",
            xl: "h-12 w-12 text-primary",
        },
        color: {
            primary: "text-primary",
            secondary: "text-secondary",
            foreground: "text-foreground",
            muted: "text-muted-foreground",
            accent: "text-accent",
            destructive: "text-destructive",
        },
    },
    defaultVariants: {
        size: "default",
        color: "primary",
    },
});

export interface SpinnerProps {
    /**
     * Size of the spinner
     */
    size?: "sm" | "default" | "lg" | "xl";
    /**
     * Color variant for the spinner
     */
    color?: "primary" | "secondary" | "foreground" | "muted" | "accent" | "destructive";
    /**
     * Custom color for the spinner (overrides color variant)
     */
    customColor?: string;
    /**
     * Optional className for the spinner
     */
    className?: string;
    /**
     * Optional inline style
     */
    style?: React.CSSProperties;
}

const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
    ({ size, color, className, customColor, style, ...props }, ref) => {
        const sizeClasses = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : size === "xl" ? "h-12 w-12" : "h-6 w-6";
        const colorMap: Record<string, string> = {
            muted: "text-muted-foreground",
            primary: "text-primary",
            secondary: "text-secondary",
            foreground: "text-foreground",
            accent: "text-accent",
            destructive: "text-destructive",
        };
        const colorClass = color ? colorMap[color] || `text-${color}` : "text-primary";

        return (
            <span
                ref={ref}
                className={spinnerVariants({ size, color, className })}
                style={{
                    ...style,
                    ...(customColor && { color: customColor }),
                }}
                {...props}
            >
                <Loader2 className={`${sizeClasses} ${colorClass}`} />
            </span>
        );
    }
);
Spinner.displayName = "Spinner";

export { Spinner, spinnerVariants };
