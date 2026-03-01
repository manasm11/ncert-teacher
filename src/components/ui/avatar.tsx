"use client";

import React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Variants for the Avatar component following the forest/nature theme.
 */
const avatarVariants = cva(
    "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary text-primary-foreground",
    {
        variants: {
            size: {
                sm: "h-8 w-8",
                default: "h-10 w-10",
                lg: "h-12 w-12",
                xl: "h-16 w-16",
                "2xl": "h-24 w-24",
            },
            rounded: {
                default: "rounded-full",
                sm: "rounded-sm",
                md: "rounded-md",
                lg: "rounded-lg",
            },
        },
        defaultVariants: {
            size: "default",
            rounded: "default",
        },
    }
);

const avatarFallbackVariants = cva("flex h-full w-full items-center justify-center font-medium");

export interface AvatarProps
    extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
        VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Root>,
    AvatarProps
>(({ className, size, rounded, ...props }, ref) => {
    return (
        <AvatarPrimitive.Root
            ref={ref}
            className={avatarVariants({ size, rounded, className })}
            {...props}
        />
    );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

export type AvatarImageProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>;

const AvatarImage = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Image>,
    AvatarImageProps
>(({ ...props }, ref) => {
    return (
        <AvatarPrimitive.Image
            ref={ref}
            className="aspect-square h-full w-full object-cover"
            {...props}
        />
    );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export interface AvatarFallbackProps
    extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>,
        VariantProps<typeof avatarFallbackVariants> {
    text?: string;
}

const AvatarFallback = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Fallback>,
    AvatarFallbackProps
>(({ className, text, ...props }, ref) => {
    return (
        <AvatarPrimitive.Fallback
            ref={ref}
            className={avatarFallbackVariants({ className })}
            {...props}
        >
            {text}
        </AvatarPrimitive.Fallback>
    );
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

/**
 * Helper function to generate initials from name.
 */
function getInitials(name: string, maxInitials: number = 2): string {
    if (!name) return "";

    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "";

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    let initials = "";
    for (let i = 0; i < Math.min(parts.length, maxInitials); i++) {
        initials += parts[i].charAt(0).toUpperCase();
    }

    return initials;
}

/**
 * AvatarWithFallback component that automatically generates initials as fallback.
 */
export interface AvatarWithFallbackProps extends Omit<AvatarProps, "children"> {
    src?: string;
    alt?: string;
    name?: string;
    fallback?: string;
}

const AvatarWithFallback = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Root>,
    AvatarWithFallbackProps
>(({ src, alt, name, fallback, size, rounded, className, ...props }, ref) => {
    return (
        <Avatar ref={ref} size={size} rounded={rounded} className={className} {...props}>
            {src && <AvatarImage src={src} alt={alt || name || "User avatar"} />}
            <AvatarFallback text={fallback || (name ? getInitials(name) : "")} />
        </Avatar>
    );
});
AvatarWithFallback.displayName = "AvatarWithFallback";

export {
    Avatar,
    AvatarImage,
    AvatarFallback,
    getInitials,
    AvatarWithFallback,
};
