"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground shadow-playful hover:bg-primary/90",
                secondary: "bg-secondary text-secondary-foreground shadow-playful hover:bg-secondary/90",
                ghost: "hover:bg-primary/10 hover:text-primary",
                destructive: "bg-destructive text-destructive-foreground shadow-playful hover:bg-destructive/90",
                outline: "border border-border bg-background hover:bg-primary/10 hover:text-primary",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "px-4 py-2.5 text-sm",
                sm: "px-3 py-1.5 text-xs",
                lg: "px-6 py-3 text-base",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, isLoading, children, disabled, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";

        // When asChild is true, only render children without Loader2
        // because Slot requires exactly one child
        const content = asChild ? children : (
            <>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {children}
            </>
        );

        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={disabled || isLoading}
                {...props}
            >
                {content}
            </Comp>
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
