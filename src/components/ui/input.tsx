"use client";

import React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Variants for the Input component following the forest/nature theme.
 */
const inputVariants = cva(
    "flex w-full rounded-xl border bg-transparent px-4 py-2 text-sm shadow-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "border-input h-12",
                search: "border-input h-12 pl-4 pr-10",
                sm: "border-input h-10 text-xs px-3",
                lg: "border-input h-14 text-base px-6",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    variant?: "default" | "search" | "sm" | "lg";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, variant, type = "text", ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(inputVariants({ variant, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

/**
 * InputWithLabel component with label, error state, and helper text.
 */
export interface InputWithLabelProps extends InputProps {
    label?: string;
    error?: string;
    helperText?: string;
    required?: boolean;
}

const InputWithLabel = React.forwardRef<HTMLInputElement, InputWithLabelProps>(
    ({ className, variant, label, error, helperText, required, id, type = "text", ...props }, ref) => {
        const inputId = id || `input-${Math.random().toString(36).substring(7)}`;
        const hasError = !!error;

        return (
            <div className="flex flex-col gap-2">
                {label && (
                    <label htmlFor={inputId} className="text-sm font-medium text-foreground">
                        {label} {required && <span className="text-destructive">*</span>}
                    </label>
                )}
                <input
                    id={inputId}
                    type={type}
                    className={cn(inputVariants({ variant, className }), hasError ? "text-destructive focus-visible:ring-destructive" : "")}
                    ref={ref}
                    aria-invalid={hasError}
                    aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
                    {...props}
                />
                {error ? (
                    <p id={`${inputId}-error`} className="text-xs text-destructive mt-1">
                        {error}
                    </p>
                ) : helperText ? (
                    <p id={`${inputId}-helper`} className="text-xs text-muted-foreground mt-1">
                        {helperText}
                    </p>
                ) : null}
            </div>
        );
    }
);
InputWithLabel.displayName = "InputWithLabel";

export { Input, InputWithLabel, inputVariants };
