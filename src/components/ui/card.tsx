"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Variants for the Card component following the forest/nature theme.
 */
const cardVariants = cva(
    "rounded-2xl border transition-colors duration-200",
    {
        variants: {
            variant: {
                default: "bg-card text-card-foreground shadow-playful",
                elevated: "bg-card text-card-foreground shadow-playful",
                bordered: "bg-card text-card-foreground border-2",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

/**
 * Variants for Card content padding.
 */
const cardContentVariants = cva("p-6", {
    variants: {
        padding: {
            none: "",
            sm: "p-4",
            default: "p-6",
            lg: "p-8",
        },
    },
    defaultVariants: {
        padding: "default",
    },
});

const cardHeaderVariants = cva("px-6 pt-6 pb-4", {
    variants: {
        spacing: {
            none: "",
            default: "border-b border-border/60",
        },
    },
    defaultVariants: {
        spacing: "default",
    },
});

const cardFooterVariants = cva("px-6 pt-4 pb-6", {
    variants: {
        spacing: {
            none: "",
            default: "border-t border-border/60",
        },
    },
    defaultVariants: {
        spacing: "default",
    },
});

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(cardVariants({ variant, className }))}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Card.displayName = "Card";

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    spacing?: "none" | "default";
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ className, spacing, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(cardHeaderVariants({ spacing, className }))}
                {...props}
            >
                {children}
            </div>
        );
    }
);
CardHeader.displayName = "CardHeader";

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <h3
                ref={ref}
                className={cn("font-outfit text-xl font-bold text-foreground", className)}
                {...props}
            >
                {children}
            </h3>
        );
    }
);
CardTitle.displayName = "CardTitle";

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <p
                ref={ref}
                className={cn("text-sm text-muted-foreground mt-1", className)}
                {...props}
            >
                {children}
            </p>
        );
    }
);
CardDescription.displayName = "CardDescription";

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
    padding?: "none" | "sm" | "default" | "lg";
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
    ({ className, padding, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(cardContentVariants({ padding, className }))}
                {...props}
            >
                {children}
            </div>
        );
    }
);
CardContent.displayName = "CardContent";

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
    spacing?: "none" | "default";
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
    ({ className, spacing, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(cardFooterVariants({ spacing, className }))}
                {...props}
            >
                {children}
            </div>
        );
    }
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
