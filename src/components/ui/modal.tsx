"use client";

import React from "react";
import * as Portal from "@radix-ui/react-portal";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Variants for the Modal component following the forest/nature theme.
 */
const modalContentVariants = cva(
    "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 shadow-playful border bg-card text-card-foreground rounded-2xl p-6 animate-in fade-in zoom-in-95 duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    {
        variants: {
            size: {
                sm: "max-w-md",
                default: "max-w-lg",
                lg: "max-w-2xl",
                xl: "max-w-4xl",
            },
            animated: {
                true: "animate-in fade-in zoom-in-95 duration-200",
                false: "",
            },
        },
        defaultVariants: {
            size: "default",
            animated: true,
        },
    }
);

const modalOverlayVariants = cva(
    "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200",
    {
        variants: {
            animated: {
                true: "animate-in fade-in duration-200",
                false: "",
            },
        },
        defaultVariants: {
            animated: true,
        },
    }
);

/**
 * Modal component with DialogPrimitive primitives.
 */
const Modal = DialogPrimitive.Root;

const ModalTrigger = DialogPrimitive.Trigger;

const ModalClose = DialogPrimitive.Close;

const ModalPortal = Portal.Root;

export interface ModalContentProps
    extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
        VariantProps<typeof modalContentVariants> {
    overlayClassName?: string;
}

const ModalContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    ModalContentProps
>(({ className, size, animated, overlayClassName, children, ...props }, ref) => {
    return (
        <ModalPortal>
            <DialogPrimitive.Overlay
                className={modalOverlayVariants({ animated, className: overlayClassName })}
            >
                <DialogPrimitive.Content
                    ref={ref}
                    className={modalContentVariants({ size, animated, className })}
                    {...props}
                >
                    {children}
                    <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none">
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPrimitive.Overlay>
        </ModalPortal>
    );
});
ModalContent.displayName = DialogPrimitive.Content.displayName;

export type ModalHeaderProps = React.HTMLAttributes<HTMLDivElement>;

const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`flex flex-col space-y-2 text-center sm:text-left ${className || ""}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);
ModalHeader.displayName = "ModalHeader";

export type ModalTitleProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;

const ModalTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    ModalTitleProps
>(({ className, children, ...props }, ref) => {
    return (
        <DialogPrimitive.Title
            ref={ref}
            className={`font-outfit text-lg font-semibold leading-none tracking-tight ${className || ""}`}
            {...props}
        >
            {children}
        </DialogPrimitive.Title>
    );
});
ModalTitle.displayName = DialogPrimitive.Title.displayName;

export type ModalDescriptionProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>;

const ModalDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    ModalDescriptionProps
>(({ className, children, ...props }, ref) => {
    return (
        <DialogPrimitive.Description
            ref={ref}
            className={`text-sm text-muted-foreground ${className || ""}`}
            {...props}
        >
            {children}
        </DialogPrimitive.Description>
    );
});
ModalDescription.displayName = DialogPrimitive.Description.displayName;

export type ModalFooterProps = React.HTMLAttributes<HTMLDivElement>;

const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`flex flex-col-reverse sm:flex-row sm:justify-end gap-2 ${className || ""}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);
ModalFooter.displayName = "ModalFooter";

export type ModalBodyProps = React.HTMLAttributes<HTMLDivElement>;

const ModalBody = React.forwardRef<HTMLDivElement, ModalBodyProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`mt-4 ${className || ""}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);
ModalBody.displayName = "ModalBody";

export {
    Modal,
    ModalTrigger,
    ModalClose,
    ModalContent,
    ModalHeader,
    ModalTitle,
    ModalDescription,
    ModalBody,
    ModalFooter,
};
