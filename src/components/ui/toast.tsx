"use client";

import React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

/**
 * Variants for the Toast component following the forest/nature theme.
 */
const toastVariants = cva(
    "group pointer-events-auto relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border p-4 pr-6 shadow-playful transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=open]:animate-in data-[state=closed]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-in data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
    {
        variants: {
            variant: {
                default: "border-border bg-card text-card-foreground",
                destructive: "border-destructive/50 bg-destructive text-destructive-foreground shadow-deep",
                success: "border-success/50 bg-green-500/10 text-green-700 dark:text-green-400",
                error: "border-error/50 bg-destructive text-destructive-foreground",
                info: "border-info/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
                warning: "border-warning/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

const toastViewportVariants = cva(
    "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
    {
        variants: {
            position: {
                top: "fixed top-0 left-1/2 -translate-x-1/2",
                bottom: "fixed bottom-0 left-1/2 -translate-x-1/2",
                topRight: "fixed top-4 right-4",
                bottomRight: "fixed bottom-4 right-4",
                topLeft: "fixed top-4 left-4",
                bottomLeft: "fixed bottom-4 left-4",
            },
        },
        defaultVariants: {
            position: "topRight",
        },
    }
);

/**
 * Toast component with Radix UI Toast primitives.
 */
const Toast = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
    return (
        <ToastPrimitives.Root
            ref={ref}
            className={toastVariants({ variant, className })}
            duration={4000}
            {...props}
        />
    );
});
Toast.displayName = ToastPrimitives.Root.displayName;

type ToastPosition = "top" | "bottom" | "topRight" | "bottomRight" | "topLeft" | "bottomLeft";

const ToastViewport = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Viewport>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport> & { position?: ToastPosition }
>(({ className, position, ...props }, ref) => {
    return (
        <ToastPrimitives.Viewport
            ref={ref}
            className={toastViewportVariants({ position, className })}
            {...props}
        />
    );
});
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

export interface ToastActionProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action> {}

const ToastAction = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Action>,
    ToastActionProps
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Action
        ref={ref}
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-destructive/30 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus-visible:ring-destructive"
        {...props}
    />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

export interface ToastCloseProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close> {}

const ToastClose = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Close>,
    ToastCloseProps
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Close
        ref={ref}
        className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus-visible:ring-destructive"
        {...props}
    >
        <X className="h-4 w-4" />
    </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

export interface ToastTitleProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title> {}

const ToastTitle = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Title>,
    ToastTitleProps
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Title
        ref={ref}
        className="text-sm font-semibold [&+div]:text-xs"
        {...props}
    />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

export interface ToastDescriptionProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description> {}

const ToastDescription = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Description>,
    ToastDescriptionProps
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Description
        ref={ref}
        className="text-sm opacity-90"
        {...props}
    />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

/**
 * Icon components for different toast variants.
 */
const ToastIcon = ({ variant, className }: { variant?: string; className?: string }) => {
    switch (variant) {
        case "success":
            return <CheckCircle className={`h-5 w-5 ${className || ""}`} />;
        case "error":
            return <AlertCircle className={`h-5 w-5 ${className || ""}`} />;
        case "info":
            return <Info className={`h-5 w-5 ${className || ""}`} />;
        case "warning":
            return <AlertTriangle className={`h-5 w-5 ${className || ""}`} />;
        default:
            return null;
    }
};

export {
    Toast,
    ToastViewport,
    ToastAction,
    ToastClose,
    ToastTitle,
    ToastDescription,
    ToastIcon,
};
