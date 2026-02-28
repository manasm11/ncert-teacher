"use client";

import React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Variants for the Label component following the forest/nature theme.
 */
const labelVariants = cva(
    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
    {
        variants: {
            variant: {
                default: "text-foreground",
                secondary: "text-secondary-foreground",
                destructive: "text-destructive",
            },
            size: {
                sm: "text-xs",
                default: "text-sm",
                lg: "text-base",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface LabelProps
    extends React.LabelHTMLAttributes<HTMLLabelElement>,
        VariantProps<typeof labelVariants> {}

const Label = React.forwardRef<
    React.ElementRef<typeof LabelPrimitive.Root>,
    LabelProps
>(({ className, variant, size, ...props }, ref) => (
    <LabelPrimitive.Root
        ref={ref}
        className={labelVariants({ variant, size, className })}
        {...props}
    />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
