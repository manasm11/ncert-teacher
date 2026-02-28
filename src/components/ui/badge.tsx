"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Variants for the Badge component following the forest/nature theme.
 */
const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: "text-foreground hover:bg-primary/10",
                success: "border-transparent bg-green-500/10 text-green-700 dark:text-green-400",
                warning: "border-transparent bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
                info: "border-transparent bg-blue-500/10 text-blue-700 dark:text-blue-400",
            },
            size: {
                sm: "text-[10px] px-2 py-0.5",
                default: "text-xs px-2.5 py-0.5",
                lg: "text-sm px-3 py-1",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
    asChild?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant, size, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={badgeVariants({ variant, size, className })}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
