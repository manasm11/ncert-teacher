"use client";

import React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Variants for the Dropdown Menu component following the forest/nature theme.
 */
const dropdownMenuTriggerVariants = cva(
    "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    {
        variants: {
            variant: {
                default: "bg-transparent text-foreground",
                outline: "border border-border bg-transparent hover:bg-primary/10 hover:text-primary",
                ghost: "hover:bg-primary/10 hover:text-primary",
            },
            size: {
                default: "h-10 px-3 py-2",
                sm: "h-9 text-xs px-2",
                lg: "h-11 text-base px-4",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

const dropdownMenuContentVariants = cva(
    "z-50 min-w-48 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-playful animate-in fade-in zoom-in-95 data-[side=bottom]:translate-y-2 data-[side=left]:-translate-x-2 data-[side=right]:translate-x-2 data-[side=top]:-translate-y-2",
    {
        variants: {
            animated: {
                true: "animate-in fade-in zoom-in-95 duration-200",
                false: "",
            },
        },
        defaultVariants: {
            animated: true,
        },
    }
);

const dropdownMenuItemVariants = cva(
    "relative flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    {
        variants: {
            variant: {
                default: "text-foreground",
                destructive: "text-destructive hover:bg-destructive/10 hover:text-destructive",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

const dropdownMenuCheckboxItemVariants = cva(
    "relative flex cursor-default select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    {
        variants: {
            variant: {
                default: "text-foreground",
                destructive: "text-destructive hover:bg-destructive/10 hover:text-destructive",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

const dropdownMenuRadioItemVariants = cva(
    "relative flex cursor-default select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    {
        variants: {
            variant: {
                default: "text-foreground",
                destructive: "text-destructive hover:bg-destructive/10 hover:text-destructive",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

const dropdownMenuLabelVariants = cva("px-2 py-1.5 text-xs font-semibold text-foreground", {
    variants: {
        inset: {
            true: "pl-8",
        },
    },
});

const dropdownMenuSeparatorVariants = cva("-mx-1 my-1 h-px bg-border");

const dropdownMenuShortcutVariants = cva("ml-auto text-xs tracking-widest opacity-60");

/**
 * DropdownMenu component with Radix UI Dropdown Menu primitives.
 */
const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger> & VariantProps<typeof dropdownMenuTriggerVariants>
>(({ className, variant, size, children, ...props }, ref) => {
    return (
        <DropdownMenuPrimitive.Trigger
            ref={ref}
            className={dropdownMenuTriggerVariants({ variant, size, className })}
            {...props}
        >
            {children}
        </DropdownMenuPrimitive.Trigger>
    );
});
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export interface DropdownMenuSubTriggerProps
    extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> {
    inset?: boolean;
}

const DropdownMenuSubTrigger = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
    DropdownMenuSubTriggerProps
>(({ className, inset, children, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
        ref={ref}
        className={dropdownMenuItemVariants({
            className: "group flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-primary/10 focus:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary",
        })}
        {...props}
    >
        {children}
        <ChevronRight className="ml-auto h-4 w-4" />
    </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

export type DropdownMenuSubContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>;

const DropdownMenuSubContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
    DropdownMenuSubContentProps
>(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.SubContent
        ref={ref}
        className={dropdownMenuContentVariants({ className })}
        {...props}
    />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

export type DropdownMenuContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>;

const DropdownMenuContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Content>,
    DropdownMenuContentProps
>(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
            ref={ref}
            className={dropdownMenuContentVariants({ className })}
            {...props}
        />
    </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

export interface DropdownMenuItemProps
    extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
    inset?: boolean;
    variant?: "default" | "destructive";
}

const DropdownMenuItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Item>,
    DropdownMenuItemProps
>(({ className, inset, variant, ...props }, ref) => (
    <DropdownMenuPrimitive.Item
        ref={ref}
        className={dropdownMenuItemVariants({ variant, className: inset ? "pl-8" : "" }) + " " + (className || "")}
        {...props}
    />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

export interface DropdownMenuCheckboxItemProps
    extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> {
    checked?: boolean;
}

const DropdownMenuCheckboxItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
    DropdownMenuCheckboxItemProps
>(({ className, children, checked, ...props }, ref) => (
    <DropdownMenuPrimitive.CheckboxItem
        ref={ref}
        className={dropdownMenuCheckboxItemVariants({ className })}
        checked={checked}
        {...props}
    >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
                <Check className="h-4 w-4" />
            </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
    </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioItem
        ref={ref}
        className={dropdownMenuRadioItemVariants({ className })}
        {...props}
    >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
                <Circle className="h-2 w-2 fill-current" />
            </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
    </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

export interface DropdownMenuLabelProps
    extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> {
    inset?: boolean;
}

const DropdownMenuLabel = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Label>,
    DropdownMenuLabelProps
>(({ className, inset, ...props }, ref) => (
    <DropdownMenuPrimitive.Label
        ref={ref}
        className={dropdownMenuLabelVariants({ inset, className })}
        {...props}
    />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

export type DropdownMenuSeparatorProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>;

const DropdownMenuSeparator = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
    DropdownMenuSeparatorProps
>(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Separator
        ref={ref}
        className={dropdownMenuSeparatorVariants({ className })}
        {...props}
    />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export type DropdownMenuShortcutProps = React.HTMLAttributes<HTMLSpanElement>;

const DropdownMenuShortcut = React.forwardRef<HTMLSpanElement, DropdownMenuShortcutProps>(
    ({ className, ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={dropdownMenuShortcutVariants({ className })}
                {...props}
            />
        );
    }
);
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
};
