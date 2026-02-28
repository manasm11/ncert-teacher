"use client";

import { ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean;
}

const Button = ({
    className = "",
    variant = "default",
    size = "default",
    asChild = false,
    ...props
}: ButtonProps) => {
    const Comp = asChild ? Slot : "button";

    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
        default: "bg-primary text-primary-foreground shadow-playful hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-playful hover:bg-destructive/90",
        outline: "border border-border bg-white hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-playful hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
    };

    const sizes = {
        default: "px-4 py-2",
        sm: "px-3 py-1.5 text-xs",
        lg: "px-6 py-3 text-base",
        icon: "w-10 h-10 p-0",
    };

    return <Comp className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
};

Button.displayName = "Button";

export { Button };
