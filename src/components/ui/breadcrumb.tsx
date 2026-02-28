"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BreadcrumbRoot component for the breadcrumb container.
 */
export interface BreadcrumbRootProps extends React.HTMLAttributes<HTMLNavElement> {}

const BreadcrumbRoot = React.forwardRef<HTMLNavElement, BreadcrumbRootProps>(
    ({ className, ...props }, ref) => {
        return (
            <nav
                ref={ref}
                aria-label="breadcrumb"
                className={cn("flex items-center gap-2 text-sm", className)}
                {...props}
            />
        );
    }
);
BreadcrumbRoot.displayName = "BreadcrumbRoot";

/**
 * BreadcrumbList component for the breadcrumb list.
 */
export interface BreadcrumbListProps extends React.HTMLAttributes<HTMLUListElement> {}

const BreadcrumbList = React.forwardRef<HTMLUListElement, BreadcrumbListProps>(
    ({ className, ...props }, ref) => {
        return (
            <ol
                ref={ref}
                className={cn("flex items-center gap-2 break-words text-muted-foreground sm:gap-3", className)}
                {...props}
            />
        );
    }
);
BreadcrumbList.displayName = "BreadcrumbList";

/**
 * BreadcrumbItem component for individual breadcrumb items.
 */
export interface BreadcrumbItemProps extends React.HTMLAttributes<HTMLLIElement> {}

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
    ({ className, ...props }, ref) => {
        return (
            <li
                ref={ref}
                className={cn("inline-flex items-center gap-2", className)}
                {...props}
            />
        );
    }
);
BreadcrumbItem.displayName = "BreadcrumbItem";

/**
 * BreadcrumbLink component for clickable breadcrumb links.
 */
export interface BreadcrumbLinkProps extends React.ComponentProps<typeof Link> {}

const BreadcrumbLink = React.forwardRef<
    HTMLAnchorElement,
    BreadcrumbLinkProps
>(({ className, ...props }, ref) => {
    return (
        <Link
            ref={ref}
            className={cn("transition-colors hover:text-foreground", className)}
            {...props}
        />
    );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

/**
 * BreadcrumbPage component for the current page (non-link).
 */
export interface BreadcrumbPageProps extends React.HTMLAttributes<HTMLSpanElement> {}

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
    ({ className, ...props }, ref) => {
        return (
            <span
                ref={ref}
                role="link"
                aria-current="page"
                className={cn("font-medium text-foreground", className)}
                {...props}
            />
        );
    }
);
BreadcrumbPage.displayName = "BreadcrumbPage";

/**
 * BreadcrumbSeparator component for visual separators between items.
 */
export interface BreadcrumbSeparatorProps extends React.HTMLAttributes<HTMLSpanElement> {}

const BreadcrumbSeparator = React.forwardRef<
    HTMLSpanElement,
    BreadcrumbSeparatorProps
>(({ className, children, ...props }, ref) => {
    return (
        <span
            ref={ref}
            role="presentation"
            aria-hidden="true"
            className={cn("[&>svg]:size-3.5", className)}
            {...props}
        >
            {children ?? <ChevronRight />}
        </span>
    );
});
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

/**
 * BreadcrumbEllipsis component for collapsed items in long breadcrumb trails.
 */
export interface BreadcrumbEllipsisProps extends React.HTMLAttributes<HTMLSpanElement> {}

const BreadcrumbEllipsis = React.forwardRef<
    HTMLSpanElement,
    BreadcrumbEllipsisProps
>(({ className, ...props }, ref) => {
    return (
        <span
            ref={ref}
            role="presentation"
            aria-hidden="true"
            className={cn("flex h-9 w-9 items-center justify-center", className)}
            {...props}
        >
            <span className="font-medium text-foreground">...</span>
        </span>
    );
});
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export {
    BreadcrumbRoot,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
    BreadcrumbEllipsis,
};
