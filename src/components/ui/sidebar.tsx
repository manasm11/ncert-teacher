"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Variants for the Sidebar component following the forest/nature theme.
 */
const sidebarVariants = cva(
    "flex h-full flex-col border-r bg-background transition-all duration-300",
    {
        variants: {
            variant: {
                default: "bg-card/50 backdrop-blur-sm",
                dark: "bg-card border-border",
            },
            width: {
                expanded: "w-64",
                collapsed: "w-20",
            },
        },
        defaultVariants: {
            variant: "default",
            width: "expanded",
        },
    }
);

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof sidebarVariants> {
    isOpen?: boolean;
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
    ({ className, variant, width, isOpen, children, ...props }, ref) => {
        const effectiveWidth = isOpen !== undefined ? (isOpen ? "expanded" : "collapsed") : width;

        return (
            <div
                ref={ref}
                className={sidebarVariants({ variant, width: effectiveWidth, className })}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Sidebar.displayName = "Sidebar";

/**
 * SidebarHeader component for the top section of the sidebar.
 */
export interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`px-6 py-6 ${className || ""}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);
SidebarHeader.displayName = "SidebarHeader";

/**
 * SidebarFooter component for the bottom section of the sidebar.
 */
export interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarFooterProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`px-4 py-4 mt-auto ${className || ""}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);
SidebarFooter.displayName = "SidebarFooter";

/**
 * SidebarContent component for the scrollable content area.
 */
export interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`flex-1 overflow-y-auto py-4 px-3 ${className || ""}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);
SidebarContent.displayName = "SidebarContent";

/**
 * SidebarGroup component for organizing menu items.
 */
export interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    label?: string;
}

const SidebarGroup = React.forwardRef<HTMLDivElement, SidebarGroupProps>(
    ({ className, label, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`space-y-1 ${className || ""}`}
                {...props}
            >
                {label && (
                    <div className="px-6 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {label}
                    </div>
                )}
                {children}
            </div>
        );
    }
);
SidebarGroup.displayName = "SidebarGroup";

/**
 * SidebarGroupLabel component for group labels.
 */
export interface SidebarGroupLabelProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, SidebarGroupLabelProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`px-6 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider ${className || ""}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);
SidebarGroupLabel.displayName = "SidebarGroupLabel";

/**
 * SidebarItem component for individual menu items.
 */
export interface SidebarItemProps extends React.HTMLAttributes<HTMLDivElement> {
    active?: boolean;
    icon?: React.ReactNode;
    label: string;
    badge?: React.ReactNode;
}

const SidebarItem = React.forwardRef<HTMLDivElement, SidebarItemProps>(
    ({ className, active, icon, label, badge, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                    active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-primary/10 hover:text-primary text-foreground"
                } ${className || ""}`}
                {...props}
            >
                {icon && (
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-primary-foreground/20" : "bg-primary/20"}`}>
                        {icon}
                    </div>
                )}
                <div className="flex-1 truncate">
                    <span className="font-medium">{label}</span>
                </div>
                {badge && (
                    <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${active ? "bg-primary-foreground/30 text-primary-foreground" : "bg-primary/20 text-primary"}`}>
                        {badge}
                    </span>
                )}
            </div>
        );
    }
);
SidebarItem.displayName = "SidebarItem";

/**
 * SidebarSeparator component for visual separation.
 */
export interface SidebarSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarSeparator = React.forwardRef<HTMLDivElement, SidebarSeparatorProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`h-px bg-border mx-4 ${className || ""}`}
                {...props}
            />
        );
    }
);
SidebarSeparator.displayName = "SidebarSeparator";

export {
    Sidebar,
    SidebarHeader,
    SidebarFooter,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarItem,
    SidebarSeparator,
};
